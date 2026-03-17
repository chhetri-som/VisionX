# backend/app/routes/health.py

from sys import api_version
from fastapi import APIRouter
from app.schemas.responses import HealthResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# loaded from main.py at startup
face_detector = None
image_classifier = None
findings_engine = None
audio_preprocessor = None
audio_classifier = None


def set_model_instances(fd, ic, fe, ap, ac):
    """Set global model instances from main.py startup"""
    global face_detector, image_classifier, findings_engine, audio_preprocessor, audio_classifier
    face_detector = fd
    image_classifier = ic
    findings_engine = fe
    audio_preprocessor = ap
    audio_classifier = ac


@router.get("/health", response_model=HealthResponse)
async def health_check():
    logger.info("/health called")

    image_models_ready = (
        face_detector is not None
        and image_classifier is not None
        and findings_engine is not None
    )

    audio_models_ready = (
        audio_preprocessor is not None
        and audio_classifier is not None
    )

    all_models_ready = image_models_ready and audio_models_ready

    if all_models_ready:
        logger.info("/health ok: all models loaded")
    else:
        missing_models = []
        if face_detector is None:
            missing_models.append("face_detector")
        if image_classifier is None:
            missing_models.append("image_classifier")
        if findings_engine is None:
            missing_models.append("findings_engine")
        if audio_preprocessor is None:
            missing_models.append("audio_preprocessor")
        if audio_classifier is None:
            missing_models.append("audio_classifier")
        
        logger.warning(f"/health error: missing models={missing_models}")
    
    from app.core.config import API_VERSION
    
    return HealthResponse(
        status="ok" if all_models_ready else "error",
        models_loaded=all_models_ready,
        face_model="MediaPipe Face Landmarker v1",
        image_model="EfficientNet-B0 INT8",
        audio_model="Audio CNN INT8" if audio_models_ready else "Not loaded",
        execution_provider="CPU",
        version=API_VERSION,
    )