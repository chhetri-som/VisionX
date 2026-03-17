# backend/app/services/audio/audio_preprocessor.py
"""
Audio Preprocessing Service
- Load audio files (MP3, WAV, M4A, etc.)
- Normalize and resample audio
- Segment into overlapping chunks
- Extract MFCC features for ML models
"""

import numpy as np
import librosa
from typing import Tuple, List
from pathlib import Path
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AudioPreprocessor:
    def __init__(self, target_sr: int = 16000):
        self.target_sr = target_sr
        logger.info(f"AudioPreprocessor initialize with target_sample_rate={target_sr}")

    def load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file
        Args:
            file_path: Path to audio file
        Returns:
            Tuple of (audio_data, sample_rate)
        """
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
        """
        Normalize audio to [-1, 1] range.
        Args:
            audio: audio array
        
        Returns:
            normalized audio array
        """
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
        """
        Resample audio to target sample rate.
        Args:
            audio: audio array
            sr: sample rate
            target_sr: target sample rate
        Returns:
            resampled audio array
        """
        if target_sr is None:
            # set default
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
        """
        segment audio into fixed-length chunks with optional overlap
        returns:
            list of audio segments as numpy arrays
        """
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

    def extract_mfcc_features(self, audio: np.ndarray, sr: int, n_mfcc: int = 13) -> np.ndarray:
        """
        Extract MFCC (Mel-Frequency Cepstral Coefficients) features.

        Standard features for speed and audio classification.
        """
        try:
            mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=n_mfcc)
            logger.info(f'Extracted MFCC={mfcc.shape}')
            return mfcc
        except Exception as e:
            logger.error(f"Failed to extract MFCC features: {str(e)}")
            raise

    def extract_mel_spectrogram(self, audio: np.ndarray, sr: int, n_mels: int = 128) -> np.ndarray:
        try:
            mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=n_mels)
            # convert to decibel
            mel_db = librosa.power_to_db(mel, ref=np.max)
            logger.info(f"extracted mel spectogram: {mel.shape}, in decibel: {mel_db.shape}")
            return mel_db
        except Exception as e:
            logger.error(f"Failed to extract mel spectogram: {str(e)}")
            raise
        
    def extract_stft_features(self, audio: np.ndarray, sr: int, n_fft: int = 2048) -> np.ndarray:
        """extract STFT (Short-Time Fourier Transform) magnitude spectogram."""
        try:
            stft = np.abs(librosa.stft(audio, n_fft=n_fft))
            stft_db = librosa.power_to_db(stft**2, ref=np.max)
            logger.info(f"extracted STFT: {stft.shape}, in decibel: {stft_db.shape}")
            return stft_db
        except Exception as e:
            logger.error(f"Failed to extract STFT: {str(e)}")
            raise

