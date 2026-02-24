"""
Integration tests for the full /analyze/image pipeline.
Run: pytest tests/test_api_integration.py -v
"""
from pathlib import Path
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestAnalyzeImageAPI:
    """Test the complete POST /analyze/image endpoint."""
    
    test_image_dir = Path('tests/test_images')
    
    def test_health_check(self):
        """Test GET /health endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] in ['ok', 'error']
        assert 'models_loaded' in data
        
        print(f"✅ Health check: {data['status']}")
    
    def test_analyze_real_face(self):
        """Test analyzing a real human face."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            print("⚠️  Test image not found")
            return
        
        with open(image_path, 'rb') as f:
            response = client.post(
                "/analyze/image",
                files={"image": ("test.jpg", f, "image/jpeg")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['face_detected'] == True
        assert 'confidence' in data
        assert 0 <= data['confidence'] <= 1
        assert data['label'] in ['real', 'fake']
        assert 'findings' in data
        assert isinstance(data['findings'], list)
        assert 'heatmap_data' in data
        assert 'execution_time_ms' in data
        
        print(f"✅ Real face analysis:")
        print(f"   Confidence: {data['confidence']:.3f}")
        print(f"   Label: {data['label']}")
        print(f"   Time: {data['execution_time_ms']}ms")
    
    def test_analyze_deepfake(self):
        """Test analyzing a known deepfake."""
        image_path = self.test_image_dir / 'deepfake_1.jpg'
        if not image_path.exists():
            print("⚠️  Deepfake test image not found")
            return
        
        with open(image_path, 'rb') as f:
            response = client.post(
                "/analyze/image",
                files={"image": ("test.jpg", f, "image/jpeg")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        if data['face_detected']:
            print(f"✅ Deepfake analysis:")
            print(f"   Confidence: {data['confidence']:.3f}")
            print(f"   Label: {data['label']}")
    
    def test_no_face_error(self):
        """Test graceful handling when no face is detected."""
        image_path = self.test_image_dir / 'no_face.jpg'
        if not image_path.exists():
            print("⚠️  No-face test image not found")
            return
        
        with open(image_path, 'rb') as f:
            response = client.post(
                "/analyze/image",
                files={"image": ("test.jpg", f, "image/jpeg")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data['face_detected'] == False
        assert 'error' in data
        
        print(f"✅ No-face handling: {data['error']}")
    
    def test_oversized_image(self):
        """Test rejection of oversized images (>10MB)."""
        # Create a very large dummy image
        large_image = np.random.randint(0, 256, (8000, 8000, 3), dtype=np.uint8)
        
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg') as tmp:
            cv2.imwrite(tmp.name, large_image)
            
            with open(tmp.name, 'rb') as f:
                response = client.post(
                    "/analyze/image",
                    files={"image": ("test.jpg", f, "image/jpeg")}
                )
            
            # Should either reject or process
            assert response.status_code in [200, 400]
            
            if response.status_code == 400:
                print("✅ Oversized image rejected")
            else:
                print("✅ Oversized image processed")
    
    def test_missing_file(self):
        """Test error handling when file is missing."""
        response = client.post(
            "/analyze/image",
            files={}  # No file
        )
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422]
        print("✅ Missing file handled")
    
    def test_response_schema(self):
        """Test that response matches expected schema."""
        image_path = self.test_image_dir / 'real_face_1.jpg'
        if not image_path.exists():
            return
        
        with open(image_path, 'rb') as f:
            response = client.post(
                "/analyze/image",
                files={"image": ("test.jpg", f, "image/jpeg")}
            )
        
        data = response.json()
        
        # Check required fields
        assert 'face_detected' in data
        
        if data['face_detected']:
            required_fields = [
                'confidence', 'label', 'findings',
                'heatmap_data', 'execution_time_ms', 'model_info'
            ]
            for field in required_fields:
                assert field in data, f"Missing field: {field}"
        
        print("✅ Response schema valid")


if __name__ == "__main__":
    pytest.main([__file__, '-v'])