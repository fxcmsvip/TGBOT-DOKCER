from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, get_optional_user
from app.config import settings
from app.models.billing import License
from app.models.plugin import Plugin, PluginVersion
from app.models.user import MarketUser
from app.schemas.common import APIResponse
from packaging.version import Version

from app.schemas.plugin import (
    CheckUpdatesRequest,
    CheckUpdatesResponse,
    PluginDetail,
    PluginListItem,
    PluginVersionOut,
    UpdateAvailable,
)
from app.utils.signing import sign_bundle

logger = logging.getLogger("acp_market.api.plugins")

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("", response_model=APIResponse)
async def list_plugins(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Optional[str] = None,
    category: Optional[str] = None,
    sort: str = "popular",
    page: int = 1,
    page_size: int = 20,
    pricing: str = "all",
    min_panel_version: Optional[str] = None,
    author_id: Optional[int] = None,
):
    """List/search plugins (public)."""
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    # When querying as author, show all own plugins (including unpublished)
    if author_id is not None:
        query = select(Plugin).where(Plugin.author_id == author_id)
    else:
        query = select(Plugin).where(Plugin.is_published.is_(True))

    # Search filter
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Plugin.name.ilike(search),
                Plugin.description.ilike(search),
                Plugin.plugin_id.ilike(search),
            )
        )

    # Category filter
    if category:
        query = query.where(Plugin.categories.contains([category]))

    # Pricing filter
    if pricing == "free":
        query = query.where(Plugin.pricing_model == "free")
    elif pricing == "paid":
        query = query.where(Plugin.pricing_model != "free")

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    if sort == "popular":
        query = query.order_by(Plugin.download_count.desc())
    elif sort == "newest":
        query = query.order_by(Plugin.created_at.desc())
    elif sort == "updated":
        query = query.order_by(Plugin.updated_at.desc())
    else:
        query = query.order_by(Plugin.download_count.desc())

    query = query.offset(offset).limit(page_size)

    result = await db.execute(
        query.options(selectinload(Plugin.author), selectinload(Plugin.versions))
    )
    plugins = result.scalars().all()

    items = []
    for p in plugins:
        # Compute latest approved version (pending/rejected versions are not user-facing)
        latest_version = None
        review_status = None
        if p.versions:
            approved_versions = [
                v for v in p.versions if v.review_status == "approved"
            ]
            all_sorted = sorted(
                p.versions, key=lambda v: v.created_at or datetime.min, reverse=True
            )
            # latest_version = most recent approved version
            if approved_versions:
                approved_sorted = sorted(
                    approved_versions, key=lambda v: v.created_at or datetime.min, reverse=True
                )
                latest_version = approved_sorted[0].version
            # review_status = newest version's status (to show pending badge in admin)
            review_status = all_sorted[0].review_status if all_sorted else None

        items.append(
            PluginListItem(
                id=p.id,
                plugin_id=p.plugin_id,
                name=p.name,
                description=p.description,
                icon=p.icon,
                color=p.color,
                categories=p.categories,
                author_name=p.author.display_name if p.author else "Unknown",
                pricing_model=p.pricing_model,
                price_cents=p.price_cents,
                currency=p.currency,
                download_count=p.download_count,
                is_featured=p.is_featured,
                is_published=p.is_published,
                latest_version=latest_version,
                review_status=review_status,
                created_at=p.created_at,
                updated_at=p.updated_at,
            ).model_dump()
        )

    return APIResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


@router.get("/{plugin_id}", response_model=APIResponse)
async def get_plugin(
    plugin_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Plugin detail with version list (public)."""
    result = await db.execute(
        select(Plugin)
        .where(Plugin.plugin_id == plugin_id, Plugin.is_published.is_(True))
        .options(selectinload(Plugin.versions), selectinload(Plugin.author))
    )
    plugin = result.scalar_one_or_none()

    if plugin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plugin not found",
        )

    approved = [
        v for v in plugin.versions if v.review_status == "approved"
    ]
    approved_sorted = sorted(
        approved, key=lambda v: v.created_at or datetime.min, reverse=True
    )

    approved_versions = [
        PluginVersionOut(
            id=v.id,
            version=v.version,
            changelog=v.changelog,
            min_panel_version=v.min_panel_version,
            bundle_size=v.bundle_size,
            bundle_hash=v.bundle_hash,
            signature=v.signature,
            review_status=v.review_status,
            published_at=v.published_at,
            created_at=v.created_at,
        ).model_dump()
        for v in approved_sorted
    ]

    latest_version = approved_sorted[0].version if approved_sorted else None

    detail = PluginDetail(
        id=plugin.id,
        plugin_id=plugin.plugin_id,
        name=plugin.name,
        description=plugin.description,
        long_description=plugin.long_description,
        icon=plugin.icon,
        color=plugin.color,
        categories=plugin.categories,
        tags=plugin.tags,
        author_name=plugin.author.display_name if plugin.author else "Unknown",
        author_username=plugin.author.username if plugin.author else "unknown",
        pricing_model=plugin.pricing_model,
        price_cents=plugin.price_cents,
        currency=plugin.currency,
        download_count=plugin.download_count,
        is_featured=plugin.is_featured,
        latest_version=latest_version,
        versions=approved_versions,
        created_at=plugin.created_at,
        updated_at=plugin.updated_at,
    ).model_dump()

    return APIResponse(data=detail)


@router.get("/{plugin_id}/versions/{version}", response_model=APIResponse)
async def get_version(
    plugin_id: str,
    version: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Specific version detail (public)."""
    result = await db.execute(
        select(PluginVersion)
        .join(Plugin, Plugin.id == PluginVersion.plugin_id_fk)
        .where(
            Plugin.plugin_id == plugin_id,
            PluginVersion.version == version,
            PluginVersion.review_status == "approved",
        )
    )
    ver = result.scalar_one_or_none()

    if ver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found",
        )

    return APIResponse(data=PluginVersionOut(
        id=ver.id,
        version=ver.version,
        changelog=ver.changelog,
        min_panel_version=ver.min_panel_version,
        bundle_size=ver.bundle_size,
        bundle_hash=ver.bundle_hash,
        signature=ver.signature,
        review_status=ver.review_status,
        published_at=ver.published_at,
        created_at=ver.created_at,
    ).model_dump())


