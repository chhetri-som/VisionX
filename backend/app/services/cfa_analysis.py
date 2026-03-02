import cv2
import numpy as np
import base64


class CFAAnalyzer:
    """
    Sensor noise uniformity analysis.

    Divides the image into an 8×8 grid, computes noise residual variance
    per cell, and flags statistical outliers (>2σ from mean).  Returns a
    structured forensic signal with outlier count and an annotated
    visualisation — no raw heatmaps.
    """

    GRID_ROWS = 8
    GRID_COLS = 8

    @staticmethod
    def analyze(image_bytes: bytes) -> dict:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return CFAAnalyzer._error("Could not decode image.")

            h, w = img.shape[:2]
            GR, GC = CFAAnalyzer.GRID_ROWS, CFAAnalyzer.GRID_COLS

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(float)

            # Extract noise residual via median subtraction
            smoothed = cv2.medianBlur(gray.astype(np.uint8), 3).astype(float)
            residual = gray - smoothed  # zero-centred noise

            # Per-cell variance
            cell_h = h // GR
            cell_w = w // GC
            variances = np.zeros(GR * GC)

            for r in range(GR):
                for c in range(GC):
                    cell = residual[r * cell_h : (r + 1) * cell_h, c * cell_w : (c + 1) * cell_w]
                    variances[r * GC + c] = float(np.var(cell))

            mean_var = np.mean(variances)
            std_var = np.std(variances)

            # Flag outliers at 2σ
            outlier_mask = variances > (mean_var + 2 * std_var)
            outlier_count = int(np.sum(outlier_mask))

            # Build annotated visualisation on original image
            vis = img.copy()
            overlay = img.copy()

            cell_idx = 0
            for r in range(GR):
                for c in range(GC):
                    if outlier_mask[cell_idx]:
                        x1, y1 = c * cell_w, r * cell_h
                        x2, y2 = x1 + cell_w, y1 + cell_h
                        # Red semi-transparent fill
                        cv2.rectangle(overlay, (x1, y1), (x2, y2), (30, 30, 200), -1)
                    cell_idx += 1

            vis = cv2.addWeighted(overlay, 0.28, img, 0.72, 0)

            # Crisp outlines on top
            cell_idx = 0
            for r in range(GR):
                for c in range(GC):
                    if outlier_mask[cell_idx]:
                        x1, y1 = c * cell_w, r * cell_h
                        x2, y2 = x1 + cell_w, y1 + cell_h
                        cv2.rectangle(vis, (x1, y1), (x2, y2), (30, 30, 210), 2)
                        # Small variance label in each flagged cell
                        label = f"{variances[cell_idx]:.1f}"
                        cv2.putText(
                            vis, label,
                            (x1 + 4, y1 + 14),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.32,
                            (255, 255, 255), 1, cv2.LINE_AA,
                        )
                    cell_idx += 1

            is_success, buffer = cv2.imencode(".jpg", vis)
            vis_b64 = base64.b64encode(buffer).decode("utf-8") if is_success else None

            # --- Score & verdict ---
            total_cells = GR * GC
            outlier_ratio = outlier_count / total_cells

            if outlier_ratio > 0.20:
                severity = "anomalous"
                score = min(100, int(outlier_ratio * 280))
                summary = (
                    f"{outlier_count} of {total_cells} grid regions show abnormal noise"
                    " signatures — strong tampering indicator."
                )
            elif outlier_ratio > 0.08:
                severity = "suspicious"
                score = min(100, int(outlier_ratio * 180))
                summary = (
                    f"{outlier_count} region(s) with unusual noise patterns — possible"
                    " composite or splice."
                )
            else:
                severity = "clean"
                score = min(20, int(outlier_ratio * 100))
                summary = (
                    f"Noise pattern is uniform across image"
                    f" ({outlier_count} minor outlier(s) within normal range)."
                )

            return {
                "severity": severity,
                "score": score,
                "summary": summary,
                "detail": (
                    f"Image divided into {GR}×{GC} grid ({total_cells} cells). "
                    f"Outlier threshold: mean + 2σ variance. "
                    f"Highlighted cells in the visualisation mark statistically "
                    f"abnormal noise — these indicate regions with a different "
                    f"origin from the rest of the image."
                ),
                "visualization": f"data:image/jpeg;base64,{vis_b64}" if vis_b64 else None,
                "outlier_count": outlier_count,
            }

        except Exception as e:
            return CFAAnalyzer._error(str(e))

    @staticmethod
    def _error(msg: str) -> dict:
        return {
            "severity": "suspicious",
            "score": 50,
            "summary": "Noise analysis encountered an error.",
            "detail": msg,
            "visualization": None,
            "outlier_count": 0,
        }