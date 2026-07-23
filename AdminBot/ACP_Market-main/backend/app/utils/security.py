from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

logger = logging.getLogger("acp_market.security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": str(user_id), "role": role, "type": "access", "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return jwt.encode(
        {"sub": str(user_id), "type": "refresh", "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None


def generate_api_key() -> tuple[str, str]:
    """Returns (raw_key, hash). Raw key shown once to user, hash stored in DB."""
    raw = f"acp_{secrets.token_hex(24)}"
    return raw, hash_api_key(raw)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def set_auth_cookies(
    response,
    access_token: str,
    refresh_token: str,
    remember: bool = False,
) -> None:
    """Set HttpOnly auth cookies on the response."""
    from fastapi.responses import Response

    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_max_age = (
        settings.SESSION_COOKIE_MAX_AGE_DAYS * 86400
        if remember
        else settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=f"{settings.COOKIE_NAME}_refresh",
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",
    )


def clear_auth_cookies(response) -> None:
    """Remove auth cookies."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )
    response.delete_cookie(
        key=f"{settings.COOKIE_NAME}_refresh",
        path="/api/v1/auth",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )


def generate_license_key(plugin_id: str) -> str:
    return f"acp_lic_{plugin_id}_{secrets.token_hex(16)}"
