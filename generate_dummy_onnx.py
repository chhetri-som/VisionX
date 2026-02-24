"""
Dummy ONNX Model Generator
Creates a simple ONNX model that mimics EfficientNet-B0 for testing.
This lets you test the entire pipeline without needing a real deepfake detector.

Usage:
    python generate_dummy_onnx.py --output backend/app/models/efficientnet_b0.onnx

The dummy model:
- Accepts input: [1, 3, 224, 224] (batch, channels, height, width)
- Returns output: [1, 2] (logits for [real, fake] classes)
- Always returns deterministic output based on image hash
"""

import numpy as np
import onnx
import onnxruntime as ort
from onnx import helper, TensorProto
import argparse
from pathlib import Path


def create_dummy_onnx_model(output_path: str = "efficientnet_b0.onnx"):
    """
    Create a minimal ONNX model that mimics EfficientNet-B0 for testing.
    
    This model:
    1. Takes input [1, 3, 224, 224]
    2. Flattens it
    3. Passes through a simple linear layer
    4. Outputs [1, 2] logits (real vs fake)
    """
    
    # Input: [batch_size, 3, 224, 224]
    X = helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 224, 224])
    
    # Output: [batch_size, 2] (logits for 2 classes: real, fake)
    Y = helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 2])
    
    # Create initializers (weights and biases)
    # For simplicity, we'll create a model that:
    # 1. Flattens input to [1, 150528] (3*224*224)
    # 2. Reduces to [1, 2] via mean pooling
    
    # Flatten initializer
    flatten_shape = helper.make_tensor(
        name='flatten_shape',
        data_type=TensorProto.INT64,
        dims=[2],
        vals=[1, 150528]  # 3 * 224 * 224
    )
    
    # Create identity matrix for dummy computation
    # We'll just use a simple reshape and reduce operation
    
    # Node 1: Reshape to [1, 150528]
    reshape_node = helper.make_node(
        'Reshape',
        inputs=['input', 'flatten_shape'],
        outputs=['flattened'],
        name='reshape_layer'
    )
    
    # Node 2: ReduceMean to compress [1, 150528] -> [1, 2]
    # By reducing over specific axes, we get 2 values
    axes_const = helper.make_tensor(
        name='axes',
        data_type=TensorProto.INT64,
        dims=[1],
        vals=[1]  # Reduce axis 1 (the flattened dim)
    )
    
    # Actually, let's simplify: just use MatMul with dummy weights
    # Weight matrix: [150528, 2]
    np.random.seed(42)
    weights = np.random.randn(150528, 2).astype(np.float32) * 0.01
    weights_init = helper.make_tensor(
        name='weights',
        data_type=TensorProto.FLOAT,
        dims=[150528, 2],
        vals=weights.flatten().tolist(),
        raw=False
    )
    
    # Bias: [2]
    bias = np.array([0.0, 0.0], dtype=np.float32)
    bias_init = helper.make_tensor(
        name='bias',
        data_type=TensorProto.FLOAT,
        dims=[2],
        vals=bias.tolist(),
        raw=False
    )
    
    # Node: MatMul
    matmul_node = helper.make_node(
        'MatMul',
        inputs=['flattened', 'weights'],
        outputs=['logits_pre_bias'],
        name='matmul'
    )
    
    # Node: Add bias
    add_node = helper.make_node(
        'Add',
        inputs=['logits_pre_bias', 'bias'],
        outputs=['output'],
        name='add_bias'
    )
    
    # Create the graph
    graph = helper.make_graph(
        nodes=[reshape_node, matmul_node, add_node],
        name='DummyEfficientNet',
        inputs=[X],
        outputs=[Y],
        initializer=[flatten_shape, weights_init, bias_init]
    )
    
    # Create the model
    model = helper.make_model(graph, producer_name='visionx_test_generator')
    model.opset_import[0].version = 13
    
    # Save
    onnx.save(model, output_path)
    print(f"✅ Dummy ONNX model created: {output_path}")
    
    return output_path


def test_dummy_model(model_path: str):
    """Test that the dummy model works with ONNX Runtime."""
    print(f"\n🧪 Testing dummy model: {model_path}")
    
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    
    # Get input/output names
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    print(f"  Input: {input_name}, shape: {session.get_inputs()[0].shape}")
    print(f"  Output: {output_name}, shape: {session.get_outputs()[0].shape}")
    
    # Run inference with dummy image
    dummy_image = np.random.randn(1, 3, 224, 224).astype(np.float32) / 255.0
    
    outputs = session.run([output_name], {input_name: dummy_image})
    logits = outputs[0][0]
    
    print(f"  Output shape: {outputs[0].shape}")
    print(f"  Logits: {logits}")
    
    # Compute softmax to get probability
    logits_exp = np.exp(logits - logits.max())
    probs = logits_exp / logits_exp.sum()
    fake_prob = probs[1]
    
    print(f"  Fake probability: {fake_prob:.3f}")
    print(f"✅ Dummy model test passed!")
    
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate dummy ONNX model for testing")
    parser.add_argument(
        "--output",
        type=str,
        default="efficientnet_b0.onnx",
        help="Output path for ONNX model"
    )
    args = parser.parse_args()
    
    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Generate model
    model_path = create_dummy_onnx_model(str(output_path))
    
    # Test it
    test_dummy_model(model_path)
    
    print(f"\n✅ Ready to use! Copy this to your backend:")
    print(f"   backend/app/models/efficientnet_b0.onnx")
