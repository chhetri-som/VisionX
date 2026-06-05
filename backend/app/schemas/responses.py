import json
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple


class FaceResult(BaseModel):
    face_index: int = Field(..., description="0-based index (MediaPipe detection order)")

    # ── Classification ────────────────────────────────────────────────────────
    confidence: float = Field(..., ge=0, le=1,
        description="EfficientNet score [0-1]; 1 = highly likely synthetic")
    label: str = Field(..., pattern="^(real|uncertain|fake)$",
        description="'real' | 'uncertain' | 'fake'")
    findings: List[str] = Field(...,
        description="2-3 plain-language descriptions of the classifier result")
    reasoning: Optional[str] = Field(None,
        description="The <think> block reasoning extracted from the VLM for chat context")
    # ── MediaPipe structural data ─────────────────────────────────────────────
    landmarks: Optional[List[Tuple[int, int]]] = Field(
        None, description="468 facial landmark points, absolute pixel coords")
    bbox: List[int] = Field(...,
        description="Face bounding box [x_min, y_min, x_max, y_max] (20% padded)")
    face_confidence: Optional[float] = Field(
        None, ge=0, le=1, description="MediaPipe detection confidence score")
    landmarker_data: Optional[Dict[str, Any]] = Field(
        None, description="Raw structural measurements from MediaPipe")


class AnalyzeResponse(BaseModel):
    # ── Detection ────────────────────────────────────────────────────────────
    face_detected: bool = Field(...,
        description="Whether at least one face was detected")
    face_count: int = Field(0, ge=0,
        description="Total number of faces detected in the image")

    # ── Per-face results ──────────────────────────────────────────────────────
    faces: List[FaceResult] = Field(default_factory=list,
        description="Classification result for each detected face")

    # ── Metadata ──────────────────────────────────────────────────────────────
    execution_time_ms: Optional[int] = Field(None, ge=0)
    model_details: Optional[Dict[str, str]] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "face_detected": True,
                "face_count": 2,
                "faces": [
                    {
                        "face_index": 0,
                        "confidence": 0.72,
                        "label": "fake",
                        "findings": [
                            "Classifier score 72.0% exceeds the manipulation threshold (60%)",
                            "EfficientNet-B0 found texture and frequency patterns consistent with synthetic image generation",
                            "Corroborate with additional forensic tools before drawing conclusions",
                        ],
                        "reasoning": "The facial geometry appears to be mid as fucc",
                        "landmarks": [[100, 150], [102, 148]],
                        "bbox": [80, 120, 200, 240],
                        "face_confidence": 0.95,
                        "landmarker_data": {
                            "eye_analysis": {
                                "eye_distance_px": 84.2,
                                "eye_vertical_offset_px": 3.1,
                                "eye_asymmetry_percent": 3.68,
                            },
                            "mouth_analysis": {
                                "mouth_width_px": 52.0,
                                "mouth_height_px": 18.0,
                                "mouth_ratio": 0.346,
                            },
                            "face_quality": {
                                "landmark_count": 468,
                                "completeness_percent": 100.0,
                                "landmark_variance": 2840.5,
                            },
                        },
                    }
                ],
                "execution_time_ms": 210,
                "model_details": {
                    "face_model": "MediaPipe Face Landmarker v1",
                    "image_model": "EfficientNet-B0 INT8",
                },
                "error": None,
            }
        }


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: str = Field(..., pattern="^(ok|error)$")
    models_loaded: bool
    face_model: str
    image_model: str
    audio_model: str
    execution_provider: str
    version: str

class ChatMessage(BaseModel):
    role: str = Field(..., description="'system', 'user', or 'assistant'")
    content: str = Field(..., description="The message text or thinking block")

class ChatInferenceResponse(BaseModel):
    reply: str = Field(..., description="The VLM's markdown text/thinking response")
    execution_time_ms: Optional[int] = Field(None, ge=0)
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "reply": "<think>Gabagool</think>",
                "execution_time_ms": 4200,
                "error": None
            }
        }

# ── Forensics ─────────────────────────────────────────────────────────────────

