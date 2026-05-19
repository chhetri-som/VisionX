import numpy as np
import librosa
from typing import Tuple, List
from pathlib import Path
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AudioPreprocessor:
    def __init__(self, target_sr: int = 48000):
        self.target_sr = target_sr
        logger.info(f"AudioPreprocessor initialize with target_sample_rate={target_sr}")

    def load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        try:
            if not Path(file_path).exists():
                raise FileNotFoundError(f"Audio file not found: {file_path}")
            audio, sr = librosa.load(file_path, sr=None, mono=True)
            logger.info(f"Loaded audio: path: {file_path}, shape={audio.shape}, sr={sr}")
            return audio, sr

        except Exception as e:
            logger.error(f"Failed to load audio file: {str(e)}")
            raise 

    def normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        try:
            max_val = np.max(np.abs(audio))
            if max_val == 0:
                logger.info('Audio is silent (all zeros), returning as-is')
                return audio

            logger.info(f'Audio normalized: max before={max_val:.4f}')
            return audio / max_val
        except Exception as e:
            logger.error(f"Failed to normalize audio: {str(e)}")
            raise

    def resample(self, audio: np.ndarray, sr: int, target_sr: int = None) -> np.ndarray:
        if target_sr is None:
            target_sr = self.target_sr
        try:
            if sr == target_sr:
                logger.info(f"Audio already at {target_sr}Hz, no resampling required")
                return audio

            resampled = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            logger.info(f'Resampling audio from {sr} Hz to {target_sr} Hz')
            return resampled
        except Exception as e:
            logger.error(f"Failed to resample audio: {str(e)}")
            raise

    def segment_audio(self, audio: np.ndarray, sr: int, segment_length: float = 3.0, overlap: float = 0.5) -> List[np.ndarray]:
        try:
            segment_samples = int(segment_length * sr)
            hop_samples = int(segment_samples * (1 - overlap))
            segments = []
            start = 0
            
            # create fixed-length segments with overlap
            while start + segment_samples <= len(audio):
                segment = audio[start:start + segment_samples]
                segments.append(segment)
                start += hop_samples

            # handle last segment if its shorter than sample length
            if start < len(audio):
                last_segment = audio[start:]
                # pad to match segment_samples length
                if len(last_segment) < segment_samples:
                    last_segment = np.pad(
                        last_segment,
                        (0, segment_samples - len(last_segment)),
                        mode='constant',
                        constant_values=0
                    )
                segments.append(last_segment)

            logger.info(f'Segmented audio: total_len={len(audio)}, segment_length={segment_length}s, overlap={overlap*100:.0f}%, num_segments={len(segments)}, segment_samples={segment_samples}')
            return segments

        except Exception as e:
            logger.error(f"Failed to segment audio: {str(e)}")
            raise