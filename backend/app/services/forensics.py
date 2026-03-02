import io
import base64
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ExifTags

# Known AI/generator software signatures to match against EXIF Software field
KNOWN_AI_SOFTWARE = [
    "stable diffusion", "midjourney", "dall-e", "dalle", "adobe firefly",
    "firefly", "generative fill", "runway", "imagen", "deepfake",
    "faceswap", "deepfacelab", "reface", "nightcafe", "wombo",
    "bing image creator", "ideogram", "leonardo", "invoke ai",
    "automatic1111", "comfyui", "novelai",
]


class ForensicsService:

    @staticmethod
    def score_exif(image_bytes: bytes) -> dict:
        """
        Parses EXIF metadata and returns a structured forensic signal
        with severity, score, human-readable summary, and raw data.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            exif_data = img.getexif()

            if not exif_data:
                return {
                    "severity": "anomalous",
                    "score": 88,
                    "summary": "No metadata found — strong AI/synthetic signal.",
                    "detail": (
                        "Authentic camera photos almost always contain EXIF metadata. "
                        "Completely absent metadata strongly indicates AI generation, "
                        "screenshot capture, or deliberate stripping before upload."
                    ),
                    "raw": {},
                }

            clean_exif = {}
            for tag_id, value in exif_data.items():
                tag = ExifTags.TAGS.get(tag_id, str(tag_id))
                if isinstance(value, bytes):
                    continue
                clean_exif[str(tag)] = str(value)

            score = 0
            flags = []

            # --- Check for explicit AI software signatures ---
            software_raw = clean_exif.get("Software", "")
            software = software_raw.lower()
            matched_ai = next((sig for sig in KNOWN_AI_SOFTWARE if sig in software), None)
            if matched_ai:
                score += 85
                flags.append(f"AI software signature: '{software_raw}'")

            # --- Missing camera hardware ---
            has_make = "Make" in clean_exif
            has_model = "Model" in clean_exif
            if not has_make and not has_model:
                score += 25
                flags.append("No camera make/model data")
            elif has_make or has_model:
                camera_str = f"{clean_exif.get('Make', '')} {clean_exif.get('Model', '')}".strip()
                flags.append(f"Camera: {camera_str}")
                score = max(0, score - 15)

            # --- Missing timestamps ---
            has_dt = "DateTime" in clean_exif or "DateTimeOriginal" in clean_exif
            if not has_dt:
                score += 10
                flags.append("No capture timestamp")

            # --- Lens data (strong authenticity signal) ---
            if "LensModel" in clean_exif or "LensSpecification" in clean_exif:
                score = max(0, score - 10)
                flags.append(f"Lens: {clean_exif.get('LensModel', clean_exif.get('LensSpecification', ''))}")

            score = min(score, 100)

            if score >= 70:
                severity = "anomalous"
                summary = flags[0] if flags else "Multiple metadata anomalies detected."
            elif score >= 30:
                severity = "suspicious"
                summary = "Incomplete metadata — some expected fields missing."
            else:
                cam = clean_exif.get("Make", "") + " " + clean_exif.get("Model", "")
                severity = "clean"
                summary = f"Camera metadata present. {cam.strip() or 'Fields consistent with real capture.'}".strip()

            return {
                "severity": severity,
                "score": score,
                "summary": summary,
                "detail": " | ".join(flags) if flags else "Metadata consistent with a real camera.",
                "raw": clean_exif,
            }

        except Exception as e:
            return {
                "severity": "suspicious",
                "score": 50,
                "summary": "Could not parse metadata.",
                "detail": str(e),
                "raw": {},
            }

    @staticmethod
    def regional_ela(
        image_bytes: bytes,
        bbox: dict = None,
        quality: int = 90,
    ) -> dict:
        """
        Performs Error Level Analysis and compares the face region against
        background regions to detect compression inconsistencies.

        bbox: {"x1": float, "y1": float, "x2": float, "y2": float}
              All values are NORMALISED (0.0–1.0) relative to image dimensions.
        """
        try:
            original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            w, h = original.size

            # Re-save at known quality
            temp_io = io.BytesIO()
            original.save(temp_io, "JPEG", quality=quality)
            temp_io.seek(0)
            compressed = Image.open(temp_io)

            diff = ImageChops.difference(original, compressed)
            diff_array = np.array(diff).astype(float)

            # Build enhanced ELA visualisation
            extrema = diff.getextrema()
            max_diff = max(ex[1] for ex in extrema) or 1
            ela_image = ImageEnhance.Brightness(diff).enhance(255.0 / max_diff)
            out_io = io.BytesIO()
            ela_image.save(out_io, format="JPEG")
            ela_b64 = base64.b64encode(out_io.getvalue()).decode("utf-8")

            # --- Regional comparison ---
            if bbox:
                x1 = max(0, int(bbox["x1"] * w))
                y1 = max(0, int(bbox["y1"] * h))
                x2 = min(w, int(bbox["x2"] * w))
                y2 = min(h, int(bbox["y2"] * h))

                face_region = diff_array[y1:y2, x1:x2]
                face_mean = float(np.mean(face_region)) if face_region.size > 0 else 0.0

                # Background: sample four image corners
                cs = min(80, w // 5, h // 5)
                corners = [
                    diff_array[:cs, :cs],
                    diff_array[:cs, w - cs :],
                    diff_array[h - cs :, :cs],
                    diff_array[h - cs :, w - cs :],
                ]
                bg_mean = float(np.mean(np.concatenate([c.flatten() for c in corners])))

                delta_pct = ((face_mean - bg_mean) / (bg_mean + 1e-6)) * 100

                if delta_pct > 60:
                    severity = "anomalous"
                    score = min(100, int(abs(delta_pct)))
                    summary = (
                        f"Face region compresses {delta_pct:.0f}% more than background"
                        " — strong splice indicator."
                    )
                elif delta_pct > 20:
                    severity = "suspicious"
                    score = min(100, int(abs(delta_pct)))
                    summary = (
                        f"Face region compresses {delta_pct:.0f}% differently from"
                        " background — possible manipulation."
                    )
                elif delta_pct < -25:
                    severity = "suspicious"
                    score = min(100, int(abs(delta_pct)))
                    summary = (
                        f"Face region unusually uniform ({abs(delta_pct):.0f}% below"
                        " background) — possible synthetic face paste."
                    )
                else:
                    severity = "clean"
                    score = max(0, int(abs(delta_pct)))
                    summary = (
                        f"Face and background compression levels consistent"
                        f" (delta: {delta_pct:+.0f}%)."
                    )

                detail = (
                    f"ELA at quality={quality}. Face mean intensity: {face_mean:.1f},"
                    f" background mean: {bg_mean:.1f}, delta: {delta_pct:+.1f}%."
                )

            else:
                # No face bbox — assess full-image variance
                overall_std = float(np.std(diff_array))
                if overall_std > 40:
                    severity = "suspicious"
                    score = min(100, int(overall_std))
                    summary = f"High variance in compression levels (σ={overall_std:.1f}) — possible composite image."
                else:
                    severity = "clean"
                    score = int(overall_std // 2)
                    summary = f"Compression levels appear uniform across image (σ={overall_std:.1f})."
                delta_pct = 0.0
                detail = "No face bounding box provided — full image analysis performed."

            return {
                "severity": severity,
                "score": score,
                "summary": summary,
                "detail": detail,
                "visualization": f"data:image/jpeg;base64,{ela_b64}",
            }

        except Exception as e:
            return {
                "severity": "suspicious",
                "score": 50,
                "summary": "ELA analysis encountered an error.",
                "detail": str(e),
                "visualization": None,
            }