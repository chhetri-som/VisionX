from fastapi import APIRouter
from app.schemas.responses import HealthResponse
from app.core.logging_config import get_logger
from app.core.config import API_VERSION

from app.dependencies import (
    get_audio_classifier,
    get_audio_preprocessor,
    get_face_detector,
    get_findings_engine,
    get_image_classifier
)

logger = get_logger(__name__)
router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    logger.info("/health called")

    face_model = get_face_detector.cache_info().currsize > 0
    image_model = get_image_classifier.cache_info().currsize > 0
    findings_engine = get_findings_engine.cache_info().currsize > 0
    audio_preprocessor = get_audio_preprocessor.cache_info().currsize > 0
    audio_model = get_audio_classifier.cache_info().currsize > 0

    logger.info(f"Memory status -> Face: {face_model}, Image: {image_model}, Findings: {findings_engine}, Audio Preprocessor: {audio_preprocessor}, Audio Model: {audio_model}")
    
    return HealthResponse(
        status="ok",
        models_loaded=True,
        face_model="MediaPipe Face Landmarker" if face_model else "Unloaded",
        image_model="Qwen3-VL-4B-Thinking" if image_model else "Unloaded",
        audio_model="Audio CNN INT8" if audio_model else "Unloaded",
        execution_provider="NVIDIA 5060 GPU",
        version=API_VERSION,
    )