import os
import json
import struct
import hashlib
import logging
import subprocess
import shutil
from typing import Optional, Tuple, Dict, Any

import numpy as np
import cv2

from cryptography.hazmat.primitives.asymmetric.ec import ECDSA, EllipticCurvePrivateKey
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from reedsolo import RSCodec

from app.services.watermark.common import KeyPair, WatermarkPayload, _gf_poly_eval

logger = logging.getLogger("watermark.embedder")

def shamir_split(secret: bytes, n: int, k: int, rng: np.random.Generator) -> list[bytes]:
    if k > n or k < 2 or n > 255:
        raise ValueError("Invalid Shamir parameters")
    shares = [bytearray(len(secret)) for _ in range(n)]
    for byte_idx, byte_val in enumerate(secret):
        poly = [int(x) for x in rng.integers(1, 256, size=k - 1).tolist()]
        poly.append(byte_val)
        for i in range(n):
            shares[i][byte_idx] = _gf_poly_eval(poly, i + 1)
    return [bytes(s) for s in shares]

def _frame_rng(key: bytes, frame_idx: int) -> np.random.Generator:
    seed_material = hashlib.sha256(key + struct.pack(">Q", frame_idx)).digest()
    seed = int.from_bytes(seed_material[:8], "big")
    return np.random.default_rng(seed)

def _embed_share_in_frame(frame_bgr: np.ndarray, share: bytes, frame_idx: int, key: bytes, strength: float = 3.0) -> np.ndarray:
    result = frame_bgr.copy().astype(np.int16)
    CH = 0
    plane = result[:, :, CH]
    H, W = plane.shape
    rng = _frame_rng(key, frame_idx)

    share_bits = np.unpackbits(np.frombuffer(share, dtype=np.uint8))
    n_bits = len(share_bits)
    REPS = 16
    positions = rng.choice(H * W, size=min(n_bits * REPS, H * W), replace=False)
    delta = max(2, int(strength))

    bit_ptr = 0
    for pos_idx, pixel_pos in enumerate(positions):
        if bit_ptr >= n_bits: break
        row, col = pixel_pos // W, pixel_pos % W
        bit_val = int(share_bits[bit_ptr])
        val = int(plane[row, col])
        q = round(val / delta)
        
        if q % 2 != bit_val:
            q_lo, q_hi = q - 1, q + 1
            q = q_lo if abs(q_lo * delta - val) <= abs(q_hi * delta - val) else q_hi
            
        plane[row, col] = max(0, min(255, q * delta))
        if (pos_idx + 1) % REPS == 0: bit_ptr += 1
    
    result[:, :, CH] = np.clip(plane, 0, 255)
    return result.astype(np.uint8)

def _sign_payload(payload_bytes: bytes, private_key: EllipticCurvePrivateKey) -> bytes:
    return private_key.sign(payload_bytes, ECDSA(hashes.SHA256()))

def _encrypt_payload(signed_blob: bytes, aes_key: bytes) -> Tuple[bytes, bytes]:
    nonce = os.urandom(12)
    return AESGCM(aes_key).encrypt(nonce, signed_blob, None), nonce

def find_binary(name: str) -> Optional[str]:
    path = shutil.which(name)
    if path: return path
    for p in (f"/opt/homebrew/bin/{name}", f"/usr/local/bin/{name}", f"/usr/bin/{name}", f"/snap/bin/{name}"):
        if os.path.isfile(p) and os.access(p, os.X_OK): return p
    return None

