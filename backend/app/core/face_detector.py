# backend/app/core/face_detector.py
"""
Face Detection using MediaPipe Face Landmarker
- Detects faces in images
- Extracts 468 facial landmarks
- Returns bounding box with padding
"""

import mediapipe as mp
import numpy as np
import cv2
from typing import Dict, Optional, List, Tuple
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class FaceDetector:
    """
    Detects faces using MediaPipe Face Landmarker.
    
    Features:
    - 468-point facial landmark detection
    - Automatic bounding box computation
    - Padding to ensure full face capture
    """
    
    def __init__(self, model_asset_path: str = None):
        """
        Initialize Face Detector.
        
        Args:
            model_asset_path: Path to face_landmarker.task file
                            If None, MediaPipe will attempt to auto-download
        
        Raises:
            RuntimeError: If model fails to load
        """
        try:
            # Set up MediaPipe
            if model_asset_path:
                base_options = mp.tasks.BaseOptions(model_asset_path=model_asset_path)
            else:
                # Let MediaPipe handle download
                base_options = mp.tasks.BaseOptions(model_asset_path="face_landmarker.task")
            
            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=1,  # Only detect the first/largest face
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=False,
            )
            
            self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
            logger.info("✅ Face Landmarker loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Face Landmarker: {e}")
            raise RuntimeError(f"Face Landmarker initialization failed: {e}")
    
    def detect(self, image_array: np.ndarray) -> Dict:
        """
        Detect faces in an image.
        
        Args:
            image_array: numpy array [H, W, 3] in BGR format (OpenCV)
        
        Returns:
            Dictionary with keys:
            - 'detected': bool - Whether a face was detected
            - 'bbox': [x_min, y_min, x_max, y_max] or None - Bounding box in pixels
            - 'landmarks': list of (x, y) tuples or None - 468 facial landmarks
            - 'confidence': float or None - Face detection confidence
        
        Example:
            >>> import cv2
            >>> image = cv2.imread('face.jpg')
            >>> result = detector.detect(image)
            >>> if result['detected']:
            ...     print(f"Face found at {result['bbox']}")
        """
        try:
            h, w = image_array.shape[:2]
            
            # Convert BGR → RGB for MediaPipe
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            
            # Create MediaPipe Image object
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Run detection
            detection_result = self.landmarker.detect(mp_image)
            
            # Check if face was detected
            if not detection_result.face_landmarks:
                logger.debug("No face detected in image")
                return {
                    'detected': False,
                    'bbox': None,
                    'landmarks': None,
                    'confidence': None
                }
            
            # Extract landmarks (first face only)
            landmarks_raw = detection_result.face_landmarks[0]
            
            # Convert normalized coordinates to pixel coordinates
            landmark_points = [
                (int(pt.x * w), int(pt.y * h))
                for pt in landmarks_raw
            ]
            
            # Compute bounding box from landmarks
            xs = [pt[0] for pt in landmark_points]
            ys = [pt[1] for pt in landmark_points]
            
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            
            # Add 10% padding to ensure full face is included
            pad_x = (x_max - x_min) * 0.1
            pad_y = (y_max - y_min) * 0.1
            
            x_min = max(0, int(x_min - pad_x))
            y_min = max(0, int(y_min - pad_y))
            x_max = min(w, int(x_max + pad_x))
            y_max = min(h, int(y_max + pad_y))
            
            bbox = [x_min, y_min, x_max, y_max]
            
            # Get confidence if available
            confidence = None
            if detection_result.face_blendshapes and len(detection_result.face_blendshapes[0]) > 0:
                confidence = float(detection_result.face_blendshapes[0][0].score)
            
            logger.debug(f"Face detected: bbox={bbox}, landmarks={len(landmark_points)}")
            
            return {
                'detected': True,
                'bbox': bbox,
                'landmarks': landmark_points,
                'confidence': confidence
            }
        
        except Exception as e:
            logger.error(f"Error during face detection: {e}")
            return {
                'detected': False,
                'bbox': None,
                'landmarks': None,
                'confidence': None,
                'error': str(e)
            }
    
    def crop_face(self, image_array: np.ndarray, bbox: List[int]) -> Optional[np.ndarray]:
        """
        Crop face region from image using bounding box.
        
        Args:
            image_array: Full image [H, W, 3]
            bbox: [x_min, y_min, x_max, y_max]
        
        Returns:
            Cropped face image or None if crop fails
        """
        try:
            x_min, y_min, x_max, y_max = bbox
            face_crop = image_array[y_min:y_max, x_min:x_max]
            
            if face_crop.size == 0:
                logger.warning("Crop resulted in empty image")
                return None
            
            return face_crop
        
        except Exception as e:
            logger.error(f"Error cropping face: {e}")
            return None


if __name__ == "__main__":
    # Simple test
    from app.core.logging_config import setup_logging
    setup_logging("DEBUG")
    
    print("Testing FaceDetector...")
    
    try:
        detector = FaceDetector()
        print("✅ FaceDetector initialized")
        
        # Create a dummy test image (you would use a real face image)
        dummy_image = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)
        result = detector.detect(dummy_image)
        
        print(f"Detection result: {result['detected']}")
        if result['detected']:
            print(f"  Bbox: {result['bbox']}")
            print(f"  Landmarks: {len(result['landmarks'])} points")
        else:
            print("  No face detected (expected for random image)")
    
    except Exception as e:
        print(f"❌ Error: {e}")
