# backend/app/core/deepfake_classifier.py
"""
Deepfake Classification using ONNX Runtime
- Loads EfficientNet-B0 ONNX model
- Runs inference on cropped face images
- Returns confidence score (0-1)
"""

import onnxruntime as ort
import numpy as np
import cv2
from pathlib import Path
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class DeepfakeClassifier:
    """
    Classification of faces as real or fake using EfficientNet-B0 ONNX model.
    
    Input: [H, W, 3] BGR image
    Output: float in [0, 1] where 1 = definitely fake
    """
    
    def __init__(self, model_path: str):
        """
        Initialize classifier with ONNX model.
        
        Args:
            model_path: Path to .onnx model file
        
        Raises:
            RuntimeError: If model fails to load
        """
        self.model_path = model_path
        
        try:
            # Load ONNX model
            # Use CPU by default; add CUDAExecutionProvider if GPU available
            self.session = ort.InferenceSession(
                model_path,
                providers=['CPUExecutionProvider']
                # For GPU: providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            
            # Get input/output info
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            self.input_shape = self.session.get_inputs()[0].shape
            self.output_shape = self.session.get_outputs()[0].shape
            
            logger.info(f"✅ DeepfakeClassifier loaded from {model_path}")
            logger.info(f"   Input: {self.input_name}, shape: {self.input_shape}")
            logger.info(f"   Output: {self.output_name}, shape: {self.output_shape}")
        
        except Exception as e:
            logger.error(f"❌ Failed to load classifier: {e}")
            raise RuntimeError(f"Classifier initialization failed: {e}")
    
    def classify(self, face_image: np.ndarray) -> float:
        """
        Classify a face image as real or fake.
        
        Args:
            face_image: numpy array [H, W, 3] in BGR format
        
        Returns:
            confidence: float in [0, 1] where 1 = definitely fake
        
        Raises:
            RuntimeError: If inference fails
        """
        try:
            # Preprocess image
            preprocessed = self._preprocess(face_image)
            
            # Run inference
            outputs = self.session.run([self.output_name], {self.input_name: preprocessed})
            logits = outputs[0][0]  # [num_classes]
            
            # Convert logits to probability
            fake_prob = self._logits_to_prob(logits)
            
            return float(fake_prob)
        
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise RuntimeError(f"Classification failed: {e}")
    
    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for model inference.
        
        Steps:
        1. Convert BGR → RGB
        2. Resize to 224×224
        3. Normalize to [0, 1]
        4. Add batch dimension
        5. Convert to correct channel order based on model
        
        Args:
            image: [H, W, 3] BGR
        
        Returns:
            [1, 3, 224, 224] or [1, 224, 224, 3] depending on model
        """
        # Convert BGR → RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to 224×224
        image_resized = cv2.resize(image_rgb, (224, 224))
        
        # Normalize to [0, 1]
        image_normalized = image_resized.astype(np.float32) / 255.0
        
        # Check model's expected input format
        # Most models expect [batch, height, width, channels] or [batch, channels, height, width]
        if len(self.input_shape) == 4:
            if self.input_shape[1] == 3:
                # [batch, channels, height, width] - convert HWC → CHW
                batch = np.transpose(image_normalized, (2, 0, 1))  # CHW
                batch = np.expand_dims(batch, axis=0)              # BCHW
            else:
                # [batch, height, width, channels] - keep HWC
                batch = np.expand_dims(image_normalized, axis=0)   # BHWC
        else:
            # Fallback to BHWC
            batch = np.expand_dims(image_normalized, axis=0)
        
        return batch.astype(np.float32)
    
    def _logits_to_prob(self, logits: np.ndarray) -> float:
        """
        Convert model output logits to fake probability.
        
        Handles both:
        - Raw logits: applies softmax
        - Pre-computed probabilities: uses directly
        
        Assumes binary classification: [real, fake]
        Returns probability of class 1 (fake)
        
        Args:
            logits: model output, shape [num_classes] (usually [2])
        
        Returns:
            float in [0, 1]
        """
        # Check if already probabilities (all values in [0, 1])
        if logits.max() <= 1.0 and logits.min() >= 0.0 and abs(logits.sum() - 1.0) < 0.01:
            # Already probabilities
            probs = logits
        else:
            # Raw logits - apply softmax
            # Numerically stable softmax
            logits_shifted = logits - logits.max()
            exp_logits = np.exp(logits_shifted)
            probs = exp_logits / exp_logits.sum()
        
        # Return probability of "fake" class (index 1)
        if len(probs) >= 2:
            fake_prob = probs[1]
        else:
            # Fallback: single output treated as fake probability
            fake_prob = probs[0]
        
        return float(fake_prob)


class DummyClassifier:
    """
    Dummy classifier for testing without a real model.
    Returns deterministic fake scores based on image hash.
    """
    
    def __init__(self):
        logger.warning("⚠️  Using DUMMY classifier (for testing only)")
    
    def classify(self, face_image: np.ndarray) -> float:
        """
        Dummy classification - returns hash-based fake score.
        
        This lets you test the entire pipeline without needing a real model.
        Replace with DeepfakeClassifier once you have the real ONNX model.
        
        Args:
            face_image: dummy input (ignored)
        
        Returns:
            float in [0, 1]
        """
        # Compute hash of image to get deterministic output
        image_hash = hash(face_image.tobytes()) & 0x7fffffff
        fake_prob = (image_hash % 1000) / 1000.0
        return float(fake_prob)


if __name__ == "__main__":
    # Simple test
    from app.core.logging_config import setup_logging
    setup_logging("DEBUG")
    
    print("Testing DeepfakeClassifier...")
    
    try:
        # For testing without a real model
        dummy = DummyClassifier()
        test_image = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
        confidence = dummy.classify(test_image)
        print(f"✅ Dummy classifier test: confidence = {confidence:.3f}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
