# backend/app/services/findings_engine.py
"""
FindingsEngine: Produces classifier verdict text and raw structural
MediaPipe measurements.

Design intent:
  - findings        = plain-language description of what the ML model returned
  - structural_data = raw geometry numbers with no pass/fail interpretation
  - No anomaly flags, no "manipulation indicator" language from geometry
"""
import numpy as np
from typing import List, Tuple, Dict, Optional
from app.core.config import REAL_THRESHOLD, UNCERTAIN_THRESHOLD

class FindingsEngine:

    EXPECTED_LANDMARKS  = 468

    def generate_findings(
        self,
        confidence: float,
        face: Optional[Dict] = None,
    ) -> Tuple[str, List[str], Dict]:
        """
        Args:
            confidence: EfficientNet score [0, 1]
            face:       single face dict from FaceDetector.detect()
                        { 'landmarks': [...], 'bbox': [...], 'confidence': float }

        Returns:
            (label, findings, structural_data)

            label           — "real" | "uncertain" | "fake"
            findings        — 2-3 classifier-verdict strings for the UI
            structural_data — raw MediaPipe measurements, no flags
        """
        label    = self._get_label(confidence)
        findings = self._classifier_findings(label, confidence)

        structural_data: Dict = {}
        raw_landmarks = face.get("landmarks") if face else None
        if raw_landmarks:
            structural_data = self._structural_metrics(raw_landmarks)

        return label, findings, structural_data

    # ── Private ──────────────────────────────────────────────────────────────

    def _get_label(self, confidence: float) -> str:
        if confidence < REAL_THRESHOLD:
            return "real"
        if confidence < UNCERTAIN_THRESHOLD:
            return "uncertain"
        return "fake"

    def _classifier_findings(self, label: str, confidence: float) -> List[str]:
        """Plain descriptions of the EfficientNet result only."""
        pct = round(confidence * 100, 1)

        if label == "fake":
            return [
                f"Classifier score {pct}% exceeds the manipulation threshold (60%)",
                "EfficientNet-B0 found texture and frequency patterns consistent "
                "with synthetic image generation",
                "Corroborate with additional forensic tools before drawing conclusions",
            ]
        if label == "uncertain":
            return [
                f"Classifier score {pct}% falls in the uncertain range (30–60%)",
                "Result is inconclusive — subtle compression artefacts or "
                "partial manipulation cannot be ruled out",
            ]
        return [
            f"Classifier score {pct}% is below the manipulation threshold (30%)",
            "EfficientNet-B0 found no strong indicators of synthetic origin",
        ]

    def _structural_metrics(self, landmarks: List) -> Dict:
        """
        Raw geometric measurements derived from the 468-point mesh.
        Returns numbers only — no pass/fail flags, no anomaly language.
        """
        metrics: Dict = {}

        try:
            arr = np.asarray(landmarks, dtype=float)
            n   = len(arr)

            LEFT_EYE  = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]
            RIGHT_EYE = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382]
            MOUTH     = [61,84,17,314,405,291,375,321,308,324,318,402,317,14,87,178,88,95]

            def safe_pts(indices: List[int]) -> np.ndarray:
                valid = [i for i in indices if i < n]
                return arr[valid] if valid else np.empty((0, 2))

            # ── Eye measurements ──────────────────────────────────────────
            lp = safe_pts(LEFT_EYE)
            rp = safe_pts(RIGHT_EYE)

            if lp.size and rp.size:
                lc        = lp.mean(axis=0)
                rc        = rp.mean(axis=0)
                eye_dist  = float(abs(lc[0] - rc[0]))
                eye_vdiff = float(abs(lc[1] - rc[1]))
                asym_pct  = round((eye_vdiff / eye_dist * 100), 2) if eye_dist > 0 else 0.0

                metrics["eye_analysis"] = {
                    "left_eye_center":        lc.tolist(),
                    "right_eye_center":       rc.tolist(),
                    "eye_distance_px":        round(eye_dist, 1),
                    "eye_vertical_offset_px": round(eye_vdiff, 1),
                    "eye_asymmetry_percent":  asym_pct,
                    "eye_indices":            {"left": LEFT_EYE, "right": RIGHT_EYE},
                }

            # ── Mouth measurements ────────────────────────────────────────
            mp_ = safe_pts(MOUTH)
            if len(mp_) >= 4:
                mw = float(mp_[:, 0].max() - mp_[:, 0].min())
                mh = float(mp_[:, 1].max() - mp_[:, 1].min())
                metrics["mouth_analysis"] = {
                    "mouth_width_px":  round(mw, 1),
                    "mouth_height_px": round(mh, 1),
                    "mouth_ratio":     round(mh / mw, 3) if mw > 0 else 0.0,
                    "mouth_indices":   MOUTH,
                }

            # ── Landmark coverage & spread ────────────────────────────────
            completeness = (n / self.EXPECTED_LANDMARKS) * 100
            variance     = float(np.var(arr)) if n > 0 else 0.0

            metrics["face_quality"] = {
                "landmark_count":       n,
                "completeness_percent": round(completeness, 1),
                "total_expected":       self.EXPECTED_LANDMARKS,
                "landmark_variance":    round(variance, 1),
            }

        except Exception as exc:
            metrics["error"] = str(exc)[:80]

        return metrics

    def get_confidence_description(self, confidence: float) -> str:
        if confidence > 0.9: return "Very high manipulation probability"
        if confidence > 0.7: return "High manipulation probability"
        if confidence > 0.4: return "Uncertain — possible artefacts"
        return "Low manipulation probability"