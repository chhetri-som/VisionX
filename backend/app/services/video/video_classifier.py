import cv2
import base64
import json
import re
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class VideoClassifier:
    def __init__(self, engine):
        self.llm = engine
        logger.info("Video Classifier initialized with shared VLM engine")

    def _encode_image(self, image_array) -> str:
        _, buffer = cv2.imencode('.jpg', image_array)
        base64_image = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_image}"

    def classify_frames(self, frame_data_list: list) -> tuple[float, str, list]:
        logger.info(f"Received {len(frame_data_list)} frames for full sequential VLM classification")
        
        if not frame_data_list:
            return 0.0, "No faces to analyze.", []
            
        frame_results = []
        total_confidence = 0.0
        
        classification_prompt = (
            "You are a deepfake detection model analyzing a face cropped from a video frame.\n\n"
            "REASONING RULES — follow these before anything else:\n"
            "1. Your FIRST assessment of each item is FINAL. Do not revise it.\n"
            "2. If you are unsure whether something is a FLAG → it is OK.\n"
            "3. Only FLAG something you are CERTAIN is anomalous.\n"
            "4. Move to the next item immediately after writing FLAG or OK.\n"
            "5. Never use the word 'wait' or 'maybe'. Be decisive.\n\n"
            "CONTEXT: Video frames are low resolution, compressed, and motion-blurred. "
            "Smooth skin, soft edges, and blurriness are EXPECTED compression artifacts — NOT signs of AI. "
            "Your default assumption is REAL. Only override with certain geometric evidence.\n\n"
            "CHECKLIST — one sentence per item, then FLAG or OK. No going back:\n"
            "1. EYES      - pupil alignment and iris shape natural? (allow blur)\n"
            "2. SYMMETRY  - structural misalignment between face halves?\n"
            "3. JAWLINE   - unnaturally straight or geometrically impossible? (allow softness)\n"
            "4. BOUNDARY  - edge ghosting or warping around face? (allow natural blur)\n"
            "5. ANOMALIES - impossible geometry: merged/missing features, broken neckline?\n\n"
            "Smooth skin is NOT a flag. Blurry edges are NOT a flag. "
            "Only FLAG what CANNOT be explained by compression or low resolution.\n\n"
            "SCORING:\n"
            "0 flags → 0.05-0.15\n"
            "1 flag  → 0.15-0.30\n"
            "2 flags → 0.35-0.55\n"
            "3+flags → 0.60-0.85\n\n"
            "OUTPUT — write exactly this, no extra text:\n"
            "1. Eyes: <one sentence> → FLAG/OK\n"
            "2. Symmetry: <one sentence> → FLAG/OK\n"
            "3. Jawline: <one sentence> → FLAG/OK\n"
            "4. Boundary: <one sentence> → FLAG/OK\n"
            "5. Anomalies: <one sentence> → FLAG/OK\n"
            "Flags: <N>\n"
            '{"confidence": <value>, "reasoning": "<one sentence>"}'
        )

        for data in frame_data_list:
            crop = data["crop"]
            base64_img = self._encode_image(crop)
            
            try:
                response = self.llm.create_chat_completion(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": base64_img}},
                                {"type": "text", "text": classification_prompt}
                            ]
                        }
                    ]
                )
                
                reply_text = response['choices'][0]['message']['content']
                #DEBUG
                logger.info("================ RAW LLM DUMP ================\n" 
                            f"{reply_text}\n"
                            "==============================================")
                
                json_match = re.search(r'\{.*\}', reply_text, re.DOTALL)
                if json_match:
                    parsed_reply = json.loads(json_match.group(0))
                    confidence = float(parsed_reply.get("confidence", 0.0))
                    reasoning = parsed_reply.get("reasoning", "No specific reasoning provided.")
                else:
                    logger.warning(f"Failed to parse JSON from VLM at frame {data['frame_idx']}")
                    confidence = 0.0
                    reasoning = "Parsing error."

            except Exception as e:
                logger.error(f"Inference error on frame {data['frame_idx']}: {e}")
                confidence = 0.0
                reasoning = "Inference failed."

            frame_results.append({
                "timestamp": data["timestamp"],
                "frame_idx": data.get("frame_idx", 0),
                "confidence": round(confidence, 3),
                "reasoning": reasoning,
                "image_base64": base64_img
            })
            total_confidence += confidence
            logger.info(f"Frame {data['frame_idx']} at {data['timestamp']}s -> Confidence: {confidence:.2f}")

        processed_len = len(frame_results)
        avg_confidence = total_confidence / processed_len
        peak_confidence = max(r["confidence"] for r in frame_results)
        
        aggregate_reasoning = (
            f"Analyzed {processed_len} frames. "
            f"Average AI probability: {avg_confidence:.1%}. "
            f"Peak AI probability found: {peak_confidence:.1%}."
        )
        
        return avg_confidence, aggregate_reasoning, frame_results