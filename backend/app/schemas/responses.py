# backend/app/schemas/responses.py

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

# ── Forensics ─────────────────────────────────────────────────────────────────

class ForensicSignal(BaseModel):
    """A single forensic analysis signal with structured verdict."""
    id: str = Field(..., description="Signal identifier: metadata | ela | noise | frequency")
    label: str = Field(..., description="Human-readable signal name")
    severity: str = Field(..., pattern="^(clean|suspicious|anomalous)$")
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