@router.post("", response_model=APIResponse, status_code=201)
async def submit_plugin(
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    bundle: UploadFile = File(...),
    metadata: str = Form(...),
):
    """Submit a new plugin (developer). Accepts multipart form: zip + metadata JSON."""
    import json

    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid metadata JSON",
        )

    plugin_id_str = meta.get("plugin_id")
    if not plugin_id_str:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="plugin_id is required in metadata",
        )

    # Validate plugin_id format (path traversal prevention)
    if not re.match(r'^[a-z][a-z0-9-]{2,49}$', plugin_id_str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid plugin ID format",
        )

    # Check uniqueness
    result = await db.execute(
        select(Plugin).where(Plugin.plugin_id == plugin_id_str)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plugin ID already exists",
        )

    version_str = meta.get("version", "1.0.0")

    # Validate version format (path traversal prevention)
    if not re.match(r'^\d+\.\d+\.\d+$', version_str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid version format",
        )

    # Read and hash the bundle
    MAX_BUNDLE_SIZE = 100 * 1024 * 1024  # 100MB
    content = await bundle.read()
    if len(content) > MAX_BUNDLE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bundle too large (max 100MB)",
        )
    bundle_hash = hashlib.sha256(content).hexdigest()
    bundle_size = len(content)

    # Save bundle to storage
    storage_dir = os.path.normpath(os.path.join(
        settings.PLUGIN_STORAGE_PATH, plugin_id_str, version_str
    ))
    if not storage_dir.startswith(os.path.normpath(settings.PLUGIN_STORAGE_PATH)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid path",
        )
    os.makedirs(storage_dir, exist_ok=True)
    bundle_path = os.path.join(storage_dir, "bundle.zip")
    with open(bundle_path, "wb") as f:
        f.write(content)

    # Create plugin record
    pricing = meta.get("pricing", {})
    plugin = Plugin(
        plugin_id=plugin_id_str,
        name=meta.get("name", plugin_id_str),
        description=meta.get("description", ""),
        long_description=meta.get("long_description"),
        icon=meta.get("icon"),
        color=meta.get("color"),
        categories=meta.get("categories", []),
        tags=meta.get("tags", []),
        author_id=current_user.id,
        pricing_model=pricing.get("model", "free"),
        price_cents=int(pricing.get("price", 0) * 100),
        currency=pricing.get("currency", "usd"),
        is_published=False,
    )
    db.add(plugin)
    await db.flush()

    # Sign the bundle
    signature = sign_bundle(content)

    # Create version record
    plugin_version = PluginVersion(
        plugin_id_fk=plugin.id,
        version=version_str,
        changelog=meta.get("changelog"),
        manifest=meta.get("manifest", {}),
        min_panel_version=meta.get("min_panel_version"),
        bundle_path=bundle_path,
        bundle_hash=bundle_hash,
        bundle_size=bundle_size,
        signature=signature,
        review_status="pending",
    )
    db.add(plugin_version)
    await db.flush()

    return APIResponse(
        code=201,
        message="Plugin submitted for review",
        data={
            "id": plugin.id,
            "plugin_id": plugin.plugin_id,
            "version": version_str,
            "review_status": "pending",
            "signed": signature is not None,
        },
    )


