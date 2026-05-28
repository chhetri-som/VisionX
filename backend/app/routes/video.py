from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import time
from app.core.logging_config import get_logger
from app.core.config import MAX_VIDEO_SIZE_MB
from app.dependencies import (
    get_face_detector, get_video_classifier, 
    get_video_findings_engine, get_video_preprocessor
)

logger = get_logger(__name__)
router = APIRouter()

@router.post("/analyze/video")
async def analyze_video(
    video: UploadFile = File(...),
    face_detector = Depends(get_face_detector),
    video_classifier = Depends(get_video_classifier),
    findings_engine = Depends(get_video_findings_engine),
    video_preprocessor = Depends(get_video_preprocessor)
):
    start_time = time.time()
    logger.info(f"/analyze/video filename={video.filename} content_type={video.content_type}")

    try:
        contents = await video.read()
        file_size_mb = len(contents) / (1024 * 1024)
        
        if file_size_mb > MAX_VIDEO_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"Video exceeds {MAX_VIDEO_SIZE_MB}MB limit.")

        logger.info("Extracting frames and detecting faces...")
        # Call as an instance method now
        frame_data_list = video_preprocessor.extract_face_frames(contents, face_detector)
        
        if not frame_data_list:
            logger.info("/analyze/video: No faces detected in video")
            return {
                "face_detected": False,
                "frames_analyzed": 0,
                "error": "No faces detected in the video or faces were too small.",
                "execution_time_ms": int((time.time() - start_time) * 1000)
            }

        logger.info(f"Extracted {len(frame_data_list)} valid face frames for inference.")

        avg_confidence, agg_reasoning, frame_results = video_classifier.classify_frames(frame_data_list)

        label, events = findings_engine.generate_findings(avg_confidence)

        execution_time = int((time.time() - start_time) * 1000)
        logger.info(f"/analyze/video success execution_time_ms={execution_time}")

        return {
            "face_detected": True,
            "frames_analyzed": len(frame_results),
            "aggregate_confidence": round(avg_confidence, 3),
            "label": label,
            "aggregate_events": events,
            "aggregate_reasoning": agg_reasoning,
            "frame_details": frame_results,
            "execution_time_ms": execution_time,
            "model_details": {
                "face_model": "MediaPipe Face Landmarker v1",
                "video_model": "Qwen3-VL-4B-Thinking (4-bit)",
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /analyze/video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error analyzing video.")

