"""
FindingsEngine: Generates human-readable findings by mapping 14x14 saliency 
grids to specific facial regions.
"""
import numpy as np
from typing import List, Tuple, Dict

class FindingsEngine:
    """
    Analyzes confidence scores and spatial saliency data to produce 
    diagnostic strings.
    """

    # Thresholds for classification labels
    REAL_THRESHOLD = 0.3
    UNCERTAIN_THRESHOLD = 0.6

    def __init__(self):
        # Define facial regions on a 14x14 grid
        # Format: (y_start, y_end, x_start, x_end)
        self.REGIONS = {
            "Forehead & Hairline": (0, 4, 0, 14),
            "Eye Region": (4, 7, 2, 12),
            "Cheeks & Nose": (7, 10, 3, 11),
            "Mouth & Jawline": (10, 14, 2, 12)
        }

    def generate_findings(self, confidence: float, heatmap_data: List[List[float]]) -> Tuple[str, List[str]]:
        """
        Main entry point for generating results.
        
        Returns:
            label: "real", "uncertain", or "fake"
            findings: List of strings describing the analysis
        """
        findings = []
        label = self._get_label(confidence)
        heatmap_np = np.array(heatmap_data)

        # 1. Base findings based on confidence level
        if label == "fake":
            findings.append("❌ High probability of synthetic manipulation")
            findings.append("❌ Texture patterns consistent with AI generation")
        elif label == "uncertain":
            findings.append("⚠️ Analysis inconclusive: subtle anomalies detected")
            findings.append("ℹ️ Reviewing specific facial regions for clarification")
        else:
            findings.append("✅ Facial features appear consistent and natural")

        # 2. Spatial Analysis: Which regions triggered the model?
        region_scores = self._analyze_regions(heatmap_np)
        
        # Sort regions by importance (descending)
        top_regions = sorted(region_scores.items(), key=lambda x: x[1], reverse=True)

        for region_name, score in top_regions:
            if score > 0.6:  # Significant trigger
                prefix = "❌" if label == "fake" else "⚠️"
                findings.append(f"{prefix} Strong artifacts detected in {region_name}")
            elif score > 0.3 and label != "real":
                findings.append(f"ℹ️ Minor inconsistencies found in {region_name}")

        # 3. Global Saliency Check
        high_saliency_ratio = np.sum(heatmap_np > 0.5) / heatmap_np.size
        if high_saliency_ratio > 0.4:
            findings.append("⚠️ Artifacts are widespread across the entire face")

        return label, findings

    def _get_label(self, confidence: float) -> str:
        if confidence < self.REAL_THRESHOLD:
            return "real"
        if confidence < self.UNCERTAIN_THRESHOLD:
            return "uncertain"
        return "fake"

    def _analyze_regions(self, heatmap: np.ndarray) -> Dict[str, float]:
        """Calculates the average importance score for predefined facial areas."""
        results = {}
        for region_name, (y1, y2, x1, x2) in self.REGIONS.items():
            # Slice the 14x14 grid
            region_crop = heatmap[y1:y2, x1:x2]
            if region_crop.size > 0:
                results[region_name] = float(np.mean(region_crop))
        return results

    def get_confidence_description(self, confidence: float) -> str:
        """Helper for UI tooltips."""
        if confidence > 0.9: return "Highly likely to be a Deepfake"
        if confidence > 0.7: return "Likely manipulated"
        if confidence > 0.4: return "Potential artifacts detected"
        return "Appears authentic"