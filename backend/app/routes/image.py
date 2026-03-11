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
from app.services.image_forensics.forensics import ForensicsService
from app.services.image_forensics.cfa_analysis import CFAAnalyzer
from app.services.image_forensics.fft_analysis import FFTAnalyzer
from app.core.logging_config import get_logger
from app.core.config import MAX_IMAGE_SIZE_MB

logger = get_logger(__name__)
router = APIRouter()

# loaded from main.py at startup
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

    Pipeline behavior:
    - Always runs EXIF metadata analysis
    - If face detected: runs ELA, CFA, FFT
    - If no face detected: skips image-dependent analyses (only metadata)

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

        # ── Step 1: Decode image for face detection ──────────────────────────────────
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image_array is None or image_array.size == 0:
            raise HTTPException(status_code=400, detail="Failed to decode image.")

        # ── Step 2: Auto-detect faces in image ────────────────────────────────────────
        logger.info("Auto-detecting faces for forensics analysis...")
        detection = face_detector.detect(image_array)
        faces_detected = detection.get("detected", False)
        face_count = detection.get("face_count", 0)

        if faces_detected and face_count > 0:
            logger.info(f"Face detection: {face_count} face(s) detected")
            # Use the first (primary) face for forensics
            primary_face = detection["faces"][0]
            h, w = image_array.shape[:2]
            
            # Convert pixel bbox to normalized coordinates for ELA
            bbox_pixel = primary_face.get("bbox", [0, 0, w, h])
            if len(bbox_pixel) >= 4:
                bbox = {
                    "x1": bbox_pixel[0] / w,
                    "y1": bbox_pixel[1] / h,
                    "x2": bbox_pixel[2] / w,
                    "y2": bbox_pixel[3] / h,
                }
            else:
                bbox = None
            run_full_pipeline = True
        else:
            logger.info("No face detected — skipping image-dependent forensic analyses")
            bbox = None
            run_full_pipeline = False

        logger.info("Starting forensic analysis pipeline...")
        
        # ── Always run EXIF metadata analysis ──────────────────────────────────────────
        logger.info("Running EXIF metadata analysis...")
        exif_result = ForensicsService.score_exif(image_bytes)
        logger.info(f"EXIF analysis completed - score: {exif_result.get('score', 'N/A')}, severity: {exif_result.get('severity', 'N/A')}")

        signals = [
            {"id": "metadata", "label": "Metadata (EXIF)", **exif_result},
        ]

        # ── Conditional: Run remaining analyses only if faces detected ─────────────────
        if run_full_pipeline:
            logger.info("Running Error Level Analysis (ELA)...")
            ela_result = ForensicsService.regional_ela(image_bytes, bbox, quality=90, face_detector=face_detector)
            logger.info(f"ELA analysis completed - score: {ela_result.get('score', 'N/A')}, severity: {ela_result.get('severity', 'N/A')}")
            
            logger.info("Running Color Filter Array (CFA) noise analysis...")
            # use per-face FCA analysis when bbox is available
            if has_face and bbox:
                cfa_result = CFAAnalyzer.analyze_face_region(image_bytes, bbox)
                logger.info(f"CFA analysis (face region) completed - score: {cfa_result.get('score', 'N/A')}, severity: {cfa_result.get('severity', 'N/A')}")
            else:
                # fallback to whole image analysis is no face detected
                cfa_result = CFAAnalyzer.analyze(image_bytes)
                logger.info(f"CFA analysis (full image) completed - score: {cfa_result.get('score', 'N/A')}, severity: {cfa_result.get('severity', 'N/A')}")
            
            logger.info("Running Fast Fourier Transform (FFT) frequency analysis...")
            fft_result = FFTAnalyzer.analyze(image_bytes, bbox=bbox if has_face else None)
            logger.info(f"FFT analysis completed - score: {fft_result.get('score', 'N/A')}, severity: {fft_result.get('severity', 'N/A')}")

            signals.extend([
                {"id": "ela",       "label": "Compression Analysis (ELA)", **ela_result},
                {"id": "noise",     "label": "Sensor Noise (CFA)",         **cfa_result},
                {"id": "frequency", "label": "Frequency Spectrum (FFT)",   **fft_result},
            ])
        else:
            logger.info("Skipping ELA, CFA, FFT — no face detected to anchor analysis")

        logger.info(f"Forensic analyses completed. Total signals: {len(signals)}")

        # --- Aggregate verdict ---
        flagged   = [s for s in signals if s["severity"] != "clean"]
        anomalous = [s for s in signals if s["severity"] == "anomalous"]

        # Adjust weighting based on available signals
        exif_signal = next((s for s in signals if s["id"] == "metadata"), None)
        exif_missing = exif_signal and exif_signal.get("raw") == {}
        
        # Calculate weighted composite score
        if run_full_pipeline:
            # Full pipeline: all 4 signals
            if exif_missing:
                weights = {"metadata": 0.1, "ela": 0.3, "noise": 0.3, "frequency": 0.3}
            else:
                weights = {"metadata": 0.25, "ela": 0.25, "noise": 0.25, "frequency": 0.25}
        else:
            # Metadata-only: single signal, weight = 1.0
            weights = {"metadata": 1.0}
        
        composite_score = round(sum(s["score"] * weights.get(s["id"], 0) for s in signals), 1)
        
        logger.info(f"Verdict calculation - flagged signals: {len(flagged)}, anomalous signals: {len(anomalous)}, composite_score: {composite_score}")

        # --- Verdict logic ---
        if not run_full_pipeline:
            # For metadata-only, be more conservative
            if composite_score >= 70:
                verdict_label = "LIKELY AI / DEEPFAKE"
                verdict_confidence = "high"
                verdict_color = "red"
            elif composite_score >= 40:
                verdict_label = "SUSPICIOUS — REVIEW CAREFULLY"
                verdict_confidence = "medium"
                verdict_color = "amber"
            else:
                verdict_label = "LIKELY AUTHENTIC"
                verdict_confidence = "high" if composite_score < 20 else "medium"
                verdict_color = "green"
        else:
            # Full pipeline verdict
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