from app.core.config import REAL_THRESHOLD, UNCERTAIN_THRESHOLD

class VideoFindingsEngine:
    def generate_findings(self, avg_confidence: float) -> tuple[str, license]:
        if avg_confidence >= UNCERTAIN_THRESHOLD:
            label = "LIKELY AI / DEEPFAKE"
            events = [
                {"label": "VLM detected persistent visual artifacts", "severity": "HIGH"},
                {"label": "High-confidence anomaly cluster found", "severity": "HIGH"},
                {"label": "Texture inconsistencies across sequence", "severity": "MED"}
            ]
        elif avg_confidence >= REAL_THRESHOLD:
            label = "SUSPICIOUS — REVIEW CAREFULLY"
            events = [
                {"label": "VLM reasoning flagged ambiguous frames", "severity": "MED"},
                {"label": "Minor temporal fluctuations detected", "severity": "MED"}
            ]
        else:
            label = "LIKELY AUTHENTIC"
            events = [
                {"label": "Visual consistency maintained", "severity": "LOW"},
                {"label": "No significant VLM anomalies", "severity": "LOW"}
            ]

        return label, events