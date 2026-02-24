# backend/app/core/config.py
"""
VisionX Configuration
- Model paths
- API settings
- CORS configuration
- Inference parameters
"""

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
DEEPFAKE_MODEL_PATH = os.getenv(
    'DEEPFAKE_MODEL_PATH',
    str(BASE_DIR / 'app' / 'models' / 'dummy.onnx')
)

# --- CONFIDENCE THRESHOLDS ---
# If confidence >= this, classify as "fake"
CONFIDENCE_FAKE_THRESHOLD = 0.5

# If confidence >= this, it's HIGH confidence in fake
CONFIDENCE_HIGH_THRESHOLD = 0.7

# --- API SETTINGS ---
API_TITLE = "VisionX"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Privacy-first static image deepfake detector"

# Maximum image file size (in MB)
MAX_IMAGE_SIZE_MB = 10

# --- CORS CONFIGURATION ---
# These are the frontend origins that can make requests to this backend
CORS_ORIGINS = [
    "http://localhost:3000",      # Alternative React dev port
    "http://localhost:5173",      # Vite default dev port
    "http://127.0.0.1:5173",      # Loopback variant
    "http://127.0.0.1:3000",
]

# When deploying to production, add your domain:
# "https://visionx.example.com",
# "https://app.example.com",

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]
CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]


# --- SALIENCY MAPPING CONFIGURATION ---

# Size of patches to mask during occlusion sensitivity (pixels)
# 16×16: More detailed (5-10s per image)
# 24×24: Balanced (2-3s per image)
# 32×32: Faster (1-2s per image)
SALIENCY_PATCH_SIZE = 24  # You chose: accuracy over speed

# Enable/disable saliency for quick testing
SALIENCY_ENABLED = True


# --- LOGGING ---

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')


# --- DATABASE / STORAGE (Not used in v1, but good to have) ---

# In v1, all processing is transient (no storage)
# Images are deleted immediately after analysis
STORE_IMAGES = False
STORE_RESULTS = False

# Face Detection
MIN_FACE_SIZE = 50
FACE_PADDING = 0.1


# --- DEBUG MODE ---

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

if __name__ == "__main__":
    # Print config summary when run directly
    print("VisionX Configuration")
    print("=" * 60)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Face Model Path: {FACE_LANDMARKER_PATH}")
    print(f"Deepfake Model Path: {DEEPFAKE_MODEL_PATH}")
    print(f"Saliency Patch Size: {SALIENCY_PATCH_SIZE}×{SALIENCY_PATCH_SIZE}")
    print(f"Max Image Size: {MAX_IMAGE_SIZE_MB} MB")
    print(f"CORS Origins: {CORS_ORIGINS}")
    print("=" * 60)
