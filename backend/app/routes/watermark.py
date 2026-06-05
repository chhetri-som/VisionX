import os
import shutil
from tempfile import NamedTemporaryFile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from datetime import datetime
from dataclasses import asdict

from app.schemas.responses import WatermarkDetectResponse, WatermarkEmbedResponse
from app.services.watermark.common import KeyPair, WatermarkPayload
from app.services.watermark.embedder import embed_watermark
from app.services.watermark.detector import detect_watermark
from app.core.config import (
    WATERMARK_KEYS_DIR,
    WATERMARK_DEFAULT_SHARE_LEN,
    WATERMARK_DEFAULT_THRESHOLD,
    WATERMARK_DEFAULT_SECRET_LEN,
    WATERMARK_STRENGTH,
    WATERMARK_MAX_SHARES
)

DOWNLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "downloads")
router = APIRouter()

def get_or_create_keys() -> KeyPair:
    if not os.path.exists(os.path.join(WATERMARK_KEYS_DIR, "private_key.pem")):
        os.makedirs(WATERMARK_KEYS_DIR, exist_ok=True)
        keys = KeyPair.generate()
        keys.save(WATERMARK_KEYS_DIR)
        return keys
    return KeyPair.load(WATERMARK_KEYS_DIR)

def cleanup_temp_file(file_path: str):
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

@router.post("/watermark/embed")
async def embed_video_watermark(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    creator_id: str = Form("visionx_system"),
    model_id: str = Form("visionx_local_inference"),
    strength: float = Form(WATERMARK_STRENGTH)
):
    """
    Embeds a secure, invisible temporal watermark into the uploaded video.
    Returns the lossless watermarked .mkv video.
    """
    if not file.filename.endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Unsupported video format.")

    keys = get_or_create_keys()
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    
    with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_input:
        shutil.copyfileobj(file.file, temp_input)
        input_path = temp_input.name

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_filename = os.path.splitext(file.filename)[0]
    downloads_output_path = os.path.join(DOWNLOADS_DIR, f"{base_filename}_{timestamp}_watermarked.mkv")

    payload = WatermarkPayload(
        creator_id=creator_id,
        model_id=model_id,
        timestamp=datetime.now().isoformat(),
        video_hash=""
    )

    try:
        embed_result = embed_watermark(
            input_path=input_path,
            output_path=downloads_output_path,
            payload=payload,
            keys=keys,
            strength=strength
        )
        
        background_tasks.add_task(cleanup_temp_file, input_path)

        return FileResponse(
            path=downloads_output_path,
            media_type="video/x-matroska",
            filename=f"watermarked_{file.filename}.mkv"
        )
    except Exception as e:
        cleanup_temp_file(input_path)
        cleanup_temp_file(downloads_output_path)
        meta_fallback = downloads_output_path.rsplit(".", 1)[0] + ".wm_meta.json"
        cleanup_temp_file(meta_fallback)
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")

@router.post("/watermark/detect", response_model=WatermarkDetectResponse)
async def detect_video_watermark(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    meta_file: UploadFile = File(None)
):
    """
    Scans a video for a temporal watermark and extracts the signed forensic metadata.
    Accepts an optional metadata JSON file for robust dynamic thresholding.
    Falls back to strict config defaults if the meta file is missing.
    """
    keys = get_or_create_keys()

    with NamedTemporaryFile(delete=False, suffix=".mkv") as temp_input:
        shutil.copyfileobj(file.file, temp_input)
        input_path = temp_input.name

    meta_path = None
    if meta_file:
        with NamedTemporaryFile(delete=False, suffix=".wm_meta.json") as temp_meta:
            shutil.copyfileobj(meta_file.file, temp_meta)
            meta_path = temp_meta.name

    try:
        # Pass defaults safely when meta_path is None
        result = detect_watermark(
            video_path=input_path,
            keys=keys,
            meta_path=meta_path,
            share_len=WATERMARK_DEFAULT_SHARE_LEN if not meta_path else None,  
            threshold=WATERMARK_DEFAULT_THRESHOLD if not meta_path else None,
            secret_len=WATERMARK_DEFAULT_SECRET_LEN if not meta_path else None
        )

        background_tasks.add_task(cleanup_temp_file, input_path)
        if meta_path:
            background_tasks.add_task(cleanup_temp_file, meta_path)

        if not result["verified"]:
            return WatermarkDetectResponse(
                status="unverified",
                message=result.get("error", "Watermark missing, corrupted, or forged.")
            )

        return WatermarkDetectResponse(
            status="verified",
            metadata=asdict(result["payload"]),
            frames_analyzed=f"{result['frames_used']}/{result['frames_total']}"
        )

    except Exception as e:
        cleanup_temp_file(input_path)
        if meta_path:
            cleanup_temp_file(meta_path)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")