from __future__ import annotations

from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.plugins import router as plugins_router
from app.api.review import router as review_router
from app.api.signing import router as signing_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(plugins_router)
router.include_router(review_router)
router.include_router(billing_router)
router.include_router(admin_router)
router.include_router(signing_router)
