import gc
from functools import lru_cache
from pathlib import Path
from fastapi import HTTPException
from llama_cpp import Llama
from llama_cpp.llama_chat_format import Qwen3VLChatHandler

from app.core.config import (
    FACE_LANDMARKER_PATH, IMAGE_MODEL_PATH, MMPROJ_PATH,
    ONNX_AUDIO_MODEL_PATH, CLAP_TEXT_EMBEDDINGS_PATH, 
    CLAP_PROCESSOR_PATH, AUDIO_TARGET_SR
)
from app.core.logging_config import get_logger
from app.services.image.face_detector import FaceDetector
from app.services.image.image_classifier import ImageClassifier
from app.services.image.findings_engine import FindingsEngine
from app.services.audio.audio_classifier import AudioClassifier
from app.services.audio.audio_preprocessor import AudioPreprocessor
from app.services.video.video_preprocessor import VideoPreprocessor
from app.services.video.video_classifier import VideoClassifier
from app.services.video.video_findings import VideoFindingsEngine

logger = get_logger(__name__)

def unload_audio_models():
    if get_audio_preprocessor.cache_info().currsize > 0 or get_audio_classifier.cache_info().currsize > 0:
        logger.info('Unloading Audio model to free memory...')
        get_audio_preprocessor.cache_clear()
        get_audio_classifier.cache_clear()
        gc.collect()

def unload_vision_models():
    if get_face_detector.cache_info().currsize > 0 or get_shared_vlm_engine.cache_info().currsize > 0 or get_findings_engine.cache_info().currsize > 0 or get_video_preprocessor.cache_info().currsize > 0:
        logger.info("Unloading Vision model to free memory...")
        get_face_detector.cache_clear()
        get_image_classifier.cache_clear()
        get_video_classifier.cache_clear()
        get_findings_engine.cache_clear()
        get_video_preprocessor.cache_clear()
        gc.collect()

@lru_cache()
def get_shared_vlm_engine():
    unload_audio_models()
    logger.info('Lazy loading Qwen3-VL-4B_Thinking model...')
    image_model_path = Path(IMAGE_MODEL_PATH)
    mmproj_path = Path(MMPROJ_PATH)

    if not (image_model_path.exists() and mmproj_path.exists()):
        raise HTTPException(status_code=503, detail="Vision models are missing, download them first.")

    try:
        engine = Llama(
            model_path=str(image_model_path),
            chat_handler=Qwen3VLChatHandler(
                clip_model_path=str(mmproj_path),
                force_reasoning=True,
                image_min_tokens=1024,
            ),
            n_ctx = 8192,
            n_gpu_layers=-1,
            flash_attn=True,
            verbose=False
        )
        logger.info('Qwen3-VL-4B_Thinking model loaded successfully')
        return engine
    except Exception as e:
        logger.error(f'Failed to load Qwen3-VL-4B_Thinking model: {e}')
        raise RuntimeError(f"VLM initization failed: {e}")

@lru_cache()
def get_video_preprocessor():
    unload_audio_models()
    logger.info('Lazy loading Video Preprocessor...')
    return VideoPreprocessor()

@lru_cache()
def get_video_findings_engine():
    unload_audio_models()
    logger.info('Lazy loading Video Findings Engine...')
    return VideoFindingsEngine()

@lru_cache()
def get_face_detector():
    unload_audio_models()
    logger.info('Lazy loading MediaPipe...')
    return FaceDetector(FACE_LANDMARKER_PATH)

@lru_cache()
def get_image_classifier():
    unload_audio_models()
    logger.info('Lazy Loading Qwen3-VL weights + VLM')
    engine = get_shared_vlm_engine()
    return ImageClassifier(engine=engine)

@lru_cache()
def get_video_classifier():
    unload_audio_models()
    logger.info('Lazy Loading Qwen3-VL weights + VLM')
    engine = get_shared_vlm_engine()
    return VideoClassifier(engine=engine)

@lru_cache()
def get_findings_engine():
    unload_audio_models()
    logger.info('Lazy loading Findings Engine...')
    return FindingsEngine()

@lru_cache()
def get_audio_preprocessor():
    unload_vision_models()
    logger.info('Lazy loading Audio Preprocessor...')
    return AudioPreprocessor(target_sr=AUDIO_TARGET_SR)

@lru_cache()
def get_audio_classifier():
    unload_vision_models()
    logger.info('Lazy loading CLAP model...')

    audio_model_path = Path(ONNX_AUDIO_MODEL_PATH)
    embeddings_path = Path(CLAP_TEXT_EMBEDDINGS_PATH)
    processor_path = Path(CLAP_PROCESSOR_PATH)

    if not audio_model_path.exists() or not embeddings_path.exists() or not processor_path.exists():
        raise HTTPException(status_code=503, detail="Audio model is missing, download it first.")
    return AudioClassifier(onnx_model_path=ONNX_AUDIO_MODEL_PATH, text_embeddings_path=CLAP_TEXT_EMBEDDINGS_PATH, processor_path=CLAP_PROCESSOR_PATH)

