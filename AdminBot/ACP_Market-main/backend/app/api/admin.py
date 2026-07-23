from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.billing import License, Purchase
from app.models.plugin import Plugin, PluginVersion
from app.models.user import MarketUser
from app.schemas.auth import UserResponse
from app.schemas.common import APIResponse

logger = logging.getLogger("acp_market.api.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


class UpdateUserBody(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users", response_model=APIResponse)
async def list_users(
    admin: Annotated[MarketUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    page_size: int = 20,
    role: Optional[str] = None,
    q: Optional[str] = None,
):
    """List users (admin+)."""
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = select(MarketUser)

    if role:
        query = query.where(MarketUser.role == role)

    if q:
        search = f"%{q}%"
        from sqlalchemy import or_

        query = query.where(
            or_(
                MarketUser.email.ilike(search),
                MarketUser.username.ilike(search),
                MarketUser.display_name.ilike(search),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(MarketUser.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = result.scalars().all()

    items = [UserResponse.model_validate(u).model_dump() for u in users]

    return APIResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.patch("/users/{user_id}", response_model=APIResponse)
async def update_user(
    user_id: int,
    body: UpdateUserBody,
    admin: Annotated[MarketUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update user role/status (admin+). Cannot modify super_admin."""
    result = await db.execute(
        select(MarketUser).where(MarketUser.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify super_admin users",
        )

    # Only super_admin can promote to admin
    if body.role and body.role in ("admin", "super_admin") and admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can assign admin roles",
        )

    valid_roles = {"user", "developer", "reviewer", "admin"}
    if body.role:
        if body.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )
        user.role = body.role

    if body.is_active is not None:
        user.is_active = body.is_active

    await db.flush()

    return APIResponse(
        message="User updated",
        data=UserResponse.model_validate(user).model_dump(),
    )


@router.get("/stats", response_model=APIResponse)
async def platform_stats(
    admin: Annotated[MarketUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Platform statistics."""
    total_users = (
        await db.execute(select(func.count()).select_from(MarketUser))
    ).scalar() or 0

    total_plugins = (
        await db.execute(
            select(func.count()).select_from(
                select(Plugin).where(Plugin.is_published.is_(True)).subquery()
            )
        )
    ).scalar() or 0

    total_downloads = (
        await db.execute(
            select(func.coalesce(func.sum(Plugin.download_count), 0))
        )
    ).scalar() or 0

    total_revenue = (
        await db.execute(
            select(
                func.coalesce(func.sum(Purchase.amount_cents), 0)
            ).where(Purchase.status == "completed")
        )
    ).scalar() or 0

    total_platform_fees = (
        await db.execute(
            select(
                func.coalesce(func.sum(Purchase.platform_fee_cents), 0)
            ).where(Purchase.status == "completed")
        )
    ).scalar() or 0

    pending_reviews = (
        await db.execute(
            select(func.count()).select_from(
                select(PluginVersion)
                .where(PluginVersion.review_status == "pending")
                .subquery()
            )
        )
    ).scalar() or 0

    return APIResponse(data={
        "total_users": total_users,
        "total_plugins": total_plugins,
        "total_downloads": total_downloads,
        "total_revenue_cents": total_revenue,
        "platform_fees_cents": total_platform_fees,
        "pending_reviews": pending_reviews,
    })


@router.delete("/plugins/{plugin_id}", response_model=APIResponse)
async def force_remove_plugin(
    plugin_id: str,
    admin: Annotated[MarketUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Force remove a plugin (admin+)."""
    result = await db.execute(
        select(Plugin).where(Plugin.plugin_id == plugin_id)
    )
    plugin = result.scalar_one_or_none()

    if plugin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plugin not found",
        )

    # Delete versions first (cascade should handle this, but be explicit)
    await db.execute(
        delete(PluginVersion).where(PluginVersion.plugin_id_fk == plugin.id)
    )

    await db.delete(plugin)
    await db.flush()

    logger.info(
        "Plugin %s force-removed by admin %s (%s)",
        plugin_id, admin.id, admin.username,
    )

    return APIResponse(message=f"Plugin '{plugin_id}' removed")
