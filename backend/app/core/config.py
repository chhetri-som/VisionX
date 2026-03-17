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

# Deepfake classification model (ONNX)
IMAGE_MODEL_PATH = os.getenv(
    'IMAGE_MODEL_PATH',
    str(BASE_DIR / 'app' / 'models' / 'dummy_image_classifier.onnx')
)

# Audio ML model (ONNX)
AUDIO_MODEL_PATH = os.getenv(
    'AUDIO_MODEL_PATH',
    str(BASE_DIR / 'app' / 'models' / 'dummy_audio_classifier.onnx')
)
AUDIO_TARGET_SR = 16000 # sample rate in Hz
AUDIO_SEGMENT_LENGTH = 3.0 # seconds
AUDIO_SEGMENT_OVERLAP = 0.5 # 50% overlap

# --- CONFIDENCE THRESHOLDS ---
# if confidence < REAL_THRESHOLD -> real
REAL_THRESHOLD = 0.3
# confidence < UNCERTAIN_THRESHOLD -> uncertain
UNCERTAIN_THRESHOLD = 0.6
# if greater than 0.6 -> fake

# --- API SETTINGS ---
API_TITLE = "VisionX"
API_VERSION = "1.0.0"

# Maximum image file size (in MB)
MAX_IMAGE_SIZE_MB = 10

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

if __name__ == "__main__":
    # Print config summary when run directly
    print("VisionX Configuration")
    print("=" * 60)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Face Model Path: {FACE_LANDMARKER_PATH}")
    print(f"Image Model Path: {IMAGE_MODEL_PATH}")
    print(f"Audio Model Path: {AUDIO_MODEL_PATH}")
    print(f"Max Image Size: {MAX_IMAGE_SIZE_MB} MB")
    print(f"CORS Origins: {CORS_ORIGINS}")
    print("=" * 60)
