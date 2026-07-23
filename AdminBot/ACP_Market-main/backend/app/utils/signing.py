"""Ed25519 bundle signing utilities.

Signs plugin bundles with the Market's private key.
Panel instances fetch the corresponding public key to verify downloads.
"""
from __future__ import annotations

import base64
import logging

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PublicFormat,
    load_pem_private_key,
)

from app.config import settings

logger = logging.getLogger("acp_market.signing")

_private_key: Ed25519PrivateKey | None = None
_loaded = False


def _load_private_key() -> Ed25519PrivateKey | None:
    """Load the Ed25519 private key from config (lazy, cached)."""
    global _private_key, _loaded
    if _loaded:
        return _private_key

    _loaded = True
    pem = settings.ED25519_PRIVATE_KEY.replace("\\n", "\n").strip()
    if not pem:
        logger.warning(
            "ED25519_PRIVATE_KEY not set — bundle signing disabled. "
            "Generate a keypair with: python -c "
            "\"from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey; "
            "from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat; "
            "k = Ed25519PrivateKey.generate(); "
            "print(k.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode())\""
        )
        return None

    try:
        key = load_pem_private_key(pem.encode(), password=None)
        if not isinstance(key, Ed25519PrivateKey):
            raise TypeError("ED25519_PRIVATE_KEY is not an Ed25519 key")
        _private_key = key
        logger.info("Ed25519 signing key loaded successfully")
        return _private_key
    except Exception as exc:
        # Key is configured but invalid — fail hard so operator notices
        raise RuntimeError(
            f"ED25519_PRIVATE_KEY is set but cannot be loaded: {exc}. "
            f"Fix the key or remove it to disable signing."
        ) from exc


def is_signing_enabled() -> bool:
    """Check whether bundle signing is configured."""
    return _load_private_key() is not None


def sign_bundle(content: bytes) -> str | None:
    """Sign bundle content with Ed25519 private key.

    Args:
        content: Raw bundle bytes to sign.

    Returns:
        Base64-encoded signature string, or None if signing is disabled.
    """
    key = _load_private_key()
    if key is None:
        return None
    try:
        signature = key.sign(content)
        return base64.b64encode(signature).decode("ascii")
    except Exception as exc:
        logger.error("Failed to sign bundle (%d bytes): %s", len(content), exc)
        return None


def get_public_key_pem() -> str | None:
    """Derive the Ed25519 public key from the private key, in PEM format.

    Returns:
        PEM-encoded public key string, or None if no private key is configured.
    """
    key = _load_private_key()
    if key is None:
        return None
    pub: Ed25519PublicKey = key.public_key()
    return pub.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo).decode("ascii")
