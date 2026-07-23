"""Public endpoints for bundle signing information."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.common import APIResponse
from app.utils.signing import get_public_key_pem, is_signing_enabled

router = APIRouter(prefix="/signing", tags=["signing"])


@router.get("/public-key", response_model=APIResponse)
async def get_public_key():
    """Return the Market's Ed25519 public key (PEM format).

    This is a public endpoint — no auth required.
    Panel instances use this to fetch the key for verifying plugin bundle signatures.
    """
    if not is_signing_enabled():
        raise HTTPException(
            status_code=404,
            detail="Bundle signing is not configured on this Market instance",
        )

    pem = get_public_key_pem()
    return APIResponse(data={
        "public_key": pem,
        "algorithm": "Ed25519",
    })
