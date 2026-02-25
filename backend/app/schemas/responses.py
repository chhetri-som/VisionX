# backend/app/schemas/responses.py
"""
Response models for VisionX API
Uses Pydantic for validation and automatic OpenAPI documentation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AnalyzeResponse(BaseModel):
    """
    Response for POST /analyze/image endpoint.
    
    Fields are optional to handle both success and error cases.
    """
    
    # Core results
    face_detected: bool = Field(
        ...,
        description="Whether a face was detected in the image"
    )
    
    confidence: Optional[float] = Field(
        None,
        ge=0,
        le=1,
        description="Confidence score (0-1) where 1 = definitely fake. None if no face detected."
    )
    
    label: Optional[str] = Field(
        None,
        description="Classification label: 'real', 'uncertain', or 'fake'. None if no face detected.",
        pattern="^(real|uncertain|fake)$"
    )
    
    # Findings
    findings: Optional[List[str]] = Field(
        None,
        description="Human-readable findings about why the image was classified as real or fake"
    )
    
    # Heatmap
    heatmap_data: Optional[List[List[float]]] = Field(
        None,
        description="2D array of saliency scores (0-1) showing which regions influenced the classification"
    )
    
    # Metadata
    execution_time_ms: Optional[int] = Field(
        None,
        ge=0,
        description="Time taken to analyze image in milliseconds"
    )
    
    model_details: Optional[Dict[str, str]] = Field(
        None,
        description="Information about the models used"
    )
    
    # Error handling
    error: Optional[str] = Field(
        None,
        description="Error message if analysis failed"
    )
    
    class Config:
        # Example response in OpenAPI docs
        json_schema_extra = {
            "example": {
                "face_detected": True,
                "confidence": 0.87,
                "label": "uncertain",
                "findings": [
                    "🔴 Unnatural skin texture around jaw",
                    "🟢 Eyes appear symmetrical",
                    "🔴 Hair boundary blending artifacts detected",
                    "🟢 Facial features appear consistent"
                ],
                "heatmap_data": [
                    [0.1, 0.2, 0.15, 0.05],
                    [0.3, 0.8, 0.7, 0.2],
                    [0.1, 0.5, 0.6, 0.3],
                    [0.05, 0.1, 0.15, 0.05]
                ],
                "execution_time_ms": 145,
                "model_details": {
                    "face_model": "MediaPipe Face Landmarker v1",
                    "deepfake_model": "EfficientNet-B0 (FaceForensics+ trained, INT8)"
                },
                "error": None
            }
        }


class ErrorResponse(BaseModel):
    """HTTP error response."""
    detail: str = Field(..., description="Error message")


class HealthResponse(BaseModel):
    """Response for GET /health endpoint."""
    status: str = Field(
        ...,
        description="Health status: 'ok' or 'error'",
        pattern="^(ok|error)$"
    )
    models_loaded: bool = Field(..., description="Whether all models are loaded")
    face_model: str = Field(..., description="Face detection model name")
    deepfake_model: str = Field(..., description="Deepfake classification model name")
    execution_provider: str = Field(
        ...,
        description="ONNX Runtime execution provider (CPU or CUDA)"
    )
    version: str = Field(..., description="API version")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "models_loaded": True,
                "face_model": "MediaPipe Face Landmarker v1",
                "deepfake_model": "EfficientNet-B0 INT8",
                "execution_provider": "CPU",
                "version": "1.0.0"
            }
        }
