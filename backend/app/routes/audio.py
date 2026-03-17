# backend/app/routes/audio.py

from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
from pathlib import Path

from app.schemas.responses import AudioAnalysisResponse, AudioForensicsResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()

# initialized in main.py
audio_preprocessor = None
audio_classifier = None

def set_model_instances(ap, ac):
    global audio_preprocessor, audio_classifier
    audio_preprocessor = ap
    audio_classifier = ac

@router.post("/analyze/audio", response_model=AudioAnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    if audio_preprocessor is None or audio_classifier is None:
        raise HTTPException(status_code=503, detail="Audio models not initialized")

    temp_file_path = None
    try:
        # allowed file formats
        allowed_types = ["audio/mpeg", "audio/wav"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Only WAV, MP3, and M4A files are allowed. Received: {file.content_type}")

        logger.info(f"Processing audio file: {file.filename}")
        # store file in temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file_path = tmp.name

        # load and preprocess
        audio_array, sample_rate = audio_preprocessor.load_audio(temp_file_path)
        audio_array = audio_preprocessor.normalize_audio(audio_array)
        audio_array = audio_preprocessor.resample(audio_array, sample_rate)

        duration_seconds = len(audio_array) / audio_preprocessor.target_sr

        # segment audio
        segments = audio_preprocessor.segment_audio(audio_array, audio_preprocessor.target_sr)
        # extract features and classify each segment
        segment_confidences = []
        for segment in segments:
            features = audio_preprocessor.extract_mfcc_features(segment, audio_preprocessor.target_sr)
            confidence = audio_classifier.classify(features)
            segment_confidences.append(confidence)

        # calculate overall confidence
        overall_confidence = sum(segment_confidences) / len(segment_confidences) if segment_confidences else 0.5

        # labels
        if overall_confidence > 0.7:
            label = "fake"
        elif overall_confidence > 0.4:
            label = "uncertain"
        else:
            label = "real"

        # generate findings
        findings = [
            f"Classifier score {overall_confidence*100:.1f}% {'exceeds' if overall_confidence > 0.6 else 'below'} the manipulation threshold (60%)",
            f"Audio features {'consistent with' if label == 'fake' else 'inconsistent with'} synthetic speech patterns",
            "Recommend corroboration with additional forensic tools before drawing conclusions",
        ]

        # build_segment results
        segment_results = []
        for i, conf in enumerate(segment_confidences):
            start_time = i * 3.0
            end_time = min((i + 1) * 3.0, duration_seconds)
            segment_results.append({
                "segment_index": i,
                "start_time": start_time,
                "end_time": end_time,
                "confidence": conf,
            })

        logger.info(f"Audio analysis completed: {file.filename} - {label} ({overall_confidence:.2f}%)")

        return AudioAnalysisResponse(
            filename=file.filename,
            duration_seconds=duration_seconds,
            confidence=overall_confidence,
            label=label,
            findings=findings,
            segments=segment_results,
            execution_time_ms=None,
            model_details={
                "audio_model": "Audio CNN INT8",
            },
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio analysis failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Audio analysis failed: {str(e)}")
    # clean up temp files stored
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temp file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temp file {temp_file_path}: {str(e)}")


@router.post("/audio/forensics", response_model=AudioForensicsResponse)
async def analyze_audio_forensics(file: UploadFile = File(...)):
    if audio_preprocessor is None or audio_classifier is None:
        raise HTTPException(status_code=503, detail="Audio models not loaded")
    
    temp_file_path = None

    try:
        allowed_types = ["audio/mpeg", "audio/wav"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: MP3, WAV, M4A. Received: {file.content_type}")
        logger.info(f"Processing Audio Forensics for: {file.filename}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file_path = tmp.name

        # load and preprocess audio
        audio_array, sample_rate = audio_preprocessor.load_audio(temp_file_path)
        audio_array = audio_preprocessor.normalize_audio(audio_array)
        audio_array = audio_preprocessor.resample(audio_array, sample_rate)

        duration_seconds = len(audio_array) / audio_preprocessor.target_sr

        # segment
        segments =  audio_preprocessor.segment_audio(audio_array, audio_preprocessor.target_sr)

        # extract features and classify each segment
        segment_confidences = []
        for segment in segments:
            features = audio_preprocessor.extract_mfcc_features(segment, audio_preprocessor.target_sr)
            confidence = audio_classifier.classify(features)
            segment_confidences.append(confidence)

        # overall confidence
        overall_confidence = sum(segment_confidences) / len(segment_confidences) if segment_confidences else 0.5

        # determine label
        if overall_confidence > 0.7:
            label = "fake"
        elif overall_confidence > 0.4:
            label = "uncertain"
        else:
            label = "real"


        '''
        PLACEHOLDER LOGIC NEED TO CREATE
        forensics signals: audio_analysis_engine
        '''
        signals = [
            {
                "id": "spectral",
                "label": "Spectral Analysis",
                "severity": "suspicious" if overall_confidence > 0.6 else "clean",
                "score": int(overall_confidence * 100),
                "summary": f"Audio spectral characteristics {'suggest synthetic origin' if overall_confidence > 0.6 else 'appear natural'}",
                "detail": "Analysis of frequency domain patterns",
                "visualization": None,
            },
            {
                "id": "prosody",
                "label": "Prosody Analysis",
                "severity": "suspicious" if overall_confidence > 0.5 else "clean",
                "score": int(overall_confidence * 85),
                "summary": f"Speech patterns {'indicate artificiality' if overall_confidence > 0.5 else 'appear natural'}",
                "detail": "Analysis of pitch, rate, and rhythm",
                "visualization": None,
            },
        ]

        # verdict
        signals_flagged = sum(1 for s in signals if s["severity"] != "clean")
        composite_score = overall_confidence * 100

        if composite_score > 70:
            verdict_label = "LIKELY AI / DEEPFAKE"
            confidence_level = "high"
        elif composite_score > 50:
            verdict_label = "POSSIBLY AI / DEEPFAKE"
            confidence_level = "medium"
        else:
            verdict_label = "LIKELY AUTHENTIC"
            confidence_level = "low"

        if confidence_level == "high":
            color = "red"
        elif confidence_level == "medium":
            color = "amber"
        else:
            color = "green"

        logger.info(f"Forensics analysis complete: {file.filename} - {verdict_label}")

        return AudioForensicsResponse(
            filename=file.filename,
            duration_seconds=duration_seconds,
            signals=signals,
            verdict={
                "label": verdict_label,
                "confidence": confidence_level,
                "color": color,
                "signals_flagged": signals_flagged,
                "signals_total": len(signals),
                "composite_score": composite_score,
            },
        )
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Audio forensics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio forensics analysis failed: {str(e)}")

    finally:
        # temp file cleanup
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temp files: {e}")
