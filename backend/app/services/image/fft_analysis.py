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
    PEAK_THRESHOLD = 0.35

    @staticmethod
    def analyze(image_bytes: bytes, bbox: dict = None) -> dict:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)  # Convert to grayscale

            if img is None:
                return FFTAnalyzer._error("Could not decode image for frequency analysis.")

            img_h, img_w = img.shape
            N = FFTAnalyzer.FFT_SIZE

            # --- 1. Bounding Box Extraction & Windowing ---
            if bbox:
                x1 = int(bbox.get("x1", 0.0) * img_w)
                y1 = int(bbox.get("y1", 0.0) * img_h)
                x2 = int(bbox.get("x2", 1.0) * img_w)
                y2 = int(bbox.get("y2", 1.0) * img_h)

                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            else:
                cx, cy = img_w // 2, img_h // 2

            # Bounded crop coordinates
            half_N = N // 2
            start_y, end_y = max(0, cy - half_N), min(img_h, cy + half_N)
            start_x, end_x = max(0, cx - half_N), min(img_w, cx + half_N)

            img_cropped = img[start_y:end_y, start_x:end_x]
            crop_h, crop_w = img_cropped.shape

            # Create a 512x512 pure black canvas
            img_ready = np.zeros((N, N), dtype=float)

            if crop_h > 0 and crop_w > 0:
                # Apply a 2D Hann window to the crop to fade edges smoothly to black.
                # This completely prevents FFT wrap-around artifacts (the bright frequency cross).
                hann_y = np.hanning(crop_h)
                hann_x = np.hanning(crop_w)
                hann_2d = np.outer(hann_y, hann_x)

                img_windowed = img_cropped * hann_2d

                # Center the smoothly faded face on the black canvas
                y_offset = (N - crop_h) // 2
                x_offset = (N - crop_w) // 2
                img_ready[y_offset:y_offset+crop_h, x_offset:x_offset+crop_w] = img_windowed

            # 2D FFT — shifted so DC is at centre
            fshift = np.fft.fftshift(np.fft.fft2(img_ready))
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
            peak_threshold = FFTAnalyzer.PEAK_THRESHOLD
            peak_mask = mag_norm > peak_threshold
            peak_count = int(np.sum(peak_mask))

            #Peak Symmetry: Only check symmetry of the anomalous high-frequency peaks
            top_peaks = peak_mask[:center, :]
            bot_peaks = np.flipud(peak_mask[center+(N%2):, :]) # Handle odd/even splits
            intersection = np.logical_and(top_peaks, bot_peaks).sum()
            union = np.logical_or(top_peaks, bot_peaks).sum()
            symmetry_score = float(intersection / union) if union > 0 else 0.0

            # --- Grid periodicity test ---
            h_profile = mag_norm[center, :]  # horizontal slice through centre
            v_profile = mag_norm[:, center]  # vertical slice through centre

            def count_peaks(profile: np.ndarray, thresh: float = peak_threshold) -> int:
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

            if peak_count > (N**2)*FFTAnalyzer.PEAK_THRESHOLD:
                score += 55
                flags.append(f"Very high spectral peak count ({peak_count}) — strong GAN/upsampling artefact pattern.")
            elif peak_count > (N**2)*FFTAnalyzer.PEAK_THRESHOLD / 10:
                score += 28
                flags.append(f"Elevated spectral peaks ({peak_count}) — possible synthetic generation.")
            else:
                flags.append(f"Low spectral peak count ({peak_count}) — within natural range.")

            if symmetry_score > 0.65:
                score += 30
                flags.append(f"High spectral symmetry ({symmetry_score:.2f}) — consistent with synthetic generation.")
            elif symmetry_score > 0.45:
                score += 12
                flags.append(f"Moderate spectral symmetry ({symmetry_score:.2f}).")
            else:
                flags.append(f"Low spectral symmetry ({symmetry_score:.2f}).")

            if axis_peaks > 35:
                score += 20
                flags.append(f"Axis-aligned periodic peaks ({axis_peaks}) — suggests convolution grid artefacts.")
            else:
                flags.append(f"Axis-aligned periodic peaks ({axis_peaks}) - suggestsconvolution grid artefacts.")

            # Adjusted scoring system
            if peak_count <= (N**2)*FFTAnalyzer.PEAK_THRESHOLD / 10:
                score = 0
                flags = [f"Low spectral peak count ({peak_count}) — within natural range."]
            elif symmetry_score <= 0.45 or axis_peaks <= 35:
                score = 20
                flags.append(f"No anomalous characteristics detected.")

            score = min(score, 100)

            if score >= 70:
                severity = "anomalous"
                summary = flags[0]
            elif score >= 45:
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
                    f"2D FFT on {N}×{N} image. Spectral peaks (>{FFTAnalyzer.PEAK_THRESHOLD*100:.0f}% max): {peak_count}. "
                    f"Symmetry score: {symmetry_score:.3f}. Axis peaks: {axis_peaks}. "
                    "Green dots in the visualisation mark anomalous frequency peaks; "
                    "a regular grid pattern indicates AI-generator artefacts."
                ),
                "visualization": f"data:image/jpeg;base64,{vis_b64}" if vis_b64 else None,
            }
        except Exception as e:
            return FFTAnalyzer._error(str(e))
