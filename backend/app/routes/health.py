# backend/app/routes/health.py
"""
Health check endpoint for VisionX API
"""

from fastapi import APIRouter
from app.schemas.responses import HealthResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# loaded from main.py at startup
face_detector = None
deepfake_classifier = None
findings_engine = None


def set_model_instances(fd, dfc, fe):
    """Set global model instances from main.py startup"""
    global face_detector, deepfake_classifier, findings_engine
    face_detector = fd
    deepfake_classifier = dfc
    findings_engine = fe


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns:
    - status: 'ok' if all models loaded, 'error' otherwise
    - models_loaded: boolean
    - model names and version
    
    Useful for frontend to verify backend is ready before allowing uploads.
    """
    logger.info("/health called")

    models_ready = (
        face_detector is not None
        and deepfake_classifier is not None
        and findings_engine is not None
    )

    if models_ready:
        logger.info("/health ok: all models loaded")
    else:
        missing_models = []
        if face_detector is None:
            missing_models.append("face_detector")
        if deepfake_classifier is None:
            missing_models.append("deepfake_classifier")
        if findings_engine is None:
            missing_models.append("findings_engine")
        logger.warning(f"/health error: missing models={missing_models}")
    
    from app.core.config import API_VERSION
    
    return HealthResponse(
        status="ok" if models_ready else "error",
        models_loaded=models_ready,
        face_model="MediaPipe Face Landmarker v1",
        deepfake_model="EfficientNet-B0 INT8",
        execution_provider="CPU",
        version=API_VERSION,
    )