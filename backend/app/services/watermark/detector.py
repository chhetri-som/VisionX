import os
import json
import struct
import hashlib
import logging
from typing import Optional, Tuple, List, Dict, Any

import numpy as np
import cv2

from cryptography.hazmat.primitives.asymmetric.ec import ECDSA, EllipticCurvePublicKey
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from reedsolo import RSCodec

from app.services.watermark.common import KeyPair, WatermarkPayload, _gf_mul, _gf_div

logger = logging.getLogger("watermark.detector")

def shamir_reconstruct(shares: list[tuple[int, bytes]]) -> bytes:
    if not shares: raise ValueError("No shares provided")
    secret_len = len(shares[0][1])
    secret = bytearray(secret_len)
    xs, ys_all = [s[0] for s in shares], [s[1] for s in shares]

    for byte_idx in range(secret_len):
        ys = [y[byte_idx] for y in ys_all]
        result = 0
        for i, (xi, yi) in enumerate(zip(xs, ys)):
            numerator, denominator = yi, 1
            for j, xj in enumerate(xs):
                if i != j:
                    numerator = _gf_mul(numerator, xj)
                    denominator = _gf_mul(denominator, xi ^ xj)
            result ^= _gf_div(numerator, denominator)
        secret[byte_idx] = result
    return bytes(secret)

def _frame_rng(key: bytes, frame_idx: int) -> np.random.Generator:
    seed_material = hashlib.sha256(key + struct.pack(">Q", frame_idx)).digest()
    return np.random.default_rng(int.from_bytes(seed_material[:8], "big"))

def _extract_share_from_frame(frame_bgr: np.ndarray, share_len: int, frame_idx: int, key: bytes, delta: int = 2) -> bytes:
    plane = frame_bgr[:, :, 0]
    H, W = plane.shape
    rng = _frame_rng(key, frame_idx)

    n_bits = share_len * 8
    recovered_bits = np.zeros(n_bits, dtype=np.uint8)
    REPS = 16
    positions = rng.choice(H * W, size=min(n_bits * REPS, H * W), replace=False)
    
    bit_ptr, pos_in_group, bit_votes = 0, 0, []
    for pixel_pos in positions:
        row, col = pixel_pos // W, pixel_pos % W
        bit_votes.append((int(plane[row, col]) // delta) % 2)
        pos_in_group += 1
        
        if pos_in_group == REPS or pixel_pos == positions[-1]:
            recovered_bits[bit_ptr] = 1 if sum(bit_votes) >= len(bit_votes) // 2 else 0
            bit_ptr += 1
            bit_votes, pos_in_group = [], 0
            if bit_ptr >= n_bits: break
    
    return np.packbits(recovered_bits).tobytes()[:share_len]

def _decrypt_payload(ciphertext: bytes, nonce: bytes, aes_key: bytes) -> bytes:
    return AESGCM(aes_key).decrypt(nonce, ciphertext, None)

def _verify_signature(payload_bytes: bytes, signature: bytes, public_key: EllipticCurvePublicKey) -> bool:
    try:
        public_key.verify(signature, payload_bytes, ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False

def _try_reconstruct(shares: List[Tuple[int, bytes]], keys: KeyPair, frames_used: int, frames_total: int, secret_len: int, fec_nsym: int) -> Dict[str, Any]:
    try: fec_encoded = shamir_reconstruct(shares)
    except Exception as e: return {"verified": False, "error": f"Shamir reconstruction failed: {e}"}

    if fec_nsym > 0:
        rs = RSCodec(fec_nsym)
        decoded_chunks = []
        for i in range(0, len(fec_encoded), 255):
            chunk = fec_encoded[i:i + 255]
            if len(chunk) != 255: return {"verified": False, "error": f"Truncated RS chunk at offset {i}"}
            try: decoded_chunks.append(bytes(rs.decode(chunk)[0]))
            except Exception as e: return {"verified": False, "error": f"RS decode failed: {e}"}
        secret = b"".join(decoded_chunks)[:secret_len]
    else:
        secret = fec_encoded[:secret_len]

    nonce, ciphertext = secret[-12:], secret[:-12]
    try: signed_blob = _decrypt_payload(ciphertext, nonce, keys.aes_key)
    except Exception as e: return {"verified": False, "error": f"Decryption failed: {e}"}

    try:
        offset = 0
        plen = struct.unpack_from(">I", signed_blob, offset)[0]
        offset += 4
        payload_bytes = signed_blob[offset:offset+plen]
        offset += plen
        slen = struct.unpack_from(">I", signed_blob, offset)[0]
        offset += 4
        signature = signed_blob[offset:offset+slen]
    except Exception as e:
        return {"verified": False, "error": f"Failed unpacking payload blob: {e}"}

    if not _verify_signature(payload_bytes, signature, keys.public_key):
        return {"verified": False, "error": "Signature verification failed."}

    return {"verified": True, "payload": WatermarkPayload.from_bytes(payload_bytes), "frames_used": frames_used, "frames_total": frames_total}

def detect_watermark(video_path: str, keys: KeyPair, meta_path: Optional[str] = None, share_len: Optional[int] = None, threshold: Optional[int] = None, secret_len: Optional[int] = None, fec_nsym: Optional[int] = None, n_shares: Optional[int] = None, delta: Optional[int] = None) -> Dict[str, Any]:
    if not meta_path: meta_path = video_path.rsplit(".", 1)[0] + ".wm_meta.json"

    _fec_nsym, _delta = fec_nsym if fec_nsym is not None else 64, max(2, delta) if delta is not None else 2
    if os.path.exists(meta_path):
        with open(meta_path) as f: meta = json.load(f)
        share_len, threshold = share_len or meta["share_len"], threshold or meta["threshold"]
        n_shares, secret_len = n_shares or meta["n_shares"], secret_len or meta.get("secret_len")
        _fec_nsym, _delta = fec_nsym if fec_nsym is not None else meta.get("fec_nsym", 64), max(2, int(delta if delta is not None else meta.get("strength", 2)))
    else:
        if share_len is None or threshold is None or secret_len is None:
            raise ValueError("Missing parameters. Provide a metadata file or exact share_len, threshold, and secret_len.")
        n_shares = n_shares or threshold

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): raise IOError(f"Cannot open video: {video_path}")

    n_frames_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    collected_shares, frame_idx = [], 0

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        share = _extract_share_from_frame(frame, share_len, frame_idx, keys.aes_key, _delta)
        collected_shares.append(((frame_idx % n_shares) + 1, share))
        frame_idx += 1

        if frame_idx >= threshold:
            seen = {xs: sb for xs, sb in collected_shares}
            if len(seen) >= threshold:
                result = _try_reconstruct(list(seen.items())[:threshold], keys, frame_idx, n_frames_total, secret_len, _fec_nsym)
                if result["verified"]:
                    cap.release()
                    return result
                if len(seen) == threshold: collected_shares.clear()
    cap.release()
    return {"verified": False, "error": f"Could not collect {threshold} distinct shares from {frame_idx} frames."}