import re
import json
import base64
import cv2
import numpy as np
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class ImageClassifier:
    def __init__(self, engine):

        self.llm = engine
        logger.info("Image Classifier initialized with shared VLM engine")

    def classify(self, face_image: np.ndarray) -> float:
        try:
            base64_image = self._preprocess_to_base64(face_image)
            messages = [
                {
                    "role": "system",
                    "content": "You are a deepfake detection agent. Analyze the structural geometry, textures, and blending of the provided face. Try to find ways to detect if the given image is AI-generated or real. Reason step-by-step, but keep your reasoning concise. More importantly, keep your reasoning concise as well. Basically, dont stress to hard bro. To maintain efficiency focus ONLY on the 3 most critical forensic artifacts (aiming for max 200 words). After reasoning, provide your conclusion in a markdown JSON block containing ONLY the key 'fake_probability' with a float value between 0.0 (completely real) and 1.0 (completely fake)."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                        {"type": "text", "text": "Analyze this face crop and provide the fake_probability JSON."}
                    ]
                }
            ]

            response = self.llm.create_chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=2048
            )
            result_text = response["choices"][0]["message"]["content"]
            #DEBUG
            logger.info("================ RAW LLM DUMP ================\n" 
                        f"{result_text}\n"
                        "==============================================")
            
            think_match = re.search(r'(?:<think>\s*)?(.*?)</think>', result_text, re.DOTALL | re.IGNORECASE)
            reasoning = think_match.group(1).strip() if think_match else "No explicit reasoning provided."
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', result_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1).strip()
                parsed = json.loads(json_str)
            else:
                # ROBUST FALLBACK: Hunt for the actual curly braces
                start = result_text.find('{')
                end = result_text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    json_str = result_text[start:end+1]
                    parsed = json.loads(json_str)
                else:
                    # Token Starvation Check
                    logger.warning("No curly braces found in VLM response. The model may have hit the max_tokens limit before finishing.")
                    parsed = {"fake_probability": 0.5}

            fake_prob = float(parsed.get("fake_probability", 0.5))
            return max(0.0, min(1.0, fake_prob)), reasoning
            
        except Exception as e:
            logger.error(f"VLM Classification failed: {e}")
            # Graceful degradation: return uncertain (0.5) if parsing fails
            return 0.5, "Analysis failed due to a processing error."

    def chat_inference(self, user_prompt: str, forensic_thoughts: str, history: list = None) -> str:
        try:
            messages = [{"role": "system", "content": f"You are 'Xite', a helpful GenZ AI assistant, you are part of a deepfake detection platform with a forensic dashboard. Here is the reasoning from the vision engine upon analysis of the provide image by the user:\n\n{forensic_thoughts}\n\n. Please use it strictly when necessary. Your main task is to answer the user's questions and query. Only use  content from 'forensic_thoughts' if it is applicable to the user's query. Try to keep your response short, you can go on for a few paragraphs. More importantly, keep your reasoning concise as well. Basically, dont stress to hard bro. Be a bit GenZ, have a cool lingo and talk to the point, keep it to a minimal. Most importantly, have fun"}]
            
            if history:
                messages.extend(history[-6:])

            messages.append({"role": "user", "content": user_prompt})

            response = self.llm.create_chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Chat inference failed: {e}")
            raise RuntimeError("Failed to generate chat response.")

    def _preprocess_to_base64(self, image: np.ndarray) -> str:     

        success, buffer = cv2.imencode('.jpg', image)
        if not success:
            raise ValueError("Could not encode image to JPEG")
            
        return base64.b64encode(buffer).decode('utf-8')