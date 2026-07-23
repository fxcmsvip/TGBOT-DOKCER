from __future__ import annotations

import logging

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.user import MarketUser
from app.utils.security import hash_password

logger = logging.getLogger("acp_market.init_admin")


async def create_initial_admin() -> None:
    """Create the initial super_admin user if no admin exists."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(MarketUser).where(MarketUser.role == "super_admin")
        )
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("Super admin already exists, skipping creation")
            return

        admin = MarketUser(
            email=settings.INIT_ADMIN_EMAIL,
            username="admin",
            password_hash=hash_password(settings.INIT_ADMIN_PASSWORD),
            display_name="Admin",
            role="super_admin",
            is_active=True,
            is_verified=True,
        )
        session.add(admin)
        await session.commit()
        logger.info(
            "Initial super_admin created with email: %s",
            settings.INIT_ADMIN_EMAIL,
        )
