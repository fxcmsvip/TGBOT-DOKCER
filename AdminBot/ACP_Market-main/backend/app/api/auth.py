from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.billing import ApiKey
from app.models.user import MarketUser
from app.schemas.auth import (
    ApiKeyCreate,
    ApiKeyResponse,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import APIResponse
from app.utils.security import (
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_password,
    set_auth_cookies,
    verify_password,
)

logger = logging.getLogger("acp_market.api.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=APIResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new developer account."""
    # Check email uniqueness
    result = await db.execute(
        select(MarketUser).where(MarketUser.email == body.email)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "Email already registered"},
        )

    # Check username uniqueness
    result = await db.execute(
        select(MarketUser).where(MarketUser.username == body.username)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "USERNAME_ALREADY_EXISTS", "message": "Username taken"},
        )

    user = MarketUser(
        email=body.email,
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role="developer",
        github_url=getattr(body, "github_url", None),
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": UserResponse.model_validate(user).model_dump(),
    }

    response = JSONResponse(
        status_code=201,
        content=APIResponse(code=201, message="Registration successful", data=data).model_dump(),
    )
    set_auth_cookies(response, access_token, refresh_token, remember=False)
    return response


@router.post("/login", response_model=APIResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Login with email and password."""
    result = await db.execute(
        select(MarketUser).where(MarketUser.email == body.email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password incorrect"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_SUSPENDED", "message": "Account has been suspended"},
        )

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": UserResponse.model_validate(user).model_dump(),
    }
    response = JSONResponse(content=APIResponse(data=data).model_dump())
    set_auth_cookies(response, access_token, refresh_token, remember=body.remember_me)
    return response


@router.post("/refresh", response_model=APIResponse)
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Refresh an expired access token."""
    from app.config import settings as cfg

    # Try body first, then fall back to cookie
    token = body.refresh_token
    if not token:
        token = request.cookies.get(f"{cfg.COOKIE_NAME}_refresh")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "No refresh token provided"},
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "Token expired or invalid"},
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(MarketUser).where(MarketUser.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_REVOKED", "message": "Token has been revoked"},
        )

    access_token = create_access_token(user.id, user.role)
    new_refresh_token = create_refresh_token(user.id)

    data = {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": 900,
    }
    response = JSONResponse(content=APIResponse(data=data).model_dump())
    set_auth_cookies(response, access_token, new_refresh_token, remember=True)
    return response


@router.post("/logout", response_model=APIResponse)
async def logout():
    """Clear auth cookies."""
    response = JSONResponse(content=APIResponse(message="Logged out").model_dump())
    clear_auth_cookies(response)
    return response


@router.get("/me", response_model=APIResponse)
async def get_me(
    current_user: Annotated[MarketUser, Depends(get_current_user)],
):
    """Return current user info."""
    return APIResponse(data=UserResponse.model_validate(current_user).model_dump())


@router.post("/api-keys", response_model=APIResponse, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate a new API key. Returns the raw key ONCE."""
    VALID_SCOPES = {"registry:read", "registry:write", "billing:read", "billing:write"}

    if body.scopes:
        invalid = set(body.scopes) - VALID_SCOPES
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid scopes: {', '.join(sorted(invalid))}",
            )

    raw_key, key_hash = generate_api_key()

    api_key = ApiKey(
        user_id=current_user.id,
        key_hash=key_hash,
        key_prefix=raw_key[:12],
        name=body.name,
        scopes=body.scopes or ["registry:read", "billing:read"],
        is_active=True,
    )
    db.add(api_key)
    await db.flush()

    return APIResponse(
        code=201,
        message="API key created",
        data={
            "id": api_key.id,
            "name": api_key.name,
            "key": raw_key,  # Only returned once
            "scopes": api_key.scopes,
            "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
            "last_used_at": None,
        },
    )


@router.get("/api-keys", response_model=APIResponse)
async def list_api_keys(
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List user's API keys (prefix only, not full key)."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id, ApiKey.is_active.is_(True))
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()

    items = [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=k.scopes,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
        ).model_dump()
        for k in keys
    ]
    return APIResponse(data=items)


@router.delete("/api-keys/{key_id}", response_model=APIResponse)
async def revoke_api_key(
    key_id: int,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke an API key."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    api_key.is_active = False
    await db.flush()

    return APIResponse(message="API key revoked")


@router.post("/forgot-password", response_model=APIResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Send a password reset email. Always returns 200 to prevent email enumeration."""
    import secrets
    from datetime import datetime, timedelta

    from app.config import settings as cfg
    from app.utils.email import send_email

    result = await db.execute(
        select(MarketUser).where(MarketUser.email == body.email)
    )
    user = result.scalar_one_or_none()

    if user is not None:
        token = secrets.token_urlsafe(48)
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(
            minutes=cfg.PASSWORD_RESET_EXPIRE_MINUTES
        )
        await db.flush()

        reset_url = f"{cfg.FRONTEND_URL}/reset-password?token={token}"
        html = (
            f"<h2>Password Reset</h2>"
            f"<p>Click the link below to reset your password. "
            f"This link expires in {cfg.PASSWORD_RESET_EXPIRE_MINUTES} minutes.</p>"
            f'<p><a href="{reset_url}">Reset Password</a></p>'
            f"<p>If you didn't request this, you can ignore this email.</p>"
        )
        await send_email(body.email, "ACP Market — Password Reset", html)

    return APIResponse(message="If that email exists, a reset link has been sent.")


@router.post("/reset-password", response_model=APIResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Reset password using the token from the email link."""
    from datetime import datetime

    result = await db.execute(
        select(MarketUser).where(
            MarketUser.password_reset_token == body.token,
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if user.password_reset_expires is None or user.password_reset_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )

    user.password_hash = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.flush()

    return APIResponse(message="Password has been reset successfully.")


@router.post("/change-password", response_model=APIResponse)
async def change_password(
    body: PasswordChangeRequest,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Change the current user's password."""
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password",
        )
    current_user.password_hash = hash_password(body.new_password)
    await db.flush()
    return APIResponse(message="Password changed successfully")
