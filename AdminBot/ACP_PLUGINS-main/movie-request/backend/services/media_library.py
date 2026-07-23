"""
Remote media library checker.

Supports three connection types via ``MediaLibraryConfig.db_type``:

* ``postgresql`` / ``mysql`` — direct SQL query via async SQLAlchemy engine.
* ``api`` — HTTP GET with optional auth header; checks a JSON response field.

Two output modes:

* **Bool mode** (legacy): just returns whether ``tmdb_id`` exists in the
  external library. Used when only ``table_name`` + ``tmdb_id_column`` are
  configured.
* **Detail mode** (v1.0.17+): when ``name_column`` is also set, the plugin
  fetches every matching filename and parses it for resolution / HDR /
  Dolby Vision / season-episode info, returning a structured ``LibraryInfo``
  dict. The bot reply card uses this to show e.g. "1080p × 1, 4K DoVi × 1"
  for movies, or "S01: E01-E26 (1080p) 26集" for TV shows.

Multi-config support: ``check_in_library()`` iterates over ALL active
``MediaLibraryConfig`` rows and aggregates results, so users can configure
multiple databases / APIs side-by-side.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional
from urllib.parse import quote_plus

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncEngine

from backend.models import MediaLibraryConfig

logger = logging.getLogger(__name__)

# Cached engine keyed by config id
_engine_cache: dict[int, AsyncEngine] = {}
_engine_dsn_cache: dict[int, str] = {}


# ──────────────────────────────────────────────
#  Identifier validation
# ──────────────────────────────────────────────

def _validate_identifier(name: str) -> bool:
    """Validate SQL identifier to prevent injection."""
    return bool(name and re.match(r'^[a-zA-Z_][a-zA-Z0-9_]{0,62}$', name))


# ──────────────────────────────────────────────
#  Filename parser (resolution / HDR / SxxExx)
# ──────────────────────────────────────────────

VIDEO_EXT_RE = re.compile(
    r'\.(mkv|mp4|avi|wmv|ts|m2ts|mpg|mpeg|flv|webm|rmvb|rm|mov|m4v)$',
    re.IGNORECASE,
)

# Resolution: detect from filename (priority order matters)
_RES_4K_RE = re.compile(r'2160p|\b4k\b|\buhd\b', re.IGNORECASE)
_RES_1080P_RE = re.compile(r'1080p|\bfhd\b', re.IGNORECASE)
_RES_1080I_RE = re.compile(r'1080i', re.IGNORECASE)
_RES_720P_RE = re.compile(r'720p|\bhd\b', re.IGNORECASE)
_RES_576P_RE = re.compile(r'576[pi]', re.IGNORECASE)
_RES_480P_RE = re.compile(r'480[pi]', re.IGNORECASE)

# HDR / DoVi
# - DoVi: matches "DoVi", ".DV." (between dots, not DVD), "Dolby Vision/DolbyVision"
# - HDR10+: literal HDR10+ or HDR10Plus
# - HDR10: literal HDR10 (must be checked AFTER HDR10+)
# - HDR: standalone HDR (avoid matching HDR10/HDR10+/HDRen etc.)
_DOVI_RE = re.compile(
    r'\bdovi\b|(?<=[\.\s_-])dv(?=[\.\s_-])|dolby[\s\.\-_]?vision',
    re.IGNORECASE,
)
_HDR10PLUS_RE = re.compile(r'hdr10\+|hdr10plus', re.IGNORECASE)
_HDR10_RE = re.compile(r'hdr10', re.IGNORECASE)
_HDR_RE = re.compile(r'\bhdr\b', re.IGNORECASE)

# Season/episode: SxxExx — handle 1-4 digit episode numbers
_SXXEXX_RE = re.compile(r'S(\d{1,4})E(\d{1,4})', re.IGNORECASE)


def _parse_resolution(name: str) -> str:
    """Return a resolution label for a filename, e.g. '4K', '1080p', '其他'."""
    # 4koma is anime panel notation, not 4K — guard against it
    lname = name.lower()
    if 'koma' in lname:
        # Strip 4k-like patterns inside ".4koma." occurrences before testing
        lname = re.sub(r'\d+koma', '', lname)

    if _RES_4K_RE.search(lname):
        return '4K'
    if _RES_1080P_RE.search(lname):
        return '1080p'
    if _RES_1080I_RE.search(lname):
        return '1080i'
    if _RES_720P_RE.search(lname):
        return '720p'
    if _RES_576P_RE.search(lname):
        return '576p'
    if _RES_480P_RE.search(lname):
        return '480p'
    return '其他'


def _parse_hdr(name: str) -> str:
    """Return an HDR label for a filename, e.g. 'DoVi+HDR10', 'HDR10+', '' (none)."""
    has_dovi = bool(_DOVI_RE.search(name))
    has_hdr10plus = bool(_HDR10PLUS_RE.search(name))
    has_hdr10 = bool(_HDR10_RE.search(name)) and not has_hdr10plus
    has_hdr = bool(_HDR_RE.search(name))

    if has_dovi and has_hdr10:
        return 'DoVi+HDR10'
    if has_dovi:
        return 'DoVi'
    if has_hdr10plus:
        return 'HDR10+'
    if has_hdr10:
        return 'HDR10'
    if has_hdr:
        return 'HDR'
    return ''


def _parse_episode(name: str) -> Optional[tuple[int, int]]:
    """Return ``(season_num, episode_num)`` or ``None`` if no SxxExx in the name."""
    m = _SXXEXX_RE.search(name)
    if m:
        try:
            return int(m.group(1)), int(m.group(2))
        except ValueError:
            return None
    return None


# ──────────────────────────────────────────────
#  LibraryInfo aggregation
# ──────────────────────────────────────────────

def _empty_library_info() -> dict[str, Any]:
    return {
        "exists": False,
        "movie_versions": [],   # list of {"resolution", "hdr", "count"}
        "tv_seasons": [],        # list of {"season", "first_ep", "last_ep", "ep_count", "resolutions"}
        "total_files": 0,
    }


def _aggregate_filenames(filenames: list[str]) -> dict[str, Any]:
    """Parse a list of filenames and aggregate movie versions + TV seasons."""
    info = _empty_library_info()
    info["exists"] = bool(filenames)
    info["total_files"] = len(filenames)

    # Group movie versions by (resolution, hdr)
    movie_groups: dict[tuple[str, str], int] = {}

    # Group TV seasons by season number → list of (episode, resolution)
    tv_groups: dict[int, list[tuple[int, str]]] = {}

    for fname in filenames:
        ep = _parse_episode(fname)
        resolution = _parse_resolution(fname)

        if ep is not None:
            # TV episode
            season_num, ep_num = ep
            tv_groups.setdefault(season_num, []).append((ep_num, resolution))
        else:
            # Movie file
            hdr = _parse_hdr(fname)
            key = (resolution, hdr)
            movie_groups[key] = movie_groups.get(key, 0) + 1

    # Sort movie versions: 4K first, then 1080p, etc.
    res_order = {'4K': 0, '1080p': 1, '1080i': 2, '720p': 3, '576p': 4, '480p': 5, '其他': 6}
    movie_versions = [
        {"resolution": res, "hdr": hdr, "count": count}
        for (res, hdr), count in sorted(
            movie_groups.items(),
            key=lambda kv: (res_order.get(kv[0][0], 99), kv[0][1])
        )
    ]
    info["movie_versions"] = movie_versions

    # Build TV season summary
    tv_seasons = []
    for season_num in sorted(tv_groups.keys()):
        eps = tv_groups[season_num]
        ep_nums = sorted({e for e, _ in eps})
        resolutions = sorted({r for _, r in eps if r != '其他'})
        tv_seasons.append({
            "season": season_num,
            "first_ep": ep_nums[0],
            "last_ep": ep_nums[-1],
            "ep_count": len(ep_nums),
            "resolutions": resolutions,
        })
    info["tv_seasons"] = tv_seasons

    return info


# ──────────────────────────────────────────────
#  Engine cache
# ──────────────────────────────────────────────

def _build_dsn(cfg: MediaLibraryConfig) -> str:
    """Build an async SQLAlchemy DSN from config fields."""
    if cfg.db_type == "postgresql":
        driver = "postgresql+asyncpg"
    elif cfg.db_type == "mysql":
        driver = "mysql+aiomysql"
    else:
        raise ValueError(f"Unsupported db_type: {cfg.db_type}")

    port = cfg.port or (5432 if cfg.db_type == "postgresql" else 3306)
    encoded_password = quote_plus(cfg.password or "")
    encoded_username = quote_plus(cfg.username or "")
    return f"{driver}://{encoded_username}:{encoded_password}@{cfg.host}:{port}/{cfg.database}"


def _get_engine(cfg: MediaLibraryConfig) -> AsyncEngine:
    """Get or create a cached async engine for the given config."""
    dsn = _build_dsn(cfg)

    if cfg.id in _engine_cache and _engine_dsn_cache.get(cfg.id) == dsn:
        return _engine_cache[cfg.id]

    old_engine = _engine_cache.pop(cfg.id, None)
    if old_engine is not None:
        logger.info("Rebuilding engine for media library config %d", cfg.id)

    engine = create_async_engine(dsn, pool_pre_ping=True, pool_size=2, max_overflow=0)
    _engine_cache[cfg.id] = engine
    _engine_dsn_cache[cfg.id] = dsn
    return engine


async def dispose_engines() -> None:
    """Dispose all cached engines (called during plugin teardown)."""
    for config_id, engine in list(_engine_cache.items()):
        try:
            await engine.dispose()
        except Exception:
            logger.warning("Failed to dispose engine for config %d", config_id)
    _engine_cache.clear()
    _engine_dsn_cache.clear()


# ──────────────────────────────────────────────
#  Single-config check
# ──────────────────────────────────────────────

async def _get_active_configs(session: AsyncSession) -> list[MediaLibraryConfig]:
    """Load all active media library configs."""
    result = await session.execute(
        select(MediaLibraryConfig)
        .where(MediaLibraryConfig.is_active.is_(True))
        .order_by(MediaLibraryConfig.id)
    )
    return list(result.scalars().all())


def _resolve_json_path(data: Any, path: str) -> Any:
    """Navigate a dot-separated path into a JSON-decoded dict."""
    for key in path.split("."):
        if isinstance(data, dict):
            data = data.get(key)
        else:
            return None
    return data


async def _check_via_api(
    cfg: MediaLibraryConfig,
    tmdb_id: int,
    media_type: str,
) -> dict[str, Any]:
    """API mode: HTTP GET → bool result wrapped in LibraryInfo."""
    info = _empty_library_info()
    url = (cfg.api_url or "").replace("{tmdb_id}", str(tmdb_id)).replace("{media_type}", media_type)
    if not url:
        logger.error("api_url is empty for media library config %d", cfg.id)
        return info

    headers: dict[str, str] = {}
    if cfg.api_auth_header:
        headers["Authorization"] = cfg.api_auth_header

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        field_path = cfg.api_response_path or "exists"
        value = _resolve_json_path(data, field_path)
        info["exists"] = bool(value)
        return info

    except Exception:
        logger.exception(
            "API media library check failed (url=%s, tmdb_id=%s)", url, tmdb_id
        )
        return info


def _validate_cfg_identifiers(cfg: MediaLibraryConfig) -> bool:
    """Validate all configured SQL identifiers. Returns False on any failure."""
    for attr, label in [
        ("table_name", "table_name"),
        ("tmdb_id_column", "tmdb_id_column"),
        ("media_type_column", "media_type_column"),
        ("name_column", "name_column"),
        ("path_column", "path_column"),
        ("is_dir_column", "is_dir_column"),
        ("trashed_column", "trashed_column"),
    ]:
        value = getattr(cfg, attr, None)
        if value and not _validate_identifier(value):
            logger.error("Invalid %s on cfg %d: %s", label, cfg.id, value)
            return False
    # Required fields must be present
    if not (cfg.table_name and cfg.tmdb_id_column):
        logger.error("Missing table_name or tmdb_id_column on cfg %d", cfg.id)
        return False
    return True


_VIDEO_EXT_SQL = r"\.(mkv|mp4|avi|wmv|ts|m2ts|mpg|flv|webm|rmvb|rm|mov|m4v)$"


def _build_common_filters(cfg: MediaLibraryConfig) -> str:
    """Build the reusable WHERE fragments for is_dir, trashed, video ext."""
    parts: list[str] = []
    if cfg.is_dir_column:
        parts.append(f' AND "{cfg.is_dir_column}" = false')
    if cfg.trashed_column:
        parts.append(f' AND "{cfg.trashed_column}" = false')
    if cfg.name_column:
        parts.append(
            f' AND lower("{cfg.name_column}") ~ \'{_VIDEO_EXT_SQL}\''
        )
    return "".join(parts)


async def _check_via_db(
    cfg: MediaLibraryConfig,
    tmdb_id: int,
    media_type: str,
) -> dict[str, Any]:
    """DB mode: two-step query for filenames → parse versions + episodes.

    Step 1 — **tmdb column match**: ``WHERE tmdb = :id`` (fast, indexed).
    Step 2 — **path-based fallback**: if ``path_column`` is configured and
    step 1 returned few results, also query files whose ``path`` contains
    ``[tmdbid=XXX]``. This catches files where the strm system didn't
    populate the tmdb column (common for older seasons of long-running
    TV shows).

    Media-type filtering at the path level prevents tmdb-ID collisions
    (e.g. ``/movie/4614`` vs ``/tv/4614`` are two different titles):

    * ``media_type == "tv"``: only files whose path contains ``/Season ``
    * ``media_type == "movie"``: only files whose path does NOT contain
      ``/Season `` (standalone releases, not episode files).
    """
    info = _empty_library_info()

    if not _validate_cfg_identifiers(cfg):
        return info

    try:
        engine = _get_engine(cfg)
        filenames: list[str] = []

        async with engine.connect() as conn:
            select_col = f'"{cfg.name_column}"' if cfg.name_column else "1"
            filters = _build_common_filters(cfg)

            # ── Step 1: tmdb column match ──
            q1 = (
                f'SELECT {select_col} FROM "{cfg.table_name}" '
                f'WHERE CAST("{cfg.tmdb_id_column}" AS TEXT) = CAST(:tmdb_id AS TEXT)'
                f'{filters} LIMIT 5000'
            )
            params: dict[str, str] = {"tmdb_id": str(tmdb_id)}
            if cfg.media_type_column:
                q1 = q1.replace(
                    f'{filters}',
                    f' AND "{cfg.media_type_column}" = :media_type{filters}',
                )
                params["media_type"] = media_type

            result1 = await conn.execute(text(q1), params)
            rows1 = result1.fetchall()

            if cfg.name_column:
                filenames = [r[0] for r in rows1 if r[0]]
            elif rows1:
                # Bool-only mode — no name_column configured
                info["exists"] = True
                info["total_files"] = len(rows1)
                return info

            # ── Step 2: path-based fallback ──
            # Only run if:
            #   a) path_column AND name_column are configured (need both)
            #   b) step 1 didn't return enough detail (< threshold)
            step2_needed = (
                cfg.path_column
                and cfg.name_column
                and _validate_identifier(cfg.path_column)
            )

            if step2_needed:
                tmdb_tag = f"[tmdbid={tmdb_id}]"

                # Media-type filtering via path structure:
                # TV → files under /Season NN/ subdirectories
                # Movie → files NOT under /Season NN/
                if media_type == "tv":
                    season_filter = f' AND "{cfg.path_column}" LIKE :season_pat'
                    params2 = {"tmdb_tag": f"%{tmdb_tag}%", "season_pat": f"%{tmdb_tag}%Season %"}
                else:
                    season_filter = f' AND "{cfg.path_column}" NOT LIKE :season_pat'
                    params2 = {"tmdb_tag": f"%{tmdb_tag}%", "season_pat": f"%/Season %"}

                q2 = (
                    f'SELECT "{cfg.name_column}" FROM "{cfg.table_name}" '
                    f'WHERE "{cfg.path_column}" LIKE :tmdb_tag'
                    f'{season_filter}'
                    f'{filters} LIMIT 5000'
                )
                result2 = await conn.execute(text(q2), params2)
                rows2 = result2.fetchall()
                path_filenames = [r[0] for r in rows2 if r[0]]

                # Merge and deduplicate (step 1 may overlap with step 2)
                if path_filenames:
                    existing = set(filenames)
                    for fn in path_filenames:
                        if fn not in existing:
                            filenames.append(fn)
                            existing.add(fn)

        if not filenames:
            return info

        return _aggregate_filenames(filenames)

    except Exception:
        logger.exception(
            "DB media library check failed (cfg=%d, tmdb_id=%s)", cfg.id, tmdb_id
        )
        return info


async def _check_one(
    cfg: MediaLibraryConfig,
    tmdb_id: int,
    media_type: str,
) -> dict[str, Any]:
    """Run a check against a single config (DB or API)."""
    if cfg.db_type == "api":
        return await _check_via_api(cfg, tmdb_id, media_type)
    return await _check_via_db(cfg, tmdb_id, media_type)


def _merge_library_info(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    """Combine two LibraryInfo dicts (e.g. from two different configs)."""
    out = _empty_library_info()
    out["exists"] = a["exists"] or b["exists"]
    out["total_files"] = a["total_files"] + b["total_files"]

    # Merge movie versions: sum counts for same (resolution, hdr) key
    merged: dict[tuple[str, str], int] = {}
    for v in a["movie_versions"] + b["movie_versions"]:
        key = (v["resolution"], v["hdr"])
        merged[key] = merged.get(key, 0) + v["count"]
    res_order = {'4K': 0, '1080p': 1, '1080i': 2, '720p': 3, '576p': 4, '480p': 5, '其他': 6}
    out["movie_versions"] = [
        {"resolution": r, "hdr": h, "count": c}
        for (r, h), c in sorted(merged.items(), key=lambda kv: (res_order.get(kv[0][0], 99), kv[0][1]))
    ]

    # Merge TV seasons by season number
    season_map: dict[int, dict[str, Any]] = {}
    for s in a["tv_seasons"] + b["tv_seasons"]:
        n = s["season"]
        if n not in season_map:
            season_map[n] = {
                "season": n,
                "first_ep": s["first_ep"],
                "last_ep": s["last_ep"],
                "ep_count": s["ep_count"],
                "resolutions": list(s["resolutions"]),
            }
        else:
            existing = season_map[n]
            existing["first_ep"] = min(existing["first_ep"], s["first_ep"])
            existing["last_ep"] = max(existing["last_ep"], s["last_ep"])
            existing["ep_count"] = max(existing["ep_count"], s["ep_count"])
            existing["resolutions"] = sorted(set(existing["resolutions"]) | set(s["resolutions"]))
    out["tv_seasons"] = [season_map[k] for k in sorted(season_map.keys())]

    return out


# ──────────────────────────────────────────────
#  Public entry point
# ──────────────────────────────────────────────

async def check_in_library(
    session: AsyncSession,
    tmdb_id: int,
    media_type: str,
) -> dict[str, Any]:
    """
    Check if a title exists in any of the configured media libraries.

    Returns a ``LibraryInfo`` dict with:

    * ``exists`` — bool, True if found in at least one config
    * ``movie_versions`` — list of {"resolution", "hdr", "count"} for movies
    * ``tv_seasons`` — list of {"season", "first_ep", "last_ep", "ep_count",
      "resolutions"} for TV shows
    * ``total_files`` — total number of matching files

    Always returns a valid dict — never raises.
    """
    configs = await _get_active_configs(session)
    if not configs:
        return _empty_library_info()

    aggregated = _empty_library_info()
    for cfg in configs:
        try:
            info = await _check_one(cfg, tmdb_id, media_type)
            if info["exists"]:
                aggregated = _merge_library_info(aggregated, info)
        except Exception:
            logger.exception("Failed to check library cfg %d", cfg.id)
    return aggregated


async def check_one_config(
    session: AsyncSession,
    config_id: int,
    tmdb_id: int = 0,
    media_type: str = "movie",
) -> dict[str, Any]:
    """Test a single config (used by the test endpoint)."""
    result = await session.execute(
        select(MediaLibraryConfig).where(MediaLibraryConfig.id == config_id)
    )
    cfg = result.scalar_one_or_none()
    if cfg is None:
        return _empty_library_info()
    return await _check_one(cfg, tmdb_id, media_type)


# ──────────────────────────────────────────────
#  Pretty-printers (for the bot reply card)
# ──────────────────────────────────────────────

def _get_tmdb_season_counts(tmdb_raw: dict | None) -> dict[int, int]:
    """Extract {season_number: episode_count} from cached TMDB response.

    Skips season 0 (Specials) since it's rarely relevant for supplement
    requests and inflates the "missing" count.
    """
    if not tmdb_raw:
        return {}
    return {
        s["season_number"]: s["episode_count"]
        for s in tmdb_raw.get("seasons") or []
        if s.get("season_number", 0) > 0 and s.get("episode_count", 0) > 0
    }


def detect_incomplete_seasons(
    info: dict[str, Any],
    tmdb_raw: dict | None,
) -> list[dict[str, Any]]:
    """Compare library seasons against TMDB episode counts.

    Returns a list of ``{"season": int, "have": int, "total": int,
    "missing": int}`` dicts, sorted by ``missing`` descending.
    Only includes seasons where ``have < total``.
    """
    tmdb_counts = _get_tmdb_season_counts(tmdb_raw)
    if not tmdb_counts:
        return []

    lib_map: dict[int, int] = {}
    for s in info.get("tv_seasons") or []:
        lib_map[s["season"]] = s.get("ep_count", 0)

    incomplete: list[dict[str, Any]] = []
    all_seasons = sorted(set(tmdb_counts.keys()) | set(lib_map.keys()))
    for sn in all_seasons:
        total = tmdb_counts.get(sn, 0)
        have = lib_map.get(sn, 0)
        if total > 0 and have < total:
            incomplete.append({
                "season": sn,
                "have": have,
                "total": total,
                "missing": total - have,
            })

    incomplete.sort(key=lambda x: x["missing"], reverse=True)
    return incomplete


def format_library_detail_lines(
    info: dict[str, Any],
    media_type: str,
    tmdb_raw: dict | None = None,
) -> list[str]:
    """Render LibraryInfo as human-readable lines (Chinese).

    For TV requests: uses a compact format that only details incomplete
    seasons (comparing against TMDB episode counts). Complete seasons
    are summarised in one line. Stays well within Telegram's 1024-char
    caption limit even for 20+ season shows.

    For movie requests: shows resolution × count for each version.
    """
    lines: list[str] = []
    if not info or not info.get("exists"):
        return lines

    tv_seasons = info.get("tv_seasons") or []
    versions = info.get("movie_versions") or []

    if media_type == "tv" and tv_seasons:
        # ── TV compact mode ──
        tmdb_counts = _get_tmdb_season_counts(tmdb_raw)
        total_lib_seasons = len(tv_seasons)
        incomplete = detect_incomplete_seasons(info, tmdb_raw)
        incomplete_nums = {i["season"] for i in incomplete}
        complete_count = total_lib_seasons - len(
            [s for s in tv_seasons if s["season"] in incomplete_nums]
        )

        # Summary line
        if incomplete:
            lines.append(
                f"\U0001f4fa {total_lib_seasons}\u5b63\u5728\u5e93"
                f" | \u2713 {complete_count}\u5b63\u5b8c\u6574"
                f" | \u26a0\ufe0f {len(incomplete)}\u5b63\u7f3a\u96c6"
            )
        else:
            lines.append(f"\U0001f4fa {total_lib_seasons}\u5b63\u5728\u5e93 | \u2713 \u5168\u90e8\u5b8c\u6574")

        # Detail only incomplete seasons (top 6 to stay under caption limit)
        for gap in incomplete[:6]:
            lines.append(
                f"  \u26a0\ufe0f S{gap['season']:02d}: "
                f"{gap['have']}/{gap['total']}\u96c6"
            )

        # Also show completely missing seasons from TMDB
        lib_season_nums = {s["season"] for s in tv_seasons}
        for sn in sorted(tmdb_counts.keys()):
            if sn not in lib_season_nums and sn not in incomplete_nums:
                total = tmdb_counts[sn]
                lines.append(f"  \u26a0\ufe0f S{sn:02d}: 0/{total}\u96c6")

    elif media_type == "tv" and not tv_seasons:
        # In library but no SxxExx files parsed — just show file count
        lines.append(f"\U0001f4c1 {info.get('total_files', 0)} \u4e2a\u6587\u4ef6\u5728\u5e93")

    # Movie versions (also shown for TV as "其他版本" for extras)
    if versions:
        if media_type == "tv":
            lines.append(f"\n\U0001f4c0 \u5176\u4ed6\u7248\u672c:")
        for v in versions:
            label = v["resolution"]
            if v.get("hdr"):
                label += f" {v['hdr']}"
            prefix = "  " if media_type == "tv" else "\U0001f4c0 "
            lines.append(f"{prefix}{label} \u00d7 {v['count']}")

    return lines
