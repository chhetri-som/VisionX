# backend/app/core/config.py

import os
from pathlib import Path

# Base directory (project root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# --- MODEL PATHS ---
# Face detection model (MediaPipe)
FACE_LANDMARKER_PATH = os.getenv(
    'FACE_LANDMARKER_PATH',
    str(BASE_DIR / 'app' / 'models' / 'face_landmarker.task')
)

# 4bit Qwen3 VL 4B Thinking
IMAGE_MODEL_PATH = os.getenv(
    'IMAGE_MODEL_PATH',
    str(BASE_DIR / 'app' / 'models' / 'qwen3_4bit_base.gguf')
)

# MMPROJ FOR QWEN3
MMPROJ_PATH = os.getenv(
    'MMPROJ_PATH',
    str(BASE_DIR / 'app' / 'models' / 'mmproj-Qwen_Qwen3-VL-4B-Thinking-f16.gguf')
)

# CLAP-htsat-fused audio encoder in ONNX export
ONNX_AUDIO_MODEL_PATH = os.getenv(
    'ONNX_AUDIO_MODEL_PATH',
    str(BASE_DIR / 'app' / 'models' / 'clap_audio_encoder.onnx')
)

# CLAP-htsat-fused text embeddings obtained for text encoder
CLAP_TEXT_EMBEDDINGS_PATH = os.getenv(
    'CLAP_TEXT_EMBEDDINGS_PATH',
    str(BASE_DIR / 'app' / 'models' / 'clap_text_embeddings.npy')
)

# CLAP-htsat-fused processor
CLAP_PROCESSOR_PATH = os.getenv(
    'CLAP_PROCESSOR_PATH',
    str(BASE_DIR / 'app' / 'models' / 'CLAP-htsat-fused')
)


AUDIO_TARGET_SR = 48000 # CLAP natively operates beat at 48kHz
AUDIO_SEGMENT_LENGTH = 3.0 # seconds
AUDIO_SEGMENT_OVERLAP = 0.5 # 50% overlap

VIDEO_MAX_DURATION_SEC = 10
VIDEO_FPS = 2
VIDEO_MAX_PIXELS = 100352 # 316x316
VIDEO_MIN_PIXELS = 3136 # 56x56

# --- CONFIDENCE THRESHOLDS ---
# if confidence < REAL_THRESHOLD -> real
REAL_THRESHOLD = 0.3
# confidence < UNCERTAIN_THRESHOLD -> uncertain
UNCERTAIN_THRESHOLD = 0.6
# if greater than 0.6 -> fake

# --- API SETTINGS ---
API_TITLE = "VisionX"
API_VERSION = "2.1.2"

# Maximum image file size (in MB)
MAX_IMAGE_SIZE_MB = 10
MAX_VIDEO_SIZE_MB = 50

# --- WATERMARKING SETTINGS (RISHI) ---
# Directory for storing ECDSA and AES cryptographic keys
WATERMARK_KEYS_DIR = os.getenv(
    'WATERMARK_KEYS_DIR',
    str(BASE_DIR / 'app' / 'keys')
)

# Core Shamir / FEC Parameters
WATERMARK_MAX_SHARES = 255
WATERMARK_THRESHOLD_FRACTION = 0.6
WATERMARK_FEC_NSYM = 64
WATERMARK_STRENGTH = 2.0

# Fallback parameters for the detector if .wm_meta.json is missing
# (143 is the standard share length after Reed-Solomon encoding with 64 FEC symbols)
WATERMARK_DEFAULT_SHARE_LEN = 143
# (153 is 60% of the 255 maximum shares)
WATERMARK_DEFAULT_THRESHOLD = 153

# --- CORS CONFIGURATION ---
# These are the frontend origins that can make requests to this backend
CORS_ORIGINS = [
    "http://localhost:5173",      # Vite default dev port
    "http://127.0.0.1:5173",      # Loopback variant
]


# --- LOGGING ---

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# --- DEBUG MODE ---

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

