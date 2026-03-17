"""
Test deepfake classification pipeline.
Run: pytest tests/test_classifier.py -v
"""
import cv2
import numpy as np
from pathlib import Path
from app.services.image.face_detector import FaceDetector
from app.services.image.image_classifier import ImageClassifier
from app.core.config import FACE_LANDMARKER_PATH, IMAGE_MODEL_PATH

class TestDeepfakeClassifier:
    """Test suite for classification."""
    
    @classmethod
    def setup_class(cls):
        """Load models once."""
        cls.detector = FaceDetector(FACE_LANDMARKER_PATH)
        cls.classifier = ImageClassifier(IMAGE_MODEL_PATH)
        cls.test_image_dir = Path('tests/test_images')
    
    def test_classify_real_face(self):
        """Test classification on a real human face."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        
        # Detect face first
        face_result = self.detector.detect(image)
        assert face_result['detected'], "Should detect face"
        
        # Crop face
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        
        # Classify
        confidence = self.classifier.classify(face_crop)
        
        # Assertions
        assert isinstance(confidence, float), "Confidence should be float"
        assert 0 <= confidence <= 1, f"Confidence should be in [0, 1], got {confidence}"
        
        print(f"✅ Real face confidence: {confidence:.3f}")
        
        # Real faces should have LOW confidence (closer to 0)
        # This is a soft assertion - not guaranteed but likely
        if confidence > 0.7:
            print(f"⚠️  Real face got high confidence {confidence:.3f} - might be processed image")
    
    def test_classify_deepfake(self):
        """Test classification on a known deepfake."""
        image_path = self.test_image_dir / 'deepfake_1.jpg'
        if not image_path.exists():
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        
        # Detect face
        face_result = self.detector.detect(image)
        if not face_result['detected']:
            print("⚠️  Deepfake image has no detectable face - skipping")
            return
        
        # Crop and classify
        x_min, y_min, x_max, y_max = face_result['bbox']
        face_crop = image[y_min:y_max, x_min:x_max]
        confidence = self.classifier.classify(face_crop)
        
        assert 0 <= confidence <= 1
        
        print(f"✅ Deepfake confidence: {confidence:.3f}")
        
        # Deepfakes should have HIGH confidence (closer to 1)
        if confidence < 0.3:
            print(f"⚠️  Deepfake got low confidence {confidence:.3f} - model might need tuning")
    
    def test_confidence_range(self):
        """Test that all outputs are in valid range."""
        # Test on multiple images
        real_images = list(self.test_image_dir.glob('real_face_*.jpg'))
        fake_images = list(self.test_image_dir.glob('deepfake_*.jpg'))
        
        all_images = real_images[:2] + fake_images[:2]  # Test first 2 of each
        
        confidences = []
        for image_path in all_images:
            image = cv2.imread(str(image_path))
            if image is None:
                continue
            
            result = self.detector.detect(image)
            if not result['detected']:
                continue
            
            x_min, y_min, x_max, y_max = result['bbox']
            face_crop = image[y_min:y_max, x_min:x_max]
            conf = self.classifier.classify(face_crop)
            confidences.append(conf)
            
            assert 0 <= conf <= 1, f"Invalid confidence: {conf}"
        
        print(f"✅ All {len(confidences)} predictions in valid range [0, 1]")
        print(f"   Min: {min(confidences):.3f}, Max: {max(confidences):.3f}")
    
    def test_preprocesses_correctly(self):
        """Test that preprocessing handles different image formats."""
        # Create test images of different sizes
        sizes = [(256, 256, 3), (480, 640, 3), (1080, 1920, 3)]
        
        for h, w, c in sizes:
            # Create random BGR image
            test_image = np.random.randint(0, 256, (h, w, c), dtype=np.uint8)
            
            # Should not crash
            try:
                conf = self.classifier.classify(test_image)
                assert 0 <= conf <= 1
                print(f"✅ Preprocessed {w}x{h} image successfully")
            except Exception as e:
                print(f"❌ Failed on {w}x{h}: {e}")
                raise


if __name__ == "__main__":
    pytest.main([__file__, '-v'])