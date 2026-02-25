"""
Occlusion sensitivity heatmap generation.
Strategy: Mask patches of the image and track confidence change.
"""
import numpy as np
import cv2
import time
from typing import List, Tuple, Optional, Callable
from app.core.config import SALIENCY_PATCH_SIZE

class SaliencyMapper:
    """
    Computes occlusion sensitivity heatmaps showing important regions.
    Optimized for 14x14 grid output (Decision 3).
    """
    
    DEFAULT_FACE_SIZE = 224

    def __init__(
        self, 
        classifier, 
        patch_size: int = SALIENCY_PATCH_SIZE,
        face_size: int = DEFAULT_FACE_SIZE
    ):
        """
        Args:
            classifier: DeepfakeClassifier instance or callable
            patch_size: Size of patches to mask (default 16)
            face_size: Expected input face size (default 224)
        """
        self.classifier = classifier
        self.patch_size = patch_size
        self.face_size = face_size
        
        # Compute fixed grid dimensions
        self.grid_height = self.face_size // self.patch_size
        self.grid_width = self.face_size // self.patch_size

    def compute(self, face_image: np.ndarray, verbose: bool = True) -> List[List[float]]:
        """
        Compute occlusion sensitivity heatmap.
        
        Returns:
            heatmap_2d: List[List[float]] normalized to [0, 1], JSON-serializable.
        """
        start_time = time.time()
        
        # Ensure image matches expected size for grid consistency
        if face_image.shape[0] != self.face_size or face_image.shape[1] != self.face_size:
            face_image = cv2.resize(face_image, (self.face_size, self.face_size))

        # 1. Get baseline confidence (unmasked)
        # Handles both class instance and direct callable
        if hasattr(self.classifier, 'classify'):
            baseline_confidence = self.classifier.classify(face_image)
        else:
            baseline_confidence = self.classifier(face_image)

        if verbose:
            print(f"🔍 Computing saliency [{self.grid_height}x{self.grid_width} grid]...")

        # 2. Initialize importance grid
        importance_grid = np.zeros((self.grid_height, self.grid_width), dtype=np.float32)
        
        # 3. Process each patch
        for i in range(self.grid_height):
            for j in range(self.grid_width):
                y1, y2 = i * self.patch_size, (i + 1) * self.patch_size
                x1, x2 = j * self.patch_size, (j + 1) * self.patch_size
                
                # Create masked version (Neutral Gray)
                masked_image = face_image.copy()
                masked_image[y1:y2, x1:x2] = 128
                
                # Inference
                if hasattr(self.classifier, 'classify'):
                    masked_conf = self.classifier.classify(masked_image)
                else:
                    masked_conf = self.classifier(masked_image)
                
                # Importance = drop in confidence
                importance_grid[i, j] = max(0, baseline_confidence - masked_conf)

        # 4. Normalize to [0, 1]
        max_importance = importance_grid.max()
        if max_importance > 0:
            importance_grid = importance_grid / max_importance
        
        elapsed = time.time() - start_time
        if verbose:
            print(f"✅ Saliency computed in {elapsed:.2f}s")
        
        # Return as JSON-serializable list
        return importance_grid.tolist()

    @staticmethod
    def upsample_heatmap(
        heatmap_2d: List[List[float]], 
        target_size: Tuple[int, int] = (224, 224)
    ) -> np.ndarray:
        """Upsample 14x14 grid to full resolution for visualization."""
        heatmap_np = np.array(heatmap_2d, dtype=np.float32)
        return cv2.resize(heatmap_np, target_size, interpolation=cv2.INTER_LINEAR)

    def visualize_heatmap(self, original_image: np.ndarray, heatmap_2d: List[List[float]]) -> np.ndarray:
        """Create BGR overlay for debugging/reporting."""
        h, w = original_image.shape[:2]
        upsampled = self.upsample_heatmap(heatmap_2d, (w, h))
        
        # Convert to 0-255 Heatmap
        heatmap_normalized = (upsampled * 255).astype(np.uint8)
        heatmap_colored = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)
        
        return cv2.addWeighted(original_image, 0.6, heatmap_colored, 0.4, 0)
