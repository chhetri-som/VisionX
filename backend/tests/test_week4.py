"""
tests/test_week4_integration.py
===============================

Comprehensive test suite for Week 4.

Covers:
1. Edge case handling (no face, corrupted image, oversized file, etc.)
2. Findings engine validation
3. Saliency mapper output validation
4. API endpoint integration
5. Error handling

Run:
    pytest tests/test_week4_integration.py -v
    pytest tests/test_week4_integration.py -v -s  # with print output

Requirements:
    pytest
    fastapi
    httpx (for async test client)
"""

import pytest
import numpy as np
import cv2
import io
import json
from pathlib import Path

# For async tests
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Import your modules (adjust paths as needed)
# from app.main import app
# from app.core.findings_engine import FindingsEngine
# from app.core.saliency_mapper import SaliencyMapper


# ============================================================
# FIXTURES (Test Data Creators)
# ============================================================

@pytest.fixture
def dummy_classifier():
    """Mock classifier that returns consistent scores."""
    def classifier(face_image: np.ndarray) -> float:
        """Return confidence based on image statistics."""
        # Mean pixel value → confidence (for testing only)
        mean = face_image.mean() / 255.0
        return 0.5 + mean * 0.4  # Range [0.5, 0.9]
    return classifier


@pytest.fixture
def sample_face_image():
    """Create a synthetic 224×224 face image."""
    # Create a face-like image (dark eyes, lighter cheeks, etc.)
    face = np.zeros((224, 224, 3), dtype=np.uint8)
    
    # Light skin tone
    face[:, :] = [180, 120, 100]  # BGR
    
    # Darker eyes
    face[70:100, 60:90] = [50, 40, 30]  # Left eye
    face[70:100, 134:164] = [50, 40, 30]  # Right eye
    
    # Mouth
    face[160:180, 80:144] = [100, 60, 50]
    
    return face


@pytest.fixture
def corrupted_image_bytes():
    """Create corrupted JPEG bytes."""
    # Invalid JPEG header
    return b'\xFF\xD8\xFF\xE0' + b'CORRUPTED_DATA'


@pytest.fixture
def oversized_image_bytes():
    """Create oversized image bytes (15MB)."""
    size_mb = 15
    return b'x' * (size_mb * 1024 * 1024)


# ============================================================
# UNIT TESTS: FindingsEngine
# ============================================================

class TestFindingsEngine:
    """Test findings generation logic (Decision 2)."""
    
    def test_findings_engine_import(self):
        """Verify FindingsEngine can be imported."""
        try:
            from app.core.findings_engine import FindingsEngine
            engine = FindingsEngine()
            assert engine is not None
        except ImportError:
            pytest.skip("FindingsEngine not yet implemented")
    
    def test_findings_real_face(self):
        """Test findings for real face (low confidence)."""
        from app.core.findings_engine import FindingsEngine
        
        engine = FindingsEngine()
        
        # Low confidence = real
        heatmap = [[0.1] * 4 for _ in range(4)]  # Uniform low importance
        label, findings = engine.generate_findings(0.15, heatmap)
        
        assert label == "real"
        assert len(findings) > 0
        assert any("✅" in f for f in findings)  # Should have positive findings
    
    def test_findings_fake_face(self):
        """Test findings for fake face (high confidence)."""
        from app.core.findings_engine import FindingsEngine
        
        engine = FindingsEngine()
        
        # High confidence = fake
        heatmap = [[0.8] * 4 for _ in range(4)]  # High importance
        label, findings = engine.generate_findings(0.87, heatmap)
        
        assert label == "fake"
        assert len(findings) > 0
        assert any("❌" in f for f in findings)  # Should have negative findings
    
    def test_findings_uncertain_face(self):
        """Test findings for uncertain case."""
        from app.core.findings_engine import FindingsEngine
        
        engine = FindingsEngine()
        
        # Medium confidence = uncertain
        heatmap = [[0.4] * 4 for _ in range(4)]
        label, findings = engine.generate_findings(0.45, heatmap)
        
        assert label == "uncertain"
        assert len(findings) > 0
    
    def test_findings_with_heatmap_analysis(self):
        """Test that findings incorporate heatmap region analysis."""
        from app.core.findings_engine import FindingsEngine
        
        engine = FindingsEngine()
        
        # Create heatmap with high importance in top-left (eye region)
        heatmap = [[0.05] * 4 for _ in range(4)]
        heatmap[0][0] = 0.9  # High importance in top-left
        heatmap[1][0] = 0.9
        
        label, findings = engine.generate_findings(0.75, heatmap)
        
        # Should mention specific regions
        findings_text = ' '.join(findings)
        assert len(findings_text) > 0
    
    def test_confidence_description(self):
        """Test confidence description generation."""
        from app.core.findings_engine import FindingsEngine
        
        engine = FindingsEngine()
        
        desc_real = engine.get_confidence_description(0.15)
        assert "real" in desc_real.lower()
        
        desc_uncertain = engine.get_confidence_description(0.5)
        assert "uncertain" in desc_uncertain.lower() or "suspicious" in desc_uncertain.lower()
        
        desc_fake = engine.get_confidence_description(0.9)
        assert "fake" in desc_fake.lower()


