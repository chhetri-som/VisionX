"""
Performance benchmarking for VisionX backend.
Measure latency of each pipeline stage.
"""
import time
import cv2
from app.services.face_detector import FaceDetector
from app.services.image_classifier import ImageClassifier
# from app.core.saliency_mapper import SaliencyMapper  # Removed

def benchmark_pipeline():
    # Load models
    detector = FaceDetector(...)
    classifier = ImageClassifier(...)
    # saliency = SaliencyMapper(...)  # Removed
    
    # Load test image
    image = cv2.imread('tests/fixtures/face_real.jpg')
    
    # Benchmark each stage
    times = {}
    
    # 1. Face detection
    start = time.time()
    face_result = detector.detect(image)
    times['face_detection'] = time.time() - start
    
    # 2. Image crop + resize
    start = time.time()
    face_crop = ...  # crop and resize
    times['crop_resize'] = time.time() - start
    
    # 3. Classification
    start = time.time()
    confidence = classifier.classify(face_crop)
    times['inference'] = time.time() - start
    
    # Print results
    print("\n=== Performance Baseline ===")
    for stage, elapsed in times.items():
        print(f"{stage:20s}: {elapsed*1000:6.1f}ms")
    total = sum(times.values())
    print(f"{'Total':20s}: {total*1000:6.1f}ms")
    
    # Performance targets
    target_pipeline = 0.300  # 300ms
    
    if total > target_pipeline:
        print(f"⚠️  Pipeline exceeds {target_pipeline}s target!")
    else:
        print("✅ Performance acceptable")