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
    FACE_LANDMARKER_PATH, IMAGE_MODEL_PATH, AUDIO_MODEL_PATH,
    AUDIO_TARGET_SR
)
from app.core.logging_config import setup_logging, get_logger

from app.services.image.face_detector import FaceDetector
from app.services.image.image_classifier import ImageClassifier
from app.services.image.findings_engine import FindingsEngine

from app.services.audio.audio_classifier import AudioClassifier
from app.services.audio.audio_preprocessor import AudioPreprocessor
from app.routes import health, image, audio

# Setup logging
setup_logging("INFO")
logger = get_logger(__name__)


# FastAPI App Setup

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

# Global Model Instances
face_detector = None
image_classifier = None
findings_engine = None
audio_preprocessor = None
audio_classifier = None

# Startup Event - Load Models
@app.on_event("startup")
async def startup_event():
    """Load models when server starts."""
    global face_detector, image_classifier, findings_engine, audio_preprocessor, audio_classifier
    
    logger.info("🚀 VisionX Backend Startup")
    logger.info("=" * 60)
    
    logger.info('Load image analysis pipeline')

    # Load face detector
    try:
        face_detector = FaceDetector(FACE_LANDMARKER_PATH)
        logger.info("✅ Face Landmarker loaded")
    except Exception as e:
        logger.error(f"❌ Face Landmarker failed: {e}")
        raise RuntimeError(f"Failed to load Face Landmarker: {e}")
    
    # Load deepfake classifier
    try:
        # Check if model file exists
        image_model_path = Path(IMAGE_MODEL_PATH)
        if image_model_path.exists():
            image_classifier = ImageClassifier(IMAGE_MODEL_PATH)
            logger.info("✅ Image ML model loaded")
    except Exception as e:
        logger.error(f"❌ Image ML model failed: {e}")
        raise RuntimeError(f"Failed to load image ML model: {e}")
    
    # Initialize findings engine
    try:
        findings_engine = FindingsEngine()
        logger.info("✅ FindingsEngine initialized")
    except Exception as e:
        logger.error(f"❌ FindingsEngine failed: {e}")
        raise RuntimeError(f"Failed to initialize FindingsEngine: {e}")
    
    logger.info('Load audio analysis pipeline')

    # Initialize audio preprocessor
    try:
        audio_preprocessor = AudioPreprocessor(target_sr=AUDIO_TARGET_SR)
        logger.info('AudioPreprocessor initialized')
    except Exception as e:
        logger.error(f"Failed to load Audio Preprocessor: {e}")
        raise RuntimeError(f"Failed to load Audio Preprocessor: {e}")

    # load audio classifier
    try:
        audio_model_path = Path(AUDIO_MODEL_PATH)
        if audio_model_path.exists():
            audio_classifier = AudioClassifier(AUDIO_MODEL_PATH)
            logger.info("Audio ML model loaded")
    except Exception as e:
        logger.error(f'Audio ML model failed: {e}')
        raise RuntimeError(f"Failed to load audio deepfake model: {e}")
    

    # Set model instances in route modules
    health.set_model_instances(
        face_detector, image_classifier, findings_engine, audio_preprocessor, audio_classifier
    )
    image.set_model_instances(face_detector, image_classifier, findings_engine)
    audio.set_model_instances(audio_preprocessor, audio_classifier)
    
    logger.info("=" * 60)
    logger.info("✅ Startup complete\n")

# Router Registration
app.include_router(health.router, tags=["health"])
app.include_router(image.router, tags=["image"])
app.include_router(audio.router, tags=["audio"])

# Startup
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
