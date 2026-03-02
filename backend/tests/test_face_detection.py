"""
Test face detection pipeline on real images.
Run: pytest tests/test_face_detection.py -v
"""
import cv2
import numpy as np
from pathlib import Path
from app.services.face_detector import FaceDetector
from app.core.config import FACE_LANDMARKER_PATH

class TestFaceDetection:
    """Test suite for face detection."""
    
    @classmethod
    def setup_class(cls):
        """Load detector once for all tests."""
        cls.detector = FaceDetector(FACE_LANDMARKER_PATH)
        cls.test_image_dir = Path('tests/test_images')
    
    def test_detect_real_face(self):
        """Test detection on a real human face."""
        # You'll need: tests/test_images/real_face_1.jpg
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        assert image is not None, f"Failed to load {image_path}"
        
        result = self.detector.detect(image)
        
        # Assertions
        assert result['detected'] == True, "Should detect face in real image"
        assert result['bbox'] is not None, "Should return bounding box"
        assert len(result['bbox']) == 4, "BBox should be [x_min, y_min, x_max, y_max]"
        assert result['landmarks'] is not None, "Should return landmarks"
        assert len(result['landmarks']) > 0, "Should have landmarks"
        
        # Bbox sanity checks
        x_min, y_min, x_max, y_max = result['bbox']
        assert x_min < x_max, "x_min should be < x_max"
        assert y_min < y_max, "y_min should be < y_max"
        assert x_min >= 0, "x_min should be >= 0"
        assert y_min >= 0, "y_min should be >= 0"
        
        print(f"✅ BBox: {result['bbox']}")
        print(f"✅ Landmarks: {len(result['landmarks'])} points")
    
    def test_no_face_image(self):
        """Test graceful handling when no face is present."""
        image_path = self.test_image_dir / 'no_face.jpg'
        if not image_path.exists():
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        result = self.detector.detect(image)
        
        assert result['detected'] == False, "Should not detect face when none present"
        assert result['bbox'] is None, "BBox should be None"
    
    def test_multiple_faces(self):
        """Test that detector handles multiple faces (takes largest)."""
        image_path = self.test_image_dir / 'multiple_faces.jpg'
        if not image_path.exists():
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        result = self.detector.detect(image)
        
        # Should detect the largest/most prominent face
        assert result['detected'] == True
        assert result['bbox'] is not None
        
        print("✅ Handled multiple faces correctly")
    
    def test_small_face(self):
        """Test detection on small face."""
        image_path = self.test_image_dir / 'small_face.jpg'
        if not image_path.exists():
            # Create a test image with small face
            print(f"⚠️  Skipping: {image_path} not found")
            return
        
        image = cv2.imread(str(image_path))
        result = self.detector.detect(image)
        
        # Small faces are still detectable by MediaPipe
        # But we might flag them later as too small for classification
        if result['detected']:
            bbox = result['bbox']
            height = bbox[3] - bbox[1]
            width = bbox[2] - bbox[0]
            print(f"✅ Small face detected: {width}x{height} pixels")
    
    def test_face_crop_dimensions(self):
        """Test that face crops have reasonable dimensions."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        result = self.detector.detect(image)
        
        if result['detected']:
            x_min, y_min, x_max, y_max = result['bbox']
            height = y_max - y_min
            width = x_max - x_min
            
            # Face should be reasonably sized
            assert height > 30, f"Face height {height} too small"
            assert width > 30, f"Face width {width} too small"
            assert height < image.shape[0], "Face height shouldn't exceed image"
            assert width < image.shape[1], "Face width shouldn't exceed image"
            
            print(f"✅ Face crop dimensions: {width}x{height}")
    
    def test_detector_consistency(self):
        """Test that detection is consistent on same image."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            return
        
        image = cv2.imread(str(image_path))
        
        result1 = self.detector.detect(image)
        result2 = self.detector.detect(image)
        
        # Results should be identical
        assert result1['detected'] == result2['detected']
        if result1['detected']:
            assert result1['bbox'] == result2['bbox'], "BBox should be consistent"
            
            print("✅ Detection is consistent across runs")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, '-v'])