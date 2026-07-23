"""
REST API for movie request management and TMDB API key CRUD.
Plugin routes — mounted at /api/v1/p/movie-request/ by PluginManager.
"""
from __future__ import annotations

import logging
from typing import Annotated, Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import get_db, require_admin, require_super_admin
from app.models.admin import Admin
from app.schemas.common import APIResponse

from backend.models import MediaLibraryConfig, MovieRequest, MovieRequestUser, TmdbApiKey
from backend.schemas import (
    MediaLibraryConfigCreate,
    MediaLibraryConfigOut,
    MovieRequestDetail,
    MovieRequestOut,
    MovieRequestStats,
    MovieRequestUpdate,
    MovieRequestUserOut,
    TmdbApiKeyCreate,
    TmdbApiKeyOut,
)

router = APIRouter()


# ──────────────────────────────────────────────
#  Movie Requests
# ──────────────────────────────────────────────

@router.get("/stats", response_model=APIResponse)
async def get_request_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Get movie request statistics."""
    result = await db.execute(
        select(MovieRequest.status, func.count()).group_by(MovieRequest.status)
    )
    counts = {row[0]: row[1] for row in result.all()}

    total = sum(counts.values())
    stats = MovieRequestStats(
        total=total,
        pending=counts.get("pending", 0),
        fulfilled=counts.get("fulfilled", 0),
        rejected=counts.get("rejected", 0),
    )
    return APIResponse(data=stats.model_dump())


@router.get("", response_model=APIResponse)
async def list_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_admin)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    media_type: Optional[str] = Query(default=None),
) -> APIResponse:
    """List movie requests with pagination and filters."""
    query = select(MovieRequest)

    if status_filter:
        query = query.where(MovieRequest.status == status_filter)
    if media_type:
        query = query.where(MovieRequest.media_type == media_type)

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    total_pages = (total + page_size - 1) // page_size

    # Fetch
    query = query.order_by(MovieRequest.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return APIResponse(
        data={
            "items": [MovieRequestOut.model_validate(r).model_dump() for r in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    )


# ──────────────────────────────────────────────
#  TMDB API Keys
#  NOTE: These routes MUST be defined BEFORE /{request_id}
#  to avoid FastAPI matching "tmdb-keys" as a request_id int.
# ──────────────────────────────────────────────

def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "***"
    return key[:4] + "***" + key[-4:]


@router.get("/tmdb-keys", response_model=APIResponse)
async def list_tmdb_keys(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """List all TMDB API keys."""
    result = await db.execute(
        select(TmdbApiKey).order_by(TmdbApiKey.created_at.desc())
    )
    keys = result.scalars().all()

    items = []
    for k in keys:
        out = TmdbApiKeyOut(
            id=k.id,
            name=k.name,
            api_key_masked=_mask_key(k.api_key),
            access_token_masked=_mask_key(k.access_token) if k.access_token else None,
            is_active=k.is_active,
            is_rate_limited=k.is_rate_limited,
            rate_limited_until=k.rate_limited_until,
            request_count=k.request_count,
            created_at=k.created_at,
            updated_at=k.updated_at,
        )
        items.append(out.model_dump())

    return APIResponse(data={"items": items})


@router.post("/tmdb-keys", response_model=APIResponse)
async def create_tmdb_key(
    body: TmdbApiKeyCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Add a new TMDB API key."""
    key = TmdbApiKey(
        name=body.name,
        api_key=body.api_key,
        access_token=body.access_token,
    )
    db.add(key)
    await db.flush()

    return APIResponse(
        data={
            "id": key.id,
            "name": key.name,
            "api_key_masked": _mask_key(key.api_key),
        }
    )


