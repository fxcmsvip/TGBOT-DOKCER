"""
Fernet encryption for OAuth token data.

Only encrypts access_token and refresh_token fields;
expires_at stays plaintext for efficient scheduled queries.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from cryptography.fernet import Fernet

from app.config import settings

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    key = settings.OAUTH_ENCRYPTION_KEY
    if not key:
        key = Fernet.generate_key().decode()
        logger.error(
            "OAUTH_ENCRYPTION_KEY is empty — auto-generated an ephemeral key. "
            "All previously encrypted data will be unreadable. "
            "Set OAUTH_ENCRYPTION_KEY in .env immediately and restart.",
        )
        settings.OAUTH_ENCRYPTION_KEY = key

    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_oauth_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Encrypt access_token and refresh_token fields in oauth_data dict."""
    if not data:
        return data
    f = _get_fernet()
    result = dict(data)
    for field in ("access_token", "refresh_token"):
        if field in result and result[field]:
            result[field] = f.encrypt(result[field].encode()).decode()
    return result


def decrypt_oauth_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Decrypt access_token and refresh_token fields in oauth_data dict."""
    if not data:
        return data
    f = _get_fernet()
    result = dict(data)
    for field in ("access_token", "refresh_token"):
        if field in result and result[field]:
            try:
                result[field] = f.decrypt(result[field].encode()).decode()
            except Exception:
                logger.error(
                    "Failed to decrypt %s — OAUTH_ENCRYPTION_KEY may have changed",
                    field,
                )
                raise ValueError(
                    f"Cannot decrypt {field}. Check OAUTH_ENCRYPTION_KEY."
                )
    return result


# ---------------------------------------------------------------------------
# Bot token encryption (reuses the same Fernet key)
# ---------------------------------------------------------------------------

def encrypt_bot_token(token: str) -> str:
    """Encrypt a Telegram bot token for storage."""
    f = _get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_bot_token(encrypted: str) -> str:
    """Decrypt a Telegram bot token from storage."""
    if not encrypted:
        return encrypted
    f = _get_fernet()
    try:
        return f.decrypt(encrypted.encode()).decode()
    except Exception:
        logger.error("Failed to decrypt bot token — OAUTH_ENCRYPTION_KEY may have changed")
        raise ValueError("Cannot decrypt bot token. Check OAUTH_ENCRYPTION_KEY.")
