import os
import json
from dataclasses import dataclass, field
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey, EllipticCurvePublicKey
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# ── GF(2^8) Shamir Secret Sharing Math ────────────────────────────────────────
_GF_EXP = [0] * 512
_GF_LOG = [0] * 256

def _gf_init():
    x = 1
    for i in range(255):
        _GF_EXP[i] = x
        _GF_LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11d
    for i in range(255, 512):
        _GF_EXP[i] = _GF_EXP[i - 255]

_gf_init()

def _gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return _GF_EXP[(_GF_LOG[a] + _GF_LOG[b]) % 255]

def _gf_div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError("GF division by zero")
    if a == 0:
        return 0
    return _GF_EXP[(_GF_LOG[a] - _GF_LOG[b]) % 255]

def _gf_poly_eval(poly: list, x: int) -> int:
    result = 0
    for coeff in poly:
        result = _gf_mul(result, x) ^ coeff
    return result

# ── Key Management ────────────────────────────────────────────────────────────
@dataclass
class KeyPair:
    private_key: EllipticCurvePrivateKey = None
    public_key: EllipticCurvePublicKey = None
    aes_key: bytes = None

    @staticmethod
    def generate() -> "KeyPair":
        priv = ec.generate_private_key(ec.SECP256R1(), default_backend())
        return KeyPair(
            private_key=priv,
            public_key=priv.public_key(),
            aes_key=os.urandom(32),
        )

    def save(self, path: str):
        os.makedirs(path, exist_ok=True)
        if self.private_key:
            with open(os.path.join(path, "private_key.pem"), "wb") as f:
                f.write(self.private_key.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.PKCS8,
                    serialization.NoEncryption(),
                ))
        with open(os.path.join(path, "public_key.pem"), "wb") as f:
            f.write(self.public_key.public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            ))
        with open(os.path.join(path, "aes_key.bin"), "wb") as f:
            f.write(self.aes_key)

    @staticmethod
    def load(path: str) -> "KeyPair":
        priv_path = os.path.join(path, "private_key.pem")
        priv = None
        if os.path.exists(priv_path):
            with open(priv_path, "rb") as f:
                priv = serialization.load_pem_private_key(f.read(), None, default_backend())
                
        with open(os.path.join(path, "public_key.pem"), "rb") as f:
            pub = serialization.load_pem_public_key(f.read(), default_backend())
        with open(os.path.join(path, "aes_key.bin"), "rb") as f:
            aes = f.read()
            
        return KeyPair(private_key=priv, public_key=pub, aes_key=aes)

# ── Payload Definition ────────────────────────────────────────────────────────
@dataclass
class WatermarkPayload:
    creator_id: str
    model_id: str
    timestamp: str
    video_hash: str
    extra: dict = field(default_factory=dict)

    def to_bytes(self) -> bytes:
        return json.dumps({
            "creator_id": self.creator_id,
            "model_id": self.model_id,
            "timestamp": self.timestamp,
            "video_hash": self.video_hash,
            **self.extra,
        }, sort_keys=True).encode()

    @staticmethod
    def from_bytes(b: bytes) -> "WatermarkPayload":
        d = json.loads(b)
        return WatermarkPayload(
            creator_id=d.pop("creator_id"),
            model_id=d.pop("model_id"),
            timestamp=d.pop("timestamp"),
            video_hash=d.pop("video_hash"),
            extra=d,
        )