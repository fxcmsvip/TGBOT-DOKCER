from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_reviewer
from app.models.plugin import Plugin, PluginVersion
from app.models.user import MarketUser
from app.schemas.common import APIResponse

logger = logging.getLogger("acp_market.api.review")

router = APIRouter(prefix="/review", tags=["review"])


class ReviewActionBody(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None


@router.get("/queue", response_model=APIResponse)
async def review_queue(
    reviewer: Annotated[MarketUser, Depends(require_reviewer)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    page_size: int = 20,
):
    """List pending review submissions (reviewer+)."""
    from sqlalchemy import func

    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = (
        select(PluginVersion)
        .where(PluginVersion.review_status == "pending")
        .order_by(PluginVersion.created_at.asc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.offset(offset)
        .limit(page_size)
        .options(
            selectinload(PluginVersion.plugin).selectinload(Plugin.author)
        )
    )
    submissions = result.scalars().all()

    items = []
    for s in submissions:
        author = s.plugin.author if s.plugin else None
        items.append({
            "id": s.id,
            "plugin_id": s.plugin.plugin_id if s.plugin else None,
            "plugin_name": s.plugin.name if s.plugin else None,
            "version": s.version,
            "review_status": s.review_status,
            "bundle_size": s.bundle_size,
            "bundle_hash": s.bundle_hash,
            "author_name": author.display_name if author else "Unknown",
            "author_username": author.username if author else "unknown",
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return APIResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/{submission_id}", response_model=APIResponse)
async def review_detail(
    submission_id: int,
    reviewer: Annotated[MarketUser, Depends(require_reviewer)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Review detail (reviewer+)."""
    result = await db.execute(
        select(PluginVersion)
        .where(PluginVersion.id == submission_id)
        .options(
            selectinload(PluginVersion.plugin).selectinload(Plugin.author)
        )
    )
    version = result.scalar_one_or_none()

    if version is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    author = version.plugin.author if version.plugin else None
    return APIResponse(data={
        "id": version.id,
        "plugin_id": version.plugin.plugin_id if version.plugin else None,
        "plugin_name": version.plugin.name if version.plugin else None,
        "version": version.version,
        "changelog": version.changelog,
        "manifest": version.manifest,
        "min_panel_version": version.min_panel_version,
        "bundle_size": version.bundle_size,
        "bundle_hash": version.bundle_hash,
        "review_status": version.review_status,
        "review_notes": version.review_notes,
        "reviewed_by": version.reviewed_by,
        "author_name": author.display_name if author else "Unknown",
        "author_username": author.username if author else "unknown",
        "published_at": version.published_at.isoformat() if version.published_at else None,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    })


@router.post("/{submission_id}/approve", response_model=APIResponse)
async def approve_submission(
    submission_id: int,
    reviewer: Annotated[MarketUser, Depends(require_reviewer)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Approve submission. Sets review_status=approved, published_at=now, is_published=true."""
    result = await db.execute(
        select(PluginVersion)
        .where(PluginVersion.id == submission_id)
        .options(selectinload(PluginVersion.plugin))
    )
    version = result.scalar_one_or_none()

    if version is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if version.review_status not in ("pending", "changes_requested"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve submission with status '{version.review_status}'",
        )

    version.review_status = "approved"
    version.reviewed_by = reviewer.id
    version.published_at = datetime.utcnow()

    # Also mark the parent plugin as published
    if version.plugin:
        version.plugin.is_published = True

    await db.flush()

    return APIResponse(message="Submission approved and published")


@router.post("/{submission_id}/reject", response_model=APIResponse)
async def reject_submission(
    submission_id: int,
    body: ReviewActionBody,
    reviewer: Annotated[MarketUser, Depends(require_reviewer)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Reject submission with reason."""
    result = await db.execute(
        select(PluginVersion).where(PluginVersion.id == submission_id)
    )
    version = result.scalar_one_or_none()

    if version is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if version.review_status not in ("pending", "changes_requested"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject submission with status '{version.review_status}'",
        )

    version.review_status = "rejected"
    version.reviewed_by = reviewer.id
    version.review_notes = body.reason or body.notes

    await db.flush()

    return APIResponse(message="Submission rejected")


@router.post("/{submission_id}/request-changes", response_model=APIResponse)
async def request_changes(
    submission_id: int,
    body: ReviewActionBody,
    reviewer: Annotated[MarketUser, Depends(require_reviewer)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Request changes with notes."""
    result = await db.execute(
        select(PluginVersion).where(PluginVersion.id == submission_id)
    )
    version = result.scalar_one_or_none()

    if version is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if version.review_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request changes for submission with status '{version.review_status}'",
        )

    version.review_status = "changes_requested"
    version.reviewed_by = reviewer.id
    version.review_notes = body.notes or body.reason

    await db.flush()

    return APIResponse(message="Changes requested")
