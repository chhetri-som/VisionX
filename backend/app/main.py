from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import (
    CORS_ORIGINS, API_TITLE, API_VERSION
)
from app.core.logging_config import setup_logging, get_logger
from app.routes import health, image, audio, video, rishi

setup_logging("INFO")
logger = get_logger(__name__)

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description="Privacy-first static image deepfake detector",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("VisionX Backend Startup")

app.include_router(health.router, tags=["health"])
app.include_router(image.router, tags=["image"])
app.include_router(audio.router, tags=["audio"])
app.include_router(video.router, tags=["video"])
app.include_router(rishi.router, tags=["rishi watermarking"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, log_level="info")
