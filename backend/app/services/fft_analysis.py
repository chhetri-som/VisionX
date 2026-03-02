import cv2
import numpy as np
import base64


class FFTAnalyzer:
    """
    2D FFT frequency-domain analysis for detecting AI/GAN-generated images.

    GAN and diffusion models leave characteristic spectral artefacts due to
    their upsampling layers (transposed convolutions produce a periodic grid
    in frequency space).  Real photographs have smooth, continuous frequency
    distributions without regular peaks.
    """

    FFT_SIZE = 512

    @staticmethod
    def analyze(image_bytes: bytes) -> dict:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

            if img is None:
                return FFTAnalyzer._error("Could not decode image for frequency analysis.")

            N = FFTAnalyzer.FFT_SIZE
            img_resized = cv2.resize(img, (N, N)).astype(float)

            # 2D FFT — shifted so DC is at centre
            fshift = np.fft.fftshift(np.fft.fft2(img_resized))
            magnitude = np.abs(fshift)

            # --- Visualisation: log-magnitude with INFERNO colormap ---
            log_mag = np.log1p(magnitude)
            log_norm = ((log_mag - log_mag.min()) / (log_mag.max() - log_mag.min() + 1e-6) * 255).astype(np.uint8)
            fft_vis = cv2.applyColorMap(log_norm, cv2.COLORMAP_INFERNO)

            center = N // 2

            # --- Mask DC component to focus on off-centre peaks ---
            y_idx, x_idx = np.ogrid[:N, :N]
            dc_mask = ((x_idx - center) ** 2 + (y_idx - center) ** 2) <= 20 ** 2
            mag_no_dc = magnitude.copy()
            mag_no_dc[dc_mask] = 0.0
            mag_norm = mag_no_dc / (mag_no_dc.max() + 1e-6)

            # --- Peak detection ---
            peak_threshold = 0.12
            peak_mask = mag_norm > peak_threshold
            peak_count = int(np.sum(peak_mask))

            # --- Symmetry test (GAN artefacts appear in symmetric pairs) ---
            top = mag_norm[:center, :]
            bot = np.flipud(mag_norm[center:, :])
            min_h = min(top.shape[0], bot.shape[0])
            corr_matrix = np.corrcoef(top[:min_h].flatten(), bot[:min_h].flatten())
            symmetry_score = float(corr_matrix[0, 1]) if corr_matrix.shape == (2, 2) else 0.0

            # --- Grid periodicity test ---
            # Strong periodic grid → regular peaks along horizontal/vertical axes
            h_profile = mag_norm[center, :]  # horizontal slice through centre
            v_profile = mag_norm[:, center]  # vertical slice through centre

            # Count local maxima above a modest threshold in the profiles
            def count_peaks(profile: np.ndarray, thresh: float = 0.05) -> int:
                above = profile > thresh
                count = 0
                for i in range(1, len(profile) - 1):
                    if above[i] and profile[i] > profile[i - 1] and profile[i] > profile[i + 1]:
                        count += 1
                return count

            h_peaks = count_peaks(h_profile)
            v_peaks = count_peaks(v_profile)
            axis_peaks = h_peaks + v_peaks

            # --- Mark peaks on visualisation ---
            peak_positions = np.argwhere(peak_mask)
            for pos in peak_positions[:80]:
                cv2.circle(fft_vis, (int(pos[1]), int(pos[0])), 2, (0, 255, 120), -1)

            # Crosshair at DC
            cv2.line(fft_vis, (center - 12, center), (center + 12, center), (180, 180, 180), 1)
            cv2.line(fft_vis, (center, center - 12), (center, center + 12), (180, 180, 180), 1)

            is_success, buffer = cv2.imencode(".jpg", fft_vis)
            vis_b64 = base64.b64encode(buffer).decode("utf-8") if is_success else None

            # --- Scoring ---
            score = 0
            flags = []

            if peak_count > 600:
                score += 55
                flags.append(f"Very high spectral peak count ({peak_count}) — strong GAN/upsampling artefact pattern.")
            elif peak_count > 200:
                score += 28
                flags.append(f"Elevated spectral peaks ({peak_count}) — possible synthetic generation.")
            else:
                flags.append(f"Low spectral peak count ({peak_count}) — within natural range.")

            if symmetry_score > 0.88:
                score += 30
                flags.append(f"High spectral symmetry ({symmetry_score:.2f}) — consistent with synthetic generation.")
            elif symmetry_score > 0.75:
                score += 12
                flags.append(f"Moderate spectral symmetry ({symmetry_score:.2f}).")

            if axis_peaks > 20:
                score += 20
                flags.append(f"Axis-aligned periodic peaks ({axis_peaks}) — suggests convolution grid artefacts.")

            score = min(score, 100)

            if score >= 65:
                severity = "anomalous"
                summary = flags[0]
            elif score >= 30:
                severity = "suspicious"
                summary = flags[0]
            else:
                severity = "clean"
                summary = f"Frequency spectrum appears natural (peaks: {peak_count}, symmetry: {symmetry_score:.2f})."

            return {
                "severity": severity,
                "score": score,
                "summary": summary,
                "detail": (
                    f"2D FFT on {N}×{N} image. Spectral peaks (>{peak_threshold*100:.0f}% max): {peak_count}. "
                    f"Symmetry score: {symmetry_score:.3f}. Axis peaks: {axis_peaks}. "
                    "Green dots in the visualisation mark anomalous frequency peaks; "
                    "a regular grid pattern indicates AI-generator artefacts."
                ),
                "visualization": f"data:image/jpeg;base64,{vis_b64}" if vis_b64 else None,
            }

        except Exception as e:
            return FFTAnalyzer._error(str(e))

    @staticmethod
    def _error(msg: str) -> dict:
        return {
            "severity": "suspicious",
            "score": 50,
            "summary": "Frequency analysis encountered an error.",
            "detail": msg,
            "visualization": None,
        }