@router.post("/{plugin_id}/versions", response_model=APIResponse, status_code=201)
async def submit_version(
    plugin_id: str,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    bundle: UploadFile = File(...),
    metadata: str = Form(...),
):
    """Submit a new version (developer, owner only)."""
    import json

    # Find plugin and check ownership
    result = await db.execute(
        select(Plugin).where(Plugin.plugin_id == plugin_id)
    )
    plugin = result.scalar_one_or_none()

    if plugin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plugin not found",
        )

    if plugin.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the plugin owner can submit versions",
        )

    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid metadata JSON",
        )

    version_str = meta.get("version")
    if not version_str:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="version is required in metadata",
        )

    # Validate version format (path traversal prevention)
    if not re.match(r'^\d+\.\d+\.\d+$', version_str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid version format",
        )

    # Validate plugin_id format (path traversal prevention)
    if not re.match(r'^[a-z][a-z0-9-]{2,49}$', plugin_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid plugin ID format",
        )

    # Check version doesn't already exist
    result = await db.execute(
        select(PluginVersion).where(
            PluginVersion.plugin_id_fk == plugin.id,
            PluginVersion.version == version_str,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Version {version_str} already exists",
        )

    # Read and hash the bundle
    MAX_BUNDLE_SIZE = 100 * 1024 * 1024  # 100MB
    content = await bundle.read()
    if len(content) > MAX_BUNDLE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Bundle too large (max 100MB)",
        )
    bundle_hash = hashlib.sha256(content).hexdigest()
    bundle_size = len(content)

    # Save bundle
    storage_dir = os.path.normpath(os.path.join(
        settings.PLUGIN_STORAGE_PATH, plugin_id, version_str
    ))
    if not storage_dir.startswith(os.path.normpath(settings.PLUGIN_STORAGE_PATH)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid path",
        )
    os.makedirs(storage_dir, exist_ok=True)
    bundle_path = os.path.join(storage_dir, "bundle.zip")
    with open(bundle_path, "wb") as f:
        f.write(content)

    # Sign the bundle
    signature = sign_bundle(content)

    plugin_version = PluginVersion(
        plugin_id_fk=plugin.id,
        version=version_str,
        changelog=meta.get("changelog"),
        manifest=meta.get("manifest", {}),
        min_panel_version=meta.get("min_panel_version"),
        bundle_path=bundle_path,
        bundle_hash=bundle_hash,
        bundle_size=bundle_size,
        signature=signature,
        review_status="pending",
    )
    db.add(plugin_version)
    await db.flush()

    return APIResponse(
        code=201,
        message="Version submitted for review",
        data={
            "id": plugin_version.id,
            "plugin_id": plugin_id,
            "version": version_str,
            "review_status": "pending",
            "signed": signature is not None,
        },
    )


@router.get("/{plugin_id}/versions/{version}/download")
async def download_bundle(
    plugin_id: str,
    version: str,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Download bundle zip. For paid plugins, validates license."""
    # Fetch plugin + version
    result = await db.execute(
        select(PluginVersion)
        .join(Plugin, Plugin.id == PluginVersion.plugin_id_fk)
        .where(
            Plugin.plugin_id == plugin_id,
            PluginVersion.version == version,
            PluginVersion.review_status == "approved",
        )
    )
    ver = result.scalar_one_or_none()

    if ver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found or not approved",
        )

    # Get the parent plugin for pricing check
    result = await db.execute(
        select(Plugin).where(Plugin.plugin_id == plugin_id)
    )
    plugin = result.scalar_one_or_none()

    # For paid plugins, check license
    if plugin and plugin.pricing_model != "free":
        license_result = await db.execute(
            select(License).where(
                License.plugin_id_fk == plugin.id,
                License.user_id == current_user.id,
                License.status == "active",
            )
        )
        license_record = license_result.scalar_one_or_none()

        if license_record is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Valid license required to download this plugin",
            )

        # Check expiry
        if license_record.expires_at and license_record.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="License has expired",
            )

    # Increment download count
    if plugin:
        plugin.download_count += 1
        await db.commit()

    if not os.path.isfile(ver.bundle_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bundle file not found on server",
        )

    headers = {
        "X-Bundle-Hash": ver.bundle_hash,
    }
    if ver.signature:
        headers["X-Bundle-Signature"] = ver.signature

    return FileResponse(
        path=ver.bundle_path,
        filename=f"{plugin_id}-{version}.zip",
        media_type="application/zip",
        headers=headers,
    )


@router.post("/check-updates", response_model=APIResponse)
async def check_updates(
    body: CheckUpdatesRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Batch check for updates."""
    updates: list[dict] = []

    for installed in body.installed:
        result = await db.execute(
            select(Plugin)
            .where(Plugin.plugin_id == installed.id)
            .options(selectinload(Plugin.versions))
        )
        plugin = result.scalar_one_or_none()
        if plugin is None:
            continue

        # Find latest approved version
        approved = [
            v for v in plugin.versions
            if v.review_status == "approved"
        ]
        if not approved:
            continue

        # Sort by semantic version
        approved.sort(key=lambda v: Version(v.version), reverse=True)
        latest = approved[0]

        if latest.version != installed.version:
            # Check panel version compatibility
            if (
                body.panel_version
                and latest.min_panel_version
                and latest.min_panel_version > body.panel_version
            ):
                continue

            updates.append(
                UpdateAvailable(
                    plugin_id=plugin.plugin_id,
                    current_version=installed.version,
                    latest_version=latest.version,
                    changelog=latest.changelog,
                    bundle_size=latest.bundle_size,
                    min_panel_version=latest.min_panel_version,
                ).model_dump()
            )

    return APIResponse(data=CheckUpdatesResponse(updates=updates).model_dump())