def probe_video_properties(video_path: str) -> Dict[str, Any]:
    ffprobe_path = find_binary("ffprobe")
    if not ffprobe_path:
        cap = cv2.VideoCapture(video_path)
        props = {"width": int(cap.get(3)), "height": int(cap.get(4)), "fps": str(cap.get(5) or 25.0), "pix_fmt": "yuv420p", "bit_rate": None, "has_audio": False}
        cap.release()
        return props

    cmd = [ffprobe_path, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,pix_fmt,bit_rate", "-of", "json", video_path]
    stream = json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout)["streams"][0]
    has_audio = len(json.loads(subprocess.run([ffprobe_path, "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "json", video_path], capture_output=True, text=True).stdout).get("streams", [])) > 0
    return {"width": int(stream["width"]), "height": int(stream["height"]), "fps": stream["r_frame_rate"], "pix_fmt": stream.get("pix_fmt", "yuv420p"), "bit_rate": int(stream.get("bit_rate")) if stream.get("bit_rate", "N/A") != "N/A" else None, "has_audio": has_audio}

def embed_watermark(input_path: str, output_path: str, payload: WatermarkPayload, keys: KeyPair, strength: float = 2.0, threshold_fraction: float = 0.6, max_shares: int = 255, fec_nsym: int = 64) -> Dict[str, Any]:
    props = probe_video_properties(input_path)
    cap = cv2.VideoCapture(input_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret: break
        frames.append(frame)
    cap.release()

    N = len(frames)
    if N < 10: raise ValueError(f"Video too short ({N} frames).")

    n_shares = min(N, max_shares)
    M = max(2, int(n_shares * threshold_fraction))

    hasher = hashlib.sha256()
    for f in frames: hasher.update(f.tobytes())
    payload.video_hash = hasher.hexdigest()

    payload_bytes = payload.to_bytes()
    signature = _sign_payload(payload_bytes, keys.private_key)
    signed_blob = struct.pack(">I", len(payload_bytes)) + payload_bytes + struct.pack(">I", len(signature)) + signature

    ciphertext, nonce = _encrypt_payload(signed_blob, keys.aes_key)
    secret = ciphertext + nonce
    secret_len = len(secret)

    fec_nsym_used = int(fec_nsym) if fec_nsym and fec_nsym > 0 else 0
    if fec_nsym_used > 0:
        rs = RSCodec(fec_nsym_used)
        data_block = 255 - fec_nsym_used
        encoded_chunks = []
        for i in range(0, secret_len, data_block):
            chunk = secret[i:i+data_block]
            if len(chunk) < data_block: chunk += bytes([0] * (data_block - len(chunk)))
            encoded_chunks.append(rs.encode(chunk))
        fec_encoded = b"".join(encoded_chunks)
    else:
        fec_encoded = secret

    share_len = len(fec_encoded)
    rng = np.random.default_rng(int.from_bytes(hashlib.sha256(keys.aes_key + payload_bytes).digest()[:8], "big"))
    shares = shamir_split(fec_encoded, n_shares, M, rng)

    temp_dir = output_path.rsplit(".", 1)[0] + "_frames"
    os.makedirs(temp_dir, exist_ok=True)
    
    for i, frame in enumerate(frames):
        share = shares[i % n_shares]
        wm_frame = _embed_share_in_frame(frame, share, i, keys.aes_key, strength)
        cv2.imwrite(os.path.join(temp_dir, f"frame_{i:06d}.png"), wm_frame)
    
    output_video = output_path if output_path.endswith('.mkv') else output_path.replace('.mp4', '.mkv')
    cmd = [find_binary("ffmpeg"), "-y", "-framerate", str(props['fps']), "-i", os.path.join(temp_dir, "frame_%06d.png")]
    if props["has_audio"]: cmd.extend(["-i", input_path])
    cmd.extend(["-c:v", "ffv1", "-level", "3", "-pix_fmt", "gbrp"])
    if props["has_audio"]: cmd.extend(["-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0"])
    cmd.append(output_video)
    
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    shutil.rmtree(temp_dir)

    meta = {
        "n_shares": n_shares, "n_frames_total": N, "threshold": M, "share_len": share_len,
        "secret_len": secret_len, "fec_nsym": fec_nsym_used, "strength": strength, "video_hash": payload.video_hash,
    }
    meta_path = output_path.rsplit(".", 1)[0] + ".wm_meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    return {"output_path": output_video, "meta_path": meta_path, "n_frames": N, "threshold": M, "share_len": share_len, "payload": payload}