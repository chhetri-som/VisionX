# backend/app/main.py
"""
VisionX FastAPI Backend
- Image upload and analysis
- Face detection + deepfake classification
- Saliency heatmap generation
- CORS-enabled for local frontend
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Tuple
import cv2
import numpy as np
import time
from pathlib import Path

from app.core.config import (
    CORS_ORIGINS, API_TITLE, API_VERSION,
    FACE_LANDMARKER_PATH, DEEPFAKE_MODEL_PATH,
    MAX_IMAGE_SIZE_MB, SALIENCY_ENABLED
)
from app.core.logging_config import setup_logging, get_logger
from app.core.face_detector import FaceDetector
from app.core.deepfake_classifier import DeepfakeClassifier, DummyClassifier
from app.schemas.responses import AnalyzeResponse, HealthResponse
from app.core.findings_engine import FindingsEngine
from app.core.saliency_mapper import SaliencyMapper

# Setup logging
setup_logging("INFO")
logger = get_logger(__name__)

# ============================================================================
# FastAPI App Setup
# ============================================================================

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description="Privacy-first static image deepfake detector",
)

# CORS Middleware - allows frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ============================================================================
# Global Model Instances
# ============================================================================

face_detector = None
deepfake_classifier = None
saliency_mapper = None
findings_engine = None

# ============================================================================
# Startup Event - Load Models
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load models when server starts."""
    global face_detector, deepfake_classifier, saliency_mapper, findings_engine
    
    logger.info("🚀 VisionX Backend Startup")
    logger.info("=" * 60)
    
    # Load face detector
    try:
        face_detector = FaceDetector(FACE_LANDMARKER_PATH)
        logger.info("✅ Face Landmarker loaded")
    except Exception as e:
        logger.error(f"❌ Face Landmarker failed: {e}")
        face_detector = None
    
    # Load deepfake classifier
    try:
        # Check if model file exists
        model_path = Path(DEEPFAKE_MODEL_PATH)
        if model_path.exists():
            deepfake_classifier = DeepfakeClassifier(DEEPFAKE_MODEL_PATH)
            logger.info("✅ EfficientNet-B0 loaded")
        else:
            logger.warning(f"⚠️  Model not found at {DEEPFAKE_MODEL_PATH}")
            logger.warning("   Using DummyClassifier for testing")
            deepfake_classifier = DummyClassifier()
    except Exception as e:
        logger.error(f"❌ EfficientNet-B0 failed: {e}")
        logger.warning("   Using DummyClassifier for testing")
        deepfake_classifier = DummyClassifier()
    
    # Initialize saliency mapper after classifier is loaded
    try:
        if deepfake_classifier is not None:
            from app.core.config import SALIENCY_PATCH_SIZE
            saliency_mapper = SaliencyMapper(deepfake_classifier, SALIENCY_PATCH_SIZE)
            logger.info("✅ SaliencyMapper initialized")
        else:
            logger.warning("⚠️  Cannot initialize SaliencyMapper: no classifier")
            saliency_mapper = None
    except Exception as e:
        logger.error(f"❌ SaliencyMapper failed: {e}")
        saliency_mapper = None
    
    # Initialize findings engine
    try:
        findings_engine = FindingsEngine()
        logger.info("✅ FindingsEngine initialized")
    except Exception as e:
        logger.error(f"❌ FindingsEngine failed: {e}")
        findings_engine = None
    
    logger.info("=" * 60)
    logger.info("✅ Startup complete\n")

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns:
    - status: 'ok' if all models loaded, 'error' otherwise
    - models_loaded: boolean
    - model names and version
    
    Useful for frontend to verify backend is ready before allowing uploads.
    """
    models_ready = face_detector is not None and deepfake_classifier is not None and saliency_mapper is not None and findings_engine is not None
    
    return HealthResponse(
        status="ok" if models_ready else "error",
        models_loaded=models_ready,
        face_model="MediaPipe Face Landmarker v1",
        deepfake_model="EfficientNet-B0 INT8",
        execution_provider="CPU",
        version=API_VERSION,
    )


@app.post("/analyze/image", response_model=AnalyzeResponse)
async def analyze_image(image: UploadFile = File(...)):
    """
    Analyze uploaded image for deepfakes.
    - Saliency Grid: 14x14
    - Confidence: 0-1 (EfficientNet-B0)
    - Findings: Spatial analysis based on heatmap
    """
    start_time = time.time()
    
    try:
        # ====================================================================
        # Step 1: Validate and decode image
        # ====================================================================
        contents = await image.read()
        file_size_mb = len(contents) / (1024 * 1024)
        if file_size_mb > MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"Image exceeds limit")
        
        if image.content_type not in ['image/jpeg', 'image/png']:
            raise HTTPException(status_code=400, detail="Invalid file type.")
        
        nparr = np.frombuffer(contents, np.uint8)
        image_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image_array is None or image_array.size == 0:
            raise HTTPException(status_code=400, detail="Failed to decode image.")
        
        # ====================================================================
        # Step 2: Check models
        # ====================================================================
        # Note: Ensure these are initialized in your AppState or globally
        if face_detector is None or deepfake_classifier is None or findings_engine is None:
            raise HTTPException(status_code=500, detail="Models not loaded.")
            
        # ====================================================================
        # Step 3 & 4: Detect and Crop face
        # ====================================================================
        face_result = face_detector.detect(image_array)
        
        if not face_result.get('detected', False):
            return AnalyzeResponse(face_detected=False, error="No face detected.")
        
        bbox = face_result['bbox']
        face_crop = face_detector.crop_face(image_array, bbox)
        
        # Check minimum face size for model reliability
        h, w = face_crop.shape[:2]
        if h < 50 or w < 50:
            return AnalyzeResponse(face_detected=True, error="Face too small.")

        # ====================================================================
        # Step 5: Classify face
        # ====================================================================
        # Standardize face size to 224x224 before inference/saliency
        face_crop_resized = cv2.resize(face_crop, (224, 224))
        confidence = float(deepfake_classifier.classify(face_crop_resized))
        confidence = max(0.0, min(1.0, confidence))
        
        # ====================================================================
        # Step 6: Generate saliency heatmap (Decision 3: 14x14)
        # ====================================================================
        heatmap_list = []
        try:
            # FIX: The method name in the new class is .compute(), not .compute_saliency()
            heatmap_list = saliency_mapper.compute(face_crop_resized, verbose=False)
        except Exception as e:
            logger.warning(f"Heatmap generation failed: {e}")
            # Fallback to empty 14x14 grid
            heatmap_list = [[0.0 for _ in range(14)] for _ in range(14)]
        
        # ====================================================================
        # Step 7: Generate findings (Decision 2: Rule-based Engine)
        # ====================================================================
        # FIX: Using findings_engine instance and capturing both label and findings
        label, findings = findings_engine.generate_findings(confidence, heatmap_list)
        
        # ====================================================================
        # Step 8: Return response
        # ====================================================================
        execution_time = int((time.time() - start_time) * 1000)
        
        return AnalyzeResponse(
            face_detected=True,
            confidence=round(confidence, 3),
            label=label,                 # "real", "uncertain", or "fake"
            findings=findings,           # Dynamic spatial findings
            heatmap_data=heatmap_list,   # 14x14 grid
            execution_time_ms=execution_time,
            model_details={
                "face_model": "MediaPipe Face Landmarker v1",
                "deepfake_model": "EfficientNet-B0 INT8",
                "saliency_method": "Occlusion Sensitivity (16px patch)"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")


# ============================================================================
# Startup
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