class ForensicSignal(BaseModel):
    """A single forensic analysis signal with structured verdict."""
    id: str = Field(..., description="Signal identifier: metadata | ela | noise | frequency")
    label: str = Field(..., description="Human-readable signal name")
    severity: str = Field(..., pattern="^(clean|suspicious|anomalous|acceptable)$")
    score: int = Field(..., ge=0, le=100, description="Risk score 0–100")
    summary: str = Field(..., description="One-line human-readable verdict")
    detail: str = Field(..., description="Technical breakdown of the signal")
    visualization: Optional[str] = Field(
        None, description="data:image/jpeg;base64,... — optional, only present if analysis produced one"
    )
    # metadata-only fields
    raw: Optional[Dict[str, Any]] = Field(None, description="Raw EXIF key-value pairs (metadata signal only)")
    # noise-only fields
    outlier_count: Optional[int] = Field(None, description="Number of outlier grid cells (noise signal only)")


class ForensicVerdict(BaseModel):
    """Aggregate verdict across all forensic signals."""
    label: str = Field(..., description="e.g. 'LIKELY AI / DEEPFAKE'")
    confidence: str = Field(..., pattern="^(high|medium|low)$")
    color: str = Field(..., pattern="^(green|amber|red)$")
    signals_flagged: int = Field(..., ge=0)
    signals_total: int = Field(..., ge=0)
    composite_score: float = Field(..., ge=0, le=100)


class ForensicsResponse(BaseModel):
    """Response for POST /image/forensics."""
    filename: str
    signals: List[ForensicSignal]
    verdict: ForensicVerdict

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "test.jpg",
                "signals": [
                    {
                        "id": "metadata",
                        "label": "Metadata (EXIF)",
                        "severity": "anomalous",
                        "score": 88,
                        "summary": "No metadata found — strong AI/synthetic signal.",
                        "detail": "Authentic camera photos almost always contain EXIF metadata.",
                        "visualization": None,
                        "raw": {},
                        "outlier_count": None,
                    }
                ],
                "verdict": {
                    "label": "LIKELY AI / DEEPFAKE",
                    "confidence": "high",
                    "color": "red",
                    "signals_flagged": 3,
                    "signals_total": 4,
                    "composite_score": 72.5,
                },
            }
        }

class AudioAnalysisResponse(BaseModel):
    """ Response for POST /audio/analyze"""

    filename: str = Field(..., description="Name of the uploaded audio file")
    duration_seconds: float = Field(..., ge=0, description="Total audio duration in seconds")

    # Classification
    confidence: float = Field(..., ge=0, le=1,
        description="Model score [0-1]; 1 = highly likely synthetic")
    label: str = Field(..., pattern="^(real|uncertain|fake)$",
        description="'real' | 'uncertain' | 'fake'")
    findings: List[str] = Field(...,
        description="2-3 plan language descriptions of the classifier result")

    # Segment results
    segments: List[Dict[str, Any]] = Field(default_factory=list,
        description="Per-segment classification results")
    
    # Metadata
    execution_time_ms: Optional[int] = Field(None, ge=0)
    model_details: Optional[Dict[str, str]] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "test.mp3",
                "duration_seconds": 45.2,
                "confidence": 0.87,
                "label": "fake",
                "findings": [
                    "Classifier score 87 percent exceeds manipulation threshold (60%)",
                    "Audio features consistent with speech synthesis patterns",
                    "Recommend corroboration with additional forensic analysis",
                ],
                "segments": [
                    {
                        "segment_index": 0,
                        "start_time": 0.0,
                        "end_time": 3.0,
                        "confidence": 0.89,
                    }
                ],
                "execution_time_ms": 1240,
                "model_details": {
                    "audio_model": "Audio CNN INT8"
                },
                "error": None
            }
        }

class AudioForensicsResponse(BaseModel):
    """Response for POST /audio/forensics"""
    filename: str
    duration_seconds: float
    signals: List[ForensicSignal]
    verdict: ForensicVerdict

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "test.mp3",
                "duration_seconds": 45.2,
                "signals": [
                    {
                        "id": "spectral",
                        "label": "Spectral Analysis",
                        "severity": "anamalous",
                        "score": 72,
                        "summary": "Spectral anomalies detected - consistent with synthetic speech.",
                        "detail": "Unnatural frequency patterns at 2.5kHz and harmonic inconsistencies.",
                        "visualization": None,
                    }
                ],
                "verdict": {
                    "label": "LIKELY AI / DEEPFAKE",
                    "confidence": "high",
                    "color": "red",
                    "signals_flagged": 2,
                    "signals_total": 5,
                    "composite_score": 78.0,
                },
            }
        }


