import cv2
import tempfile
import os
import math
from app.core.logging_config import get_logger
from app.core.config import VIDEO_FPS, VIDEO_MAX_DURATION_SEC

logger = get_logger(__name__)

class VideoPreprocessor:
    def extract_face_frames(self, video_bytes: bytes, face_detector) -> list:
        # Save bytes to temp file because cv2.VideoCapture requires a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(video_bytes)
            temp_path = tmp.name
        
        extracted_frames = []
        
        try:
            cap = cv2.VideoCapture(temp_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file.")
            
            orig_fps = cap.get(cv2.CAP_PROP_FPS)
            if orig_fps == 0 or math.isnan(orig_fps):
                orig_fps = 30.0 
                
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_sec = total_frames / orig_fps
            
            process_duration = min(duration_sec, VIDEO_MAX_DURATION_SEC)
            max_frames_to_process = int(process_duration * VIDEO_FPS)
            
            stride = max(1, int(round(orig_fps / VIDEO_FPS)))
            
            current_idx = 0
            processed_count = 0
            
            logger.info(f"Video duration: {duration_sec:.1f}s. Extracting max {max_frames_to_process} frames at {VIDEO_FPS} FPS.")
            
            while processed_count < max_frames_to_process:
                frame_pos = current_idx * stride
                if frame_pos >= total_frames:
                    break
                    
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
                ret, frame = cap.read()
                if not ret:
                    break
                    
                timestamp = frame_pos / orig_fps
                
                detection = face_detector.detect(frame)
                if detection.get("detected", False) and detection.get("face_count", 0) > 0:
                    primary_face = detection["faces"][0]
                    bbox = primary_face["bbox"]
                    
                    face_crop = face_detector.crop_face(frame, bbox)
                    
                    if face_crop is not None:
                        ch, cw = face_crop.shape[:2]
                        if ch >= 50 and cw >= 50:
                            face_crop_resized = cv2.resize(face_crop, (224, 224))
                            extracted_frames.append({
                                "frame_idx": frame_pos,
                                "timestamp": round(timestamp, 2),
                                "crop": face_crop_resized,
                                "face_data": primary_face
                            })
                
                current_idx += 1
                processed_count += 1
                
        finally:
            cap.release()
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        return extracted_frames