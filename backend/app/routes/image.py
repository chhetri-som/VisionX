# backend/app/api/routes/image.py
"""
Image analysis endpoint — multi-face edition.
Classifies every detected face and returns a faces[] array.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import cv2
import numpy as np
import time

from app.schemas.responses import AnalyzeResponse, FaceResult, ForensicsResponse
from app.services.forensics import ForensicsService
from app.services.cfa_analysis import CFAAnalyzer
from app.services.fft_analysis import FFTAnalyzer
from app.core.logging_config import get_logger
from app.core.config import MAX_IMAGE_SIZE_MB

logger = get_logger(__name__)
router = APIRouter()

face_detector       = None
deepfake_classifier = None
findings_engine     = None


def set_model_instances(fd, dfc, fe):
    global face_detector, deepfake_classifier, findings_engine
    face_detector       = fd
    deepfake_classifier = dfc
    findings_engine     = fe


@router.post("/analyze/image", response_model=AnalyzeResponse)
async def analyze_image(image: UploadFile = File(...)):
    """
    Analyze uploaded image for deepfakes.
      - Face Detection:  MediaPipe Face Landmarker (up to 4 faces)
      - Classification:  EfficientNet-B0 per face [0-1 confidence]
      - Structural data: MediaPipe geometric measurements per face
    """
    start_time = time.time()
    logger.info(
        f"/analyze/image filename={getattr(image, 'filename', None)} "
        f"content_type={getattr(image, 'content_type', None)}"
    )

    try:
        # ── Validate & decode ─────────────────────────────────────────────
        contents     = await image.read()
        file_size_mb = len(contents) / (1024 * 1024)

        if file_size_mb > MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=400, detail="Image exceeds size limit")

        if image.content_type not in ("image/jpeg", "image/png"):
            raise HTTPException(status_code=400, detail="Invalid file type.")

        nparr       = np.frombuffer(contents, np.uint8)
        image_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image_array is None or image_array.size == 0:
            raise HTTPException(status_code=400, detail="Failed to decode image.")

        # ── Models ready? ─────────────────────────────────────────────────
        if face_detector is None or deepfake_classifier is None or findings_engine is None:
            raise HTTPException(status_code=500, detail="Models not loaded.")

        # ── Face detection ────────────────────────────────────────────────
        detection = face_detector.detect(image_array)

        if not detection.get("detected", False):
            logger.info("/analyze/image: no face detected")
            return AnalyzeResponse(
                face_detected=False,
                face_count=0,
                faces=[],
                error="No face detected.",
            )

        detected_faces = detection["faces"]
        face_count     = detection["face_count"]
        logger.info(f"/analyze/image: {face_count} face(s) detected")

        # ── Per-face classification loop ──────────────────────────────────
        face_results: list[FaceResult] = []

        for idx, face in enumerate(detected_faces):
            bbox      = face["bbox"]
            face_crop = face_detector.crop_face(image_array, bbox)

            if face_crop is None:
                logger.warning(f"Face {idx}: crop failed — skipping")
                continue

            ch, cw = face_crop.shape[:2]
            if ch < 50 or cw < 50:
                logger.warning(f"Face {idx}: too small ({cw}x{ch}) — skipping")
                continue

            # Classify
            face_crop_resized = cv2.resize(face_crop, (224, 224))
            confidence        = float(deepfake_classifier.classify(face_crop_resized))
            confidence        = max(0.0, min(1.0, confidence))

            # Findings + structural metrics
            label, findings, landmarker_data = findings_engine.generate_findings(
                confidence, face
            )

            logger.info(
                f"Face {idx}: confidence={confidence:.4f} label={label}"
            )

            face_results.append(FaceResult(
                face_index      = idx,
                confidence      = round(confidence, 3),
                label           = label,
                findings        = findings,
                landmarks       = face.get("landmarks"),
                bbox            = bbox,
                face_confidence = face.get("confidence"),
                landmarker_data = landmarker_data,
            ))

        # All faces were skipped (too small / crop failed)
        if not face_results:
            return AnalyzeResponse(
                face_detected=True,
                face_count=face_count,
                faces=[],
                error="All detected faces were too small or could not be cropped.",
            )

        execution_time = int((time.time() - start_time) * 1000)
        logger.info(
            f"/analyze/image success faces={len(face_results)} "
            f"execution_time_ms={execution_time}"
        )

        return AnalyzeResponse(
            face_detected     = True,
            face_count        = face_count,
            faces             = face_results,
            execution_time_ms = execution_time,
            model_details     = {
                "face_model":     "MediaPipe Face Landmarker v1",
                "deepfake_model": "EfficientNet-B0 INT8",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")

@router.post("/image/forensics", response_model=ForensicsResponse)
async def analyze_forensics(
    file: UploadFile = File(...),
    # Face bounding box — NORMALISED 0.0–1.0 values sent from the frontend.
    # The frontend should normalise pixel bbox values from your ML model output.
    # If your model returns pixel coords, divide x by image width, y by image height.
    has_face: bool = Form(False),
    face_x1: float = Form(0.0),
    face_y1: float = Form(0.0),
    face_x2: float = Form(1.0),
    face_y2: float = Form(1.0),
):
    """
    Unified digital forensics endpoint.
    Returns structured signals — not raw image blobs — so the frontend can
    present human-readable verdicts with optional expandable visualisations.

    Everything runs strictly in-memory; no files are written to disk.
    """
    logger.info(
        f"/image/forensics filename={getattr(file, 'filename', None)} "
        f"content_type={getattr(file, 'content_type', None)} "
        f"has_face={has_face}"
    )
    
    if has_face:
        logger.info(f"Face bbox coordinates: x1={face_x1:.3f}, y1={face_y1:.3f}, x2={face_x2:.3f}, y2={face_y2:.3f}")
    
    try:
        image_bytes = await file.read()
        file_size_mb = len(image_bytes) / (1024 * 1024)
        logger.info(f"Image size: {file_size_mb:.2f} MB")

        bbox = None
        if has_face:
            bbox = {
                "x1": face_x1,
                "y1": face_y1,
                "x2": face_x2,
                "y2": face_y2,
            }
            logger.debug(f"Face bbox prepared for analysis: {bbox}")

        logger.info("Starting forensic analysis pipeline...")
        
        # Run all four forensic analyses
        logger.debug("Running EXIF metadata analysis...")
        exif_result = ForensicsService.score_exif(image_bytes)
        logger.info(f"EXIF analysis completed - score: {exif_result.get('score', 'N/A')}, severity: {exif_result.get('severity', 'N/A')}")
        
        logger.debug("Running Error Level Analysis (ELA)...")
        ela_result = ForensicsService.regional_ela(image_bytes, bbox)
        logger.info(f"ELA analysis completed - score: {ela_result.get('score', 'N/A')}, severity: {ela_result.get('severity', 'N/A')}")
        
        logger.debug("Running Color Filter Array (CFA) noise analysis...")
        cfa_result = CFAAnalyzer.analyze(image_bytes)
        logger.info(f"CFA analysis completed - score: {cfa_result.get('score', 'N/A')}, severity: {cfa_result.get('severity', 'N/A')}")
        
        logger.debug("Running Fast Fourier Transform (FFT) frequency analysis...")
        fft_result = FFTAnalyzer.analyze(image_bytes)
        logger.info(f"FFT analysis completed - score: {fft_result.get('score', 'N/A')}, severity: {fft_result.get('severity', 'N/A')}")

        signals = [
            {"id": "metadata",  "label": "Metadata (EXIF)",           **exif_result},
            {"id": "ela",       "label": "Compression Analysis (ELA)", **ela_result},
            {"id": "noise",     "label": "Sensor Noise (CFA)",         **cfa_result},
            {"id": "frequency", "label": "Frequency Spectrum (FFT)",   **fft_result},
        ]
        
        logger.info(f"All forensic analyses completed. Total signals: {len(signals)}")

        # --- Aggregate verdict ---
        flagged   = [s for s in signals if s["severity"] != "clean"]
        anomalous = [s for s in signals if s["severity"] == "anomalous"]
        composite_score = round(sum(s["score"] for s in signals) / len(signals), 1)
        
        logger.info(f"Verdict calculation - flagged signals: {len(flagged)}, anomalous signals: {len(anomalous)}, composite_score: {composite_score}")

        if len(anomalous) >= 2 or composite_score >= 68:
            verdict_label = "LIKELY AI / DEEPFAKE"
            verdict_confidence = "high"
            verdict_color = "red"
        elif len(flagged) >= 2 or composite_score >= 38:
            verdict_label = "SUSPICIOUS — REVIEW CAREFULLY"
            verdict_confidence = "medium"
            verdict_color = "amber"
        else:
            verdict_label = "LIKELY AUTHENTIC"
            verdict_confidence = "high" if len(flagged) == 0 else "medium"
            verdict_color = "green"
        
        logger.info(f"Final verdict: {verdict_label} (confidence: {verdict_confidence}, color: {verdict_color})")

        return {
            "filename": file.filename,
            "signals": signals,
            "verdict": {
                "label": verdict_label,
                "confidence": verdict_confidence,
                "color": verdict_color,
                "signals_flagged": len(flagged),
                "signals_total": len(signals),
                "composite_score": composite_score,
            },
        }
    
    except Exception as e:
        logger.error(f"Error in /image/forensics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during forensic analysis.")