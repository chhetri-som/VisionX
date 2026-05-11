import gc
from functools import lru_cache
from pathlib import Path
from fastapi import HTTPException

from app.core.config import (
    FACE_LANDMARKER_PATH, IMAGE_MODEL_PATH, MMPROJ_PATH,
    AUDIO_MODEL_PATH, AUDIO_TARGET_SR
)
from app.core.logging_config import get_logger
from app.services.image.face_detector import FaceDetector
from app.services.image.image_classifier import ImageClassifier
from app.services.image.findings_engine import FindingsEngine
from app.services.audio.audio_classifier import AudioClassifier
from app.services.audio.audio_preprocessor import AudioPreprocessor

logger = get_logger(__name__)

def unload_audio_models():
    if get_audio_preprocessor.cache_info().currsize > 0 or get_audio_classifier.cache_info().currsize > 0:
        logger.info('Unloading Audio models to free memory...')
        get_audio_preprocessor.cache_clear()
        get_audio_classifier.cache_clear()
        gc.collect()

def unload_image_models():
    if get_face_detector.cache_info().currsize > 0 or get_image_classifier.cache_info().currsize > 0 or get_findings_engine.cache_info().currsize > 0:
        logger.info("Unloading Image models to free memory...")
        get_face_detector.cache_clear()
        get_image_classifier.cache_clear()
        get_findings_engine.cache_clear()
        gc.collect()

@lru_cache()
def get_face_detector():
    unload_audio_models()
    logger.info('Lazy loading MediaPipe...')
    return FaceDetector(FACE_LANDMARKER_PATH)

@lru_cache()
def get_image_classifier():
    unload_audio_models()
    logger.info('Lazy Loading Qwen3-VL weights + VLM')
    image_model_path = Path(IMAGE_MODEL_PATH)
    mmproj_path = Path(MMPROJ_PATH)
    if not (image_model_path.exists() and mmproj_path.exists()):
        raise HTTPException(status_code=503, detail="Image models are missing, download them first.")
    return ImageClassifier(model_path=IMAGE_MODEL_PATH, mmproj_path=MMPROJ_PATH)

@lru_cache()
def get_findings_engine():
    unload_audio_models()
    logger.info('Lazy loading Findings Engine...')
    return FindingsEngine()

@lru_cache()
def get_audio_preprocessor():
    unload_image_models()
    logger.info('Lazy loading Audio Preprocessor...')
    return AudioPreprocessor(target_sr=AUDIO_TARGET_SR)

@lru_cache()
def get_audio_classifier():
    unload_image_models()
    logger.info('Lazy loading Audio Classifier...')
    audio_model_path = Path(AUDIO_MODEL_PATH)
    if not audio_model_path.exists():
        raise HTTPException(status_code=503, detail="Audio model is missing, download it first.")
    return AudioClassifier(AUDIO_MODEL_PATH)

