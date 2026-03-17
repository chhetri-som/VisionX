# backend/app/services/audio/audio_classifier.py

import onnxruntime as ort
import numpy as np
from pathlib import Path
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AudioClassifier:
    def __init__(self, model_path: str):
        self.model_path = model_path
        try:
            # load model, using CPU as default, add CUDAExecutionProvider if GPU available
            self.session = ort.InferenceSession(
                model_path,
                providers=['CPUExecutionProvider']
            )

            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            self.input_shape = self.session.get_inputs()[0].shape
            self.output_shape = self.session.get_outputs()[0].shape

            logger.info(f"AudioClassifier loaded from {model_path}")
            logger.info(f"  Input: {self.input_name}, Shape: {self.input_shape}")
            logger.info(f"  Output: {self.output_name}, Shape: {self.output_shape}")
        except Exception as e:
            logger.error(f"Failed to load AudioClassifier from {model_path}: {e}")
            raise RuntimeError(f"AudioClassifier initialization failed: {e}")

    def classify(self, audio_features: np.ndarray) -> float:
        try:
            preprocessed = self._preprocess(audio_features)

            outputs = self.session.run([self.output_name], {self.input_name: preprocessed})
            logits = outputs[0][0] # [num_classes]

            fake_prob = self._logits_to_prob(logits)

            return float(fake_prob)

        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise RuntimeError(f"Classification failed: {e}")

    def _preprocess(self, audio_features: np.ndarray) -> np.ndarray:
        features = audio_features.astype(np.float32)

        # if statements to handle different input dimensions as model is not created yet
        if features.ndim == 1:
            features = np.expand_dims(features, axis=0)

        elif features.ndim == 2:
            # could be [time_steps, n_features] or [n_features, time_steps]
            # infer which based on typical sizes (MFCC=13, Mel=128)
            if features.shape[0] in [13, 40, 64, 128]:
                # already [n_features, time_steps]
                pass
            elif features.shape[1] in [13, 40, 64, 128]:
                # [time_steps, n_features] - transpose to [n_features, time_steps]
                features = features.T

        # normalize features to [0,1]
        features_min = np.min(features)
        features_max = np.max(features)
        if features_max > features_min:
            features = (features - features_min) / (features_max - features_min)

        if features.ndim == 2:
            batch = np.expand_dims(features, axis=0)
        else:
            batch = features

        return batch.astype(np.float32)

    def _logits_to_prob(self, logits: np.ndarray) -> float:
        """
        Convert model output logits to fake probability.
        
        Handles both:
        - Raw logits: applies softmax
        - Pre-computed probabilities: uses directly
        
        Assumes binary classification: [real_prob, fake_prob] or single output
        Returns probability of class 1 (fake)
        """
        # check if already in probs
        if logits.max() <= 1.0 and logits.min() >= 0.0 and abs(logits.sum() - 1.0) < 0.01:
            probs = logits
        else:
            logits_shifted = logits - logits.max()
            exp_logits = np.exp(logits_shifted)
            probs = exp_logits / exp_logits.sum()

        # return probs of fake class
        if len(probs) >= 2:
            fake_prob = probs[1]
        else:
            # single output = treat as fake probs
            fake_prob = probs[0] if len(probs) > 0 else 0.5
        
        return float(fake_prob)