@router.delete("/tmdb-keys/{key_id}", response_model=APIResponse)
async def delete_tmdb_key(
    key_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Delete a TMDB API key."""
    result = await db.execute(
        select(TmdbApiKey).where(TmdbApiKey.id == key_id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TMDB key not found")

    await db.delete(key)
    await db.flush()
    return APIResponse(message="TMDB key deleted")


# ──────────────────────────────────────────────
#  Media Library Config
# ──────────────────────────────────────────────

def _serialize_media_lib(cfg: MediaLibraryConfig) -> dict:
    """Serialize a MediaLibraryConfig row with masked secrets."""
    return MediaLibraryConfigOut(
        id=cfg.id,
        name=cfg.name,
        db_type=cfg.db_type,
        host=cfg.host,
        port=cfg.port,
        database=cfg.database,
        username=cfg.username,
        password_masked=_mask_key(cfg.password) if cfg.password else None,
        table_name=cfg.table_name,
        tmdb_id_column=cfg.tmdb_id_column,
        media_type_column=cfg.media_type_column,
        name_column=cfg.name_column,
        path_column=cfg.path_column,
        is_dir_column=cfg.is_dir_column,
        trashed_column=cfg.trashed_column,
        api_url=cfg.api_url,
        api_auth_header_masked=_mask_key(cfg.api_auth_header) if cfg.api_auth_header else None,
        api_response_path=cfg.api_response_path,
        is_active=cfg.is_active,
        created_at=cfg.created_at,
        updated_at=cfg.updated_at,
    ).model_dump()


@router.get("/media-library", response_model=APIResponse)
async def list_media_library_configs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """List all media library configs (multi-config support since v1.0.17)."""
    result = await db.execute(
        select(MediaLibraryConfig).order_by(MediaLibraryConfig.id.asc())
    )
    configs = result.scalars().all()
    return APIResponse(data={"items": [_serialize_media_lib(c) for c in configs]})


@router.post("/media-library", response_model=APIResponse)
async def create_media_library_config(
    body: MediaLibraryConfigCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Add a new media library config (does NOT delete existing ones)."""
    cfg = MediaLibraryConfig(
        name=body.name,
        db_type=body.db_type,
        host=body.host,
        port=body.port,
        database=body.database,
        username=body.username,
        password=body.password,
        table_name=body.table_name,
        tmdb_id_column=body.tmdb_id_column,
        media_type_column=body.media_type_column,
        name_column=body.name_column,
        path_column=body.path_column,
        is_dir_column=body.is_dir_column,
        trashed_column=body.trashed_column,
        api_url=body.api_url,
        api_auth_header=body.api_auth_header,
        api_response_path=body.api_response_path,
        is_active=True,
    )
    db.add(cfg)
    await db.flush()

    return APIResponse(data={"id": cfg.id, "name": cfg.name})


@router.patch("/media-library/{config_id}", response_model=APIResponse)
async def update_media_library_config(
    config_id: int,
    body: MediaLibraryConfigCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Update an existing media library config in place.

    Empty/null values in the body REPLACE the existing column values
    (this is a full update, not a sparse merge). The frontend should
    pre-fill the form with current values before submitting.

    Special case for the password field: if the body's ``password`` is
    None or empty, the existing password is kept (so users can edit
    other fields without re-typing the password). Same for
    ``api_auth_header``.
    """
    result = await db.execute(
        select(MediaLibraryConfig).where(MediaLibraryConfig.id == config_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Config not found")

    # Plain assignments — preserve secrets if blank
    cfg.name = body.name
    cfg.db_type = body.db_type
    cfg.host = body.host
    cfg.port = body.port
    cfg.database = body.database
    cfg.username = body.username
    if body.password:  # only overwrite if a new value was supplied
        cfg.password = body.password
    cfg.table_name = body.table_name
    cfg.tmdb_id_column = body.tmdb_id_column
    cfg.media_type_column = body.media_type_column
    cfg.name_column = body.name_column
    cfg.path_column = body.path_column
    cfg.is_dir_column = body.is_dir_column
    cfg.trashed_column = body.trashed_column
    cfg.api_url = body.api_url
    if body.api_auth_header:  # only overwrite if a new value was supplied
        cfg.api_auth_header = body.api_auth_header
    cfg.api_response_path = body.api_response_path

    await db.flush()
    return APIResponse(data={"id": cfg.id, "name": cfg.name})


@router.delete("/media-library/{config_id}", response_model=APIResponse)
async def delete_media_library_config(
    config_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Remove a single media library config by id."""
    result = await db.execute(
        select(MediaLibraryConfig).where(MediaLibraryConfig.id == config_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Config not found")
    await db.delete(cfg)
    await db.flush()
    return APIResponse(message="Media library config removed")


@router.post("/media-library/{config_id}/test", response_model=APIResponse)
async def test_media_library_config(
    config_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_super_admin)],
) -> APIResponse:
    """Test a single media library connection by id."""
    from backend.services.media_library import check_one_config
    try:
        await check_one_config(session=db, config_id=config_id, tmdb_id=0)
        return APIResponse(data={"success": True, "message": "Connection successful"})
    except Exception as e:
        return APIResponse(data={"success": False, "message": str(e)})


# ──────────────────────────────────────────────
#  Movie Request Detail (dynamic path params MUST be last)
# ──────────────────────────────────────────────

@router.get("/{request_id:int}", response_model=APIResponse)
async def get_request_detail(
    request_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Get movie request detail with requesting users."""
    result = await db.execute(
        select(MovieRequest)
        .options(selectinload(MovieRequest.request_users).joinedload(MovieRequestUser.tg_user))
        .where(MovieRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    user_list: list[dict] = []
    for ru in req.request_users:
        tg = ru.tg_user
        user_list.append(
            MovieRequestUserOut(
                id=ru.id,
                tg_user_id=ru.tg_user_id,
                tg_username=tg.username if tg else None,
                tg_first_name=tg.first_name if tg else None,
                created_at=ru.created_at,
            ).model_dump()
        )

    detail = MovieRequestDetail.model_validate(req)
    data = detail.model_dump()
    data["request_users"] = user_list

    return APIResponse(data=data)


@router.patch("/{request_id:int}", response_model=APIResponse)
async def update_request(
    request_id: int,
    body: MovieRequestUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Update movie request status / admin note.

    When status changes to 'fulfilled' and a ``fulfill_webhook_url`` is
    configured in the plugin config, a POST is sent to the webhook with
    the request data as JSON (best-effort — failures are logged but do
    not block the status change).
    """
    result = await db.execute(
        select(MovieRequest).where(MovieRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    old_status = req.status

    if body.status is not None:
        req.status = body.status
    if body.admin_note is not None:
        req.admin_note = body.admin_note

    await db.flush()
    await db.refresh(req)

    out = MovieRequestOut.model_validate(req).model_dump()

    # ── Fulfill webhook (best-effort) ──
    if body.status == "fulfilled" and old_status != "fulfilled":
        try:
            from app.plugins.loader import get_plugin_manager

            pm = get_plugin_manager()
            ctx = pm.get_context("movie-request")
            if ctx:
                config = await ctx.config.get_all()
                webhook_url = (config or {}).get("fulfill_webhook_url", "")
                header_name = (config or {}).get("fulfill_webhook_header_name", "")
                header_value = (config or {}).get("fulfill_webhook_header_value", "")
                if webhook_url:
                    import httpx
                    headers: dict[str, str] = {"Content-Type": "application/json"}
                    if header_name and header_value:
                        headers[header_name] = header_value
                    payload = {
                        "id": req.id,
                        "tmdb_id": req.tmdb_id,
                        "media_type": req.media_type,
                        "title": req.title,
                        "original_title": req.original_title,
                        "requested_resolution": req.requested_resolution,
                        "request_count": req.request_count,
                        "admin_note": req.admin_note,
                    }
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(webhook_url, json=payload, headers=headers)
                        logger.info(
                            "Fulfill webhook sent for request %d: %d %s",
                            req.id, resp.status_code, resp.text[:100],
                        )
        except Exception:
            logger.warning("Fulfill webhook failed for request %d", req.id, exc_info=True)

    return APIResponse(data=out)


@router.delete("/{request_id:int}", response_model=APIResponse)
async def delete_request(
    request_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Delete a movie request and its associated user records."""
    result = await db.execute(
        select(MovieRequest).where(MovieRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    await db.delete(req)
    await db.flush()
    return APIResponse(message="Request deleted")