class FrameResult(BaseModel):
    """Classification result for a single video frame."""
    frame_index: int = Field(..., description="0-based frame number in video")
    timestamp_seconds: float = Field(..., ge=0, description="Timestamp in seconds")
    confidence: float = Field(..., ge=0, le=1,
        description="VLM score [0-1]; 1 = highly likely synthetic")
    label: str = Field(..., pattern="^(real|uncertain|fake)$",
        description="'real' | 'uncertain' | 'fake'")
    findings: List[str] = Field(...,
        description="2-3 plain-language descriptions of the classifier result")
    reasoning: Optional[str] = Field(None,
        description="The <think> block reasoning extracted from the VLM")
    image_base64: Optional[str] = Field(None,
        description="Base64-encoded JPEG frame for visualization")


class VideoAnalyzeResponse(BaseModel):
    """Response for POST /analyze/video."""
    face_detected: bool = Field(...,
        description="Whether at least one face was detected")
    frames_analyzed: int = Field(..., ge=0,
        description="Number of valid face frames extracted and analyzed")
    aggregate_confidence: float = Field(..., ge=0, le=1,
        description="Average confidence score across all frames")
    label: str = Field(..., pattern="^(real|uncertain|fake)$",
        description="Aggregate classification label")
    aggregate_events: List[str] = Field(...,
        description="Consolidated findings across all frames")
    aggregate_reasoning: str = Field(...,
        description="Aggregated reasoning from the VLM")
    frame_details: List[FrameResult] = Field(default_factory=list,
        description="Per-frame classification results with base64 images")
    execution_time_ms: Optional[int] = Field(None, ge=0)
    model_details: Optional[Dict[str, str]] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "face_detected": True,
                "frames_analyzed": 45,
                "aggregate_confidence": 0.78,
                "label": "fake",
                "aggregate_events": [
                    "Consistent deep fake signals detected across 78% of frames",
                    "Facial inconsistencies and warping patterns detected",
                    "VLM analysis indicates high probability of synthetic manipulation"
                ],
                "aggregate_reasoning": "The video shows consistent signs of synthetic generation with smooth interpolation artifacts",
                "frame_details": [
                    {
                        "frame_index": 0,
                        "timestamp_seconds": 0.0,
                        "confidence": 0.75,
                        "label": "fake",
                        "findings": [
                            "Classifier score 75% exceeds manipulation threshold (60%)",
                            "Frame shows digital artifacts consistent with face synthesis"
                        ],
                        "reasoning": "Facial geometry appears artificially smooth",
                        "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    }
                ],
                "execution_time_ms": 8500,
                "model_details": {
                    "face_model": "MediaPipe Face Landmarker v1",
                    "video_model": "Qwen3-VL-4B-Thinking (4-bit)"
                },
                "error": None
            }
        }


class WatermarkDetectResponse(BaseModel):
    """Response for POST /watermark/detect."""
    status: str = Field(..., pattern="^(verified|unverified)$",
        description="'verified' if watermark found and signature valid, 'unverified' otherwise")
    message: Optional[str] = Field(None,
        description="Error or status message when verification fails")
    metadata: Optional[Dict[str, Any]] = Field(None,
        description="Extracted watermark payload (creator_id, model_id, timestamp, video_hash)")
    frames_analyzed: Optional[str] = Field(None,
        description="Frames used vs total analyzed (e.g. '180/240')")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "verified",
                "metadata": {
                    "creator_id": "visionx_system",
                    "model_id": "visionx_local_inference",
                    "timestamp": "2026-06-05T14:30:00.123456",
                    "video_hash": "sha256_hash_value"
                },
                "frames_analyzed": "180/240",
                "message": None
            }
        }


class WatermarkEmbedResponse(BaseModel):
    """Documentation for POST /watermark/embed (returns file download)."""
    filename: str = Field(...,
        description="Watermarked output filename (.mkv format)")
    format: str = Field(..., pattern="^mkv$",
        description="Output format (Matroska container)")
    lossless: bool = Field(True,
        description="Whether the watermarking process is lossless")
    
    class Config:
        json_schema_extra = {
            "example": {
                "filename": "watermarked_video_20260605_143000.mkv",
                "format": "mkv",
                "lossless": True
            }
        }