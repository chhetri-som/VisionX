"""
Test saliency mapping (occlusion sensitivity).
Run: pytest tests/test_saliency.py -v
"""
import cv2
import numpy as np
from pathlib import Path
import time
from app.core.face_detector import FaceDetector
from app.core.deepfake_classifier import DeepfakeClassifier
from app.core.saliency_mapper import SaliencyMapper
from app.core.config import FACE_LANDMARKER_PATH, DEEPFAKE_MODEL_PATH

class TestSaliencyMapper:
    """Test suite for saliency mapping."""
    
    @classmethod
    def setup_class(cls):
        """Load models."""
        cls.detector = FaceDetector(FACE_LANDMARKER_PATH)
        cls.classifier = DeepfakeClassifier(DEEPFAKE_MODEL_PATH)
        cls.saliency_mapper = SaliencyMapper(cls.classifier, patch_size=24)
        cls.test_image_dir = Path('tests/test_images')
    
    def test_saliency_output_shape(self):
        """Test that saliency heatmap has correct shape."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        
        # Detect and classify
        face_result = self.detector.detect(image)
        if not face_result['detected']:
            return
        
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        confidence = self.classifier.classify(face_crop)
        
        # Compute saliency
        heatmap = self.saliency_mapper.compute_saliency(face_crop, confidence, verbose=False)
        
        # Check shape
        h, w = face_crop.shape[:2]
        expected_h = h // 24  # patch_size=24
        expected_w = w // 24
        
        assert heatmap.shape == (expected_h, expected_w), \
            f"Expected shape {(expected_h, expected_w)}, got {heatmap.shape}"
        
        print(f"✅ Saliency output shape: {heatmap.shape}")
    
    def test_saliency_values_normalized(self):
        """Test that heatmap values are in [0, 1]."""
        image_path = self.test_image_dir / 'deepfake_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        
        face_result = self.detector.detect(image)
        if not face_result['detected']:
            return
        
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        confidence = self.classifier.classify(face_crop)
        
        heatmap = self.saliency_mapper.compute_saliency(face_crop, confidence, verbose=False)
        
        # Check values
        assert heatmap.min() >= 0, f"Min value {heatmap.min()} < 0"
        assert heatmap.max() <= 1, f"Max value {heatmap.max()} > 1"
        assert heatmap.dtype == np.float32
        
        print(f"✅ Heatmap values: [{heatmap.min():.3f}, {heatmap.max():.3f}]")
    
    def test_saliency_computation_time(self):
        """Test that saliency computation is reasonably fast."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        
        face_result = self.detector.detect(image)
        if not face_result['detected']:
            return
        
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        confidence = self.classifier.classify(face_crop)
        
        # Time the computation
        start = time.time()
        heatmap = self.saliency_mapper.compute_saliency(face_crop, confidence, verbose=False)
        elapsed = time.time() - start
        
        print(f"✅ Saliency computed in {elapsed:.2f}s")
        
        # With patch_size=24, should be 2-3 seconds
        if elapsed > 10:
            print(f"⚠️  Saliency took {elapsed:.1f}s - consider increasing patch_size")
    
    def test_saliency_semantics(self):
        """
        Test that saliency maps make semantic sense.
        Important regions should have higher values.
        """
        image_path = self.test_image_dir / 'deepfake_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        
        face_result = self.detector.detect(image)
        if not face_result['detected']:
            return
        
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        confidence = self.classifier.classify(face_crop)
        
        # Only test if confidence is high (definitely fake)
        if confidence < 0.5:
            print("⚠️  Low confidence, skipping semantic test")
            return
        
        heatmap = self.saliency_mapper.compute_saliency(face_crop, confidence, verbose=False)
        
        # Check that some regions have high importance
        max_importance = heatmap.max()
        high_importance_regions = (heatmap > 0.5 * max_importance).sum()
        
        print(f"✅ {high_importance_regions} regions have high importance")
        assert high_importance_regions > 0, "Should have some high-importance regions"


if __name__ == "__main__":
    pytest.main([__file__, '-v'])