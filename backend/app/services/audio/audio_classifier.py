import numpy as np
import onnxruntime as ort
from typing import List, Union
from transformers import ClapProcessor
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AudioClassifier:
    def __init__(self, onnx_model_path: str, text_embeddings_path: str, processor_path: str):
        self.onnx_model_path = onnx_model_path
        self.text_embeddings_path = text_embeddings_path
        try:
            self.processor = ClapProcessor.from_pretrained(processor_path, local_files_only=True)
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            self.session = ort.InferenceSession(self.onnx_model_path, providers=providers)
            logger.info(f'Loaded CLAP model from: {self.onnx_model_path}')
            logger.info(f'Active ONNX Execution Providers: {self.session.get_providers()}')
            
            text_data = np.load(self.text_embeddings_path, allow_pickle=True).item()
            self.text_features = text_data['features'] # Shape: (2, embed_dim)
            self.logit_scale = text_data['logit_scale']
            logger.info('successfully loaded audio text embeddings (.npy file)')

        except Exception as e:
            logger.error(f"Failed to load CLAP audio model: {e}")
            raise RuntimeError(f"AudioClassifier initialization failed: {e}")

    def classify(self, audio_data: Union[np.ndarray, List[np.ndarray]], sr: int) -> Union[float, List[float]]:
        try:
            inputs = self.processor(
                audio=audio_data,
                return_tensors='np',
                sampling_rate=sr,
                padding=True
            )

            input_features = inputs["input_features"].astype(np.float32)
            expected_inputs = [inp.name for inp in self.session.get_inputs()]
            ort_inputs = {
                'input_features': input_features
            }

            if 'is_longer' in expected_inputs:
                if 'is_longer' in inputs:
                    ort_inputs['is_longer'] = inputs['is_longer'].astype(bool)
                else:
                    ort_inputs['is_longer'] = np.array([False] * len(input_features), dtype=bool)

            audio_features = self.session.run(['audio_features'], ort_inputs)[0]
            logits_per_audio = self.logit_scale * np.dot(audio_features, self.text_features.T)
            exp_logits = np.exp(logits_per_audio - np.max(logits_per_audio, axis=-1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

            if isinstance(audio_data, np.ndarray) and probs.shape[0] == 1:
                return float(probs[0][1])

            return [float(p[1]) for p in probs]


        except Exception as e:
            logger.error(f"Audio Inference failed: {e}")
            raise RuntimeError(f"Audio Classification failed: {e}")

