"""
Occlusion sensitivity heatmap generation.
Strategy: Mask patches of the image and track confidence change.
"""
import numpy as np
import cv2
from app.core.config import SALIENCY_PATCH_SIZE
import time

class SaliencyMapper:
    """Compute occlusion sensitivity heatmap showing important regions."""
    
    def __init__(self, classifier, patch_size: int = SALIENCY_PATCH_SIZE):
        """
        Args:
            classifier: DeepfakeClassifier instance
            patch_size: Size of patches to mask (16, 24, or 32)
        """
        self.classifier = classifier
        self.patch_size = patch_size
        
        # Validate patch size
        if patch_size not in [8, 16, 24, 32]:
            print(f"⚠️  Unusual patch_size {patch_size}, continuing anyway...")
    
    def compute_saliency(
        self,
        face_image: np.ndarray,
        original_confidence: float,
        verbose: bool = True
    ) -> np.ndarray:
        """
        Compute occlusion sensitivity heatmap.
        
        Algorithm:
        1. Divide face into patches (e.g., 16x16 regions)
        2. For each patch: mask it (set to mean color), run inference
        3. Importance = drop in confidence when patch is masked
        4. Return normalized heatmap
        
        Args:
            face_image: [H, W, 3] BGR array
            original_confidence: Confidence on unmasked image
            verbose: Print progress
        
        Returns:
            heatmap: [grid_h, grid_w] normalized to [0, 1]
        
        Time complexity: O(grid_h * grid_w * inference_time)
        For 224x224 image with patch_size=24: ~144 inferences, ~2-3 seconds
        """
        start_time = time.time()
        h, w = face_image.shape[:2]
        
        # Compute grid dimensions
        grid_h = h // self.patch_size
        grid_w = w // self.patch_size
        
        total_patches = grid_h * grid_w
        
        if verbose:
            print(f"🔍 Computing saliency...")
            print(f"   Image: {w}x{h}, Patch size: {self.patch_size}x{self.patch_size}")
            print(f"   Grid: {grid_h}x{grid_w} = {total_patches} patches")
            print(f"   Est. time: {total_patches * 0.05:.1f}s (assuming 50ms/inference)")
        
        # Initialize heatmap
        heatmap = np.zeros((grid_h, grid_w), dtype=np.float32)
        
        # Process each patch
        patches_processed = 0
        for i in range(grid_h):
            for j in range(grid_w):
                # Patch coordinates
                y1 = i * self.patch_size
                y2 = min((i + 1) * self.patch_size, h)
                x1 = j * self.patch_size
                x2 = min((j + 1) * self.patch_size, w)
                
                # Create masked version
                masked_image = face_image.copy()
                
                # Mask strategy: replace with mean color of patch
                patch_region = masked_image[y1:y2, x1:x2]
                mean_color = patch_region.mean(axis=(0, 1)).astype(np.uint8)
                masked_image[y1:y2, x1:x2] = mean_color
                
                # Classify masked image
                masked_confidence = self.classifier.classify(masked_image)
                
                # Importance = drop in confidence
                # If original_confidence=0.9 (likely fake) and masking drops to 0.5,
                # then this patch was important (importance = 0.4)
                importance = max(0, original_confidence - masked_confidence)
                heatmap[i, j] = importance
                
                patches_processed += 1
                
                # Progress indicator
                if verbose and patches_processed % max(1, total_patches // 5) == 0:
                    elapsed = time.time() - start_time
                    progress = patches_processed / total_patches
                    eta = elapsed / progress - elapsed if progress > 0 else 0
                    print(f"   [{patches_processed}/{total_patches}] ~{eta:.1f}s remaining")
        
        # Normalize to [0, 1]
        max_importance = heatmap.max()
        if max_importance > 0:
            heatmap = heatmap / max_importance
        
        elapsed = time.time() - start_time
        if verbose:
            print(f"✅ Saliency computed in {elapsed:.1f}s")
        
        return heatmap
    
    def visualize_heatmap(self, original_image: np.ndarray, heatmap: np.ndarray) -> np.ndarray:
        """
        Create visualization of heatmap overlaid on image.
        Useful for debugging and generating output images.
        
        Args:
            original_image: [H, W, 3] BGR image
            heatmap: [grid_h, grid_w] importance scores
        
        Returns:
            overlay: [H, W, 3] image with heatmap overlay
        """
        h, w = original_image.shape[:2]
        grid_h, grid_w = heatmap.shape
        
        # Upsample heatmap to match image size
        heatmap_upsampled = cv2.resize(
            heatmap,
            (w, h),
            interpolation=cv2.INTER_LINEAR
        )
        
        # Normalize to 0-255
        heatmap_normalized = (heatmap_upsampled * 255).astype(np.uint8)
        
        # Apply colormap: red (high) to green (low)
        heatmap_colored = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)
        
        # Blend with original
        overlay = cv2.addWeighted(original_image, 0.6, heatmap_colored, 0.4, 0)
        
        return overlay


def optimize_patch_size(image_height: int, target_time_seconds: float = 3.0) -> int:
    """
    Recommend patch size based on image dimensions and target time.
    
    Args:
        image_height: Height of image in pixels
        target_time_seconds: Desired computation time (default 3s)
    
    Returns:
        Recommended patch size (8, 16, 24, or 32)
    """
    # Approximate inference time per image: 50ms
    inference_time_ms = 50
    
    # Target number of patches
    target_patches = int((target_time_seconds * 1000) / inference_time_ms)
    
    # Grid size needed
    target_grid = int(np.sqrt(target_patches))
    
    # Patch size = image_height / grid_size
    optimal_patch = image_height / target_grid
    
    # Round to nearest standard size
    sizes = [8, 16, 24, 32]
    chosen_size = min(sizes, key=lambda x: abs(x - optimal_patch))
    
    return chosen_size