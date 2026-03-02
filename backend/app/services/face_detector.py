# backend/app/services/face_detector.py
"""
Face Detection using MediaPipe Face Landmarker
- Detects up to 4 faces per image
- Extracts 468 facial landmarks per face
- Returns ALL detected faces (not just face[0])
- Bboxes include 20% padding to preserve blending-boundary evidence
"""

import mediapipe as mp
import numpy as np
import cv2
from typing import Dict, Optional, List
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class FaceDetector:
    """
    Detects up to 4 faces using MediaPipe Face Landmarker.
    detect() returns all detected faces so the route can classify each one.
    """

    def __init__(self, model_asset_path: str = None):
        try:
            base_options = mp.tasks.BaseOptions(
                model_asset_path=model_asset_path or "face_landmarker.task"
            )
            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=4,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=False,
            )
            self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
            logger.info("✅ Face Landmarker loaded (num_faces=4)")

        except Exception as e:
            logger.error(f"❌ Failed to load Face Landmarker: {e}")
            raise RuntimeError(f"Face Landmarker initialization failed: {e}")

    def detect(self, image_array: np.ndarray) -> Dict:
        """
        Detect all faces in an image.

        Args:
            image_array: numpy array [H, W, 3] BGR format (OpenCV)

        Returns:
            {
                'detected':   bool,
                'face_count': int,
                'faces': [
                    {
                        'landmarks':  list[(x, y)],           # 468 pts, absolute pixels
                        'bbox':       [x_min, y_min, x_max, y_max],
                        'confidence': float | None             # MediaPipe blendshape score
                    },
                    ...
                ]
            }
        """
        try:
            h, w = image_array.shape[:2]
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

            result     = self.landmarker.detect(mp_image)
            face_count = len(result.face_landmarks)

            if face_count == 0:
                logger.debug("No face detected")
                return {"detected": False, "face_count": 0, "faces": []}

            logger.debug(f"Detected {face_count} face(s)")

            faces = []
            for idx, raw_lm in enumerate(result.face_landmarks):
                landmark_points = [(int(pt.x * w), int(pt.y * h)) for pt in raw_lm]

                xs = [p[0] for p in landmark_points]
                ys = [p[1] for p in landmark_points]

                x_min, x_max = min(xs), max(xs)
                y_min, y_max = min(ys), max(ys)

                # 20% padding preserves blending-boundary region
                pad_x = (x_max - x_min) * 0.20
                pad_y = (y_max - y_min) * 0.20

                x_min = max(0, int(x_min - pad_x))
                y_min = max(0, int(y_min - pad_y))
                x_max = min(w, int(x_max + pad_x))
                y_max = min(h, int(y_max + pad_y))

                confidence = None
                if (
                    result.face_blendshapes
                    and idx < len(result.face_blendshapes)
                    and len(result.face_blendshapes[idx]) > 0
                ):
                    confidence = float(result.face_blendshapes[idx][0].score)

                faces.append({
                    "landmarks":  landmark_points,
                    "bbox":       [x_min, y_min, x_max, y_max],
                    "confidence": confidence,
                })

            return {"detected": True, "face_count": face_count, "faces": faces}

        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            return {"detected": False, "face_count": 0, "faces": [], "error": str(e)}

    def crop_face(
        self, image_array: np.ndarray, bbox: List[int]
    ) -> Optional[np.ndarray]:
        """
        Crop and square-pad the face region so the classifier sees an
        undistorted aspect ratio before 224x224 resize.
        """
        try:
            x_min, y_min, x_max, y_max = bbox
            crop = image_array[y_min:y_max, x_min:x_max]

            if crop.size == 0:
                logger.warning("Crop resulted in empty image")
                return None

            ch, cw = crop.shape[:2]
            if ch == cw:
                return crop

            side   = max(ch, cw)
            square = np.zeros((side, side, 3), dtype=crop.dtype)
            y_off  = (side - ch) // 2
            x_off  = (side - cw) // 2
            square[y_off:y_off + ch, x_off:x_off + cw] = crop
            return square

        except Exception as e:
            logger.error(f"Error cropping face: {e}")
            return None