# backend/app/main.py
"""
VisionX FastAPI Backend
- Image upload and analysis
- Face detection + deepfake classification
- MediaPipe facial landmark analysis
- CORS-enabled for local frontend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.core.config import (
    CORS_ORIGINS, API_TITLE, API_VERSION,
    FACE_LANDMARKER_PATH, DEEPFAKE_MODEL_PATH
)
from app.core.logging_config import setup_logging, get_logger
from app.services.face_detector import FaceDetector
from app.services.deepfake_classifier import DeepfakeClassifier, DummyClassifier
from app.services.findings_engine import FindingsEngine
from app.routes import health, image

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
findings_engine = None

# ============================================================================
# Startup Event - Load Models
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load models when server starts."""
    global face_detector, deepfake_classifier, findings_engine
    
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
    
    # Initialize findings engine
    try:
        findings_engine = FindingsEngine()
        logger.info("✅ FindingsEngine initialized")
    except Exception as e:
        logger.error(f"❌ FindingsEngine failed: {e}")
        findings_engine = None
    
    # Set model instances in route modules
    health.set_model_instances(face_detector, deepfake_classifier, findings_engine)
    image.set_model_instances(face_detector, deepfake_classifier, findings_engine)
    
    logger.info("=" * 60)
    logger.info("✅ Startup complete\n")

# ============================================================================
# Router Registration
# ============================================================================

app.include_router(health.router, tags=["health"])
app.include_router(image.router, tags=["image"])

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
