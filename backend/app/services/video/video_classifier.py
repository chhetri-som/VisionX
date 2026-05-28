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
            "Analyze this facial crop. Determine if it is real or AI-generated. "
            "Output your final response strictly as a JSON object with two keys: "
            "'confidence' (a float between 0.0 and 1.0, where 1.0 is definitely fake) "
            "and 'reasoning' (a brief explanation)."
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
                "reasoning": reasoning
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