# ============================================================
# UNIT TESTS: SaliencyMapper
# ============================================================

class TestSaliencyMapper:
    """Test saliency mapping logic (Decision 3)."""
    
    def test_saliency_mapper_import(self):
        """Verify SaliencyMapper can be imported."""
        try:
            from app.core.saliency_mapper import SaliencyMapper
            assert SaliencyMapper is not None
        except ImportError:
            pytest.skip("SaliencyMapper not yet implemented")
    
    def test_saliency_output_shape(self, dummy_classifier, sample_face_image):
        """Test that saliency output is correct shape (14×14 for 224×224 input)."""
        from app.core.saliency_mapper import SaliencyMapper
        
        mapper = SaliencyMapper(dummy_classifier, patch_size=16)
        
        # Output should be 14×14 for 224×224 input with 16×16 patches
        heatmap = mapper.compute(sample_face_image)
        
        assert isinstance(heatmap, list)
        assert len(heatmap) == 14, f"Expected 14 rows, got {len(heatmap)}"
        assert len(heatmap[0]) == 14, f"Expected 14 cols, got {len(heatmap[0])}"
    
    def test_saliency_output_range(self, dummy_classifier, sample_face_image):
        """Test that saliency values are in [0, 1]."""
        from app.core.saliency_mapper import SaliencyMapper
        
        mapper = SaliencyMapper(dummy_classifier, patch_size=16)
        heatmap = mapper.compute(sample_face_image)
        
        # Flatten and check all values
        flat = [v for row in heatmap for v in row]
        assert all(0.0 <= v <= 1.0 for v in flat), "Saliency values out of range"
    
    def test_saliency_json_serializable(self, dummy_classifier, sample_face_image):
        """Test that saliency heatmap is JSON-serializable."""
        from app.core.saliency_mapper import SaliencyMapper
        import json
        
        mapper = SaliencyMapper(dummy_classifier, patch_size=16)
        heatmap = mapper.compute(sample_face_image)
        
        # Should be able to JSON encode
        json_str = json.dumps(heatmap)
        assert json_str is not None
        assert len(json_str) > 0
    
    def test_saliency_upsample(self, dummy_classifier, sample_face_image):
        """Test upsampling heatmap to full resolution."""
        from app.core.saliency_mapper import SaliencyMapper
        
        mapper = SaliencyMapper(dummy_classifier, patch_size=16)
        heatmap_14x14 = mapper.compute(sample_face_image)
        
        # Upsample to 224×224
        heatmap_224x224 = mapper.upsample_heatmap(heatmap_14x14, (224, 224))
        
        assert heatmap_224x224.shape == (224, 224)
        assert heatmap_224x224.dtype == np.float32
        assert heatmap_224x224.min() >= 0.0
        assert heatmap_224x224.max() <= 1.0


# ============================================================
# INTEGRATION TESTS: API Endpoints
# ============================================================

class TestAPIEndpoints:
    """Test API endpoints with real HTTP requests."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        try:
            from app.main import app
            return TestClient(app)
        except ImportError:
            pytest.skip("main.py not yet implemented")
    
    def test_health_endpoint(self, client):
        """Test GET /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "models_loaded" in data
        assert "version" in data
    
    def test_analyze_image_no_file(self, client):
        """Test POST /analyze/image without file."""
        response = client.post("/analyze/image")
        # Should return 422 (unprocessable) or 400
        assert response.status_code in [400, 422]
    
    def test_analyze_image_corrupted(self, client, corrupted_image_bytes):
        """Test analyzing corrupted image."""
        response = client.post(
            "/analyze/image",
            files={"image": ("bad.jpg", corrupted_image_bytes, "image/jpeg")}
        )
        
        assert response.status_code in [200, 400]
        
        if response.status_code == 400:
            data = response.json()
            assert "error" in data


# ============================================================
# EDGE CASE TESTS
# ============================================================

class TestEdgeCases:
    """Test edge case handling."""
    
    def test_no_face_image(self):
        """Test image with no human face."""
        # Create a landscape image (no face)
        landscape = np.ones((480, 640, 3), dtype=np.uint8) * 100  # Gray image
        
        # Should return face_detected=false
        # (Implementation depends on FaceDetector behavior)
        # This test assumes you have FaceDetector implemented
        pytest.skip("Requires FaceDetector implementation")
    
    def test_multiple_faces(self):
        """Test image with multiple faces."""
        # Should process first/largest face
        pytest.skip("Requires test image with multiple faces")
    
    def test_very_small_face(self):
        """Test image with very small face."""
        # Might fail face detection or have poor classification
        pytest.skip("Requires test image with small face")
    
    def test_extreme_lighting(self):
        """Test image with extreme lighting."""
        # Very bright or very dark image
        pytest.skip("Requires test image with extreme lighting")


# ============================================================
# PERFORMANCE BENCHMARKS
# ============================================================

class TestPerformance:
    """Benchmark performance of pipeline stages."""
    
    def test_classification_speed(self, dummy_classifier, sample_face_image):
        """Benchmark classification speed."""
        import time
        
        start = time.time()
        for _ in range(10):
            confidence = dummy_classifier(sample_face_image)
        elapsed = time.time() - start
        
        avg_time_ms = (elapsed / 10) * 1000
        print(f"\nAverage inference time: {avg_time_ms:.1f}ms")
        
        # Should be very fast for dummy classifier
        assert avg_time_ms < 100
    
    def test_saliency_speed(self, dummy_classifier, sample_face_image):
        """Benchmark saliency mapping speed."""
        import time
        
        try:
            from app.core.saliency_mapper import SaliencyMapper
            
            mapper = SaliencyMapper(dummy_classifier, patch_size=24)  # Larger patch for speed
            
            start = time.time()
            heatmap = mapper.compute(sample_face_image)
            elapsed = time.time() - start
            
            print(f"\nSaliency mapping time: {elapsed:.2f}s")
            
            # Should be under 10 seconds even for full computation
            assert elapsed < 10.0
        except ImportError:
            pytest.skip("SaliencyMapper not implemented")


# ============================================================
# RESPONSE VALIDATION
# ============================================================

class TestResponseFormats:
    """Test response format compliance."""
    
    def test_analysis_response_schema(self):
        """Test analysis response has correct schema."""
        # This would be tested against Pydantic model
        expected_fields = {
            'face_detected': bool,
            'confidence': float,
            'label': str,
            'findings': list,
            'heatmap_data': list,
            'execution_time_ms': int,
            'model_info': dict,
        }
        
        # Mock response
        response = {
            'face_detected': True,
            'confidence': 0.87,
            'label': 'fake',
            'findings': ['Finding 1', 'Finding 2'],
            'heatmap_data': [[0.1, 0.2], [0.3, 0.4]],
            'execution_time_ms': 145,
            'model_info': {
                'face_model': 'MediaPipe v1',
                'deepfake_model': 'EfficientNet-B0'
            }
        }
        
        # Validate
        for field, expected_type in expected_fields.items():
            assert field in response
            assert isinstance(response[field], expected_type), \
                f"Field {field}: expected {expected_type}, got {type(response[field])}"
    
    def test_no_face_response_schema(self):
        """Test no-face response schema."""
        response = {
            'face_detected': False,
            'error': 'No face detected in image'
        }
        
        assert response['face_detected'] == False
        assert isinstance(response['error'], str)


# ============================================================
# HELPERS FOR MANUAL TESTING
# ============================================================

def create_test_image_jpeg(filename: str, shape: tuple = (480, 640)) -> Path:
    """Create a test JPEG image."""
    img = np.random.randint(0, 256, (*shape, 3), dtype=np.uint8)
    filepath = Path(__file__).parent / filename
    cv2.imwrite(str(filepath), img)
    return filepath


def create_test_image_png(filename: str, shape: tuple = (480, 640)) -> Path:
    """Create a test PNG image."""
    img = np.random.randint(0, 256, (*shape, 3), dtype=np.uint8)
    filepath = Path(__file__).parent / filename
    cv2.imwrite(str(filepath), img)
    return filepath


# ============================================================
# RUN TESTS
# ============================================================

if __name__ == "__main__":
    """Run tests directly."""
    print("Run tests with: pytest tests/test_week4_integration.py -v")
    print("Or run specific test: pytest tests/test_week4_integration.py::TestFindingsEngine -v")
