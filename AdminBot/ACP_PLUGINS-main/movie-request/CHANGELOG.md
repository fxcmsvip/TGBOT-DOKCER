# Changelog

All notable changes to the TMDB Movie Request Plugin.

## [1.0.25] - 2026-04-08
### Added
- Flexible webhook auth: split single auth field into **Header Name** + **Header Value** — supports Bearer, API Key, Basic Auth, custom headers, or no auth
- **Webhook preview panel** on the Movie Requests page — "ℹ Webhook" button toggles example Headers + JSON Body display

## [1.0.24] - 2026-04-08
### Fixed
- **CRITICAL**: PATCH endpoint (✓/✗ buttons) returned 500 `MissingGreenlet` — `model_validate()` lazy-loaded `updated_at` outside async context. Fixed with `await db.refresh(req)`
### Added
- **Fulfill webhook**: POST request data to configurable URL when marking as fulfilled. Config fields: `fulfill_webhook_url`, `fulfill_webhook_header_name`, `fulfill_webhook_header_value`

## [1.0.23] - 2026-04-08
### Added
- **TV season supplement**: compare library vs TMDB per-season totals, flag incomplete seasons with ⚠️, up to 3 inline buttons for most-incomplete seasons
- **Precise episode supplement via reply**: reply to library card with `S21E15` or `S21` for targeted supplement
- **Compact TV display**: summary line + only incomplete seasons detailed (fits 1024-char Telegram caption limit)
- `detect_incomplete_seasons()` and `_get_tmdb_season_counts()` helpers
- `TVSupplementReplyFilter` for reply-based supplement

## [1.0.22] - 2026-04-08
### Added
- **Path-based fallback query**: `path LIKE '%[tmdbid=XXX]%'` recovers 647K+ files with empty tmdb column
- **Media-type filtering**: TV queries match `/Season NN/` paths; movie queries exclude them (prevents tmdb_id collision)
- **Separated display**: TV shows "📺 剧集 (N季)" header; standalone files under "📀 其他版本"
- `path_column` config field + migration 006
- `_validate_cfg_identifiers()` and `_build_common_filters()` helpers

## [1.0.21] - 2026-04-08
### Fixed
- Strip HTML tags from web chat outbound log — fixes ReactMarkdown rendering overlap

## [1.0.20] - 2026-04-08
### Fixed
- Group conversations merge across bots — `_upsert_panel_conversation` no longer splits conversations when user interacts with different bots from the same pool

## [1.0.19] - 2026-04-08
### Added
- **Supplement request for missing 1080p/4K** — inline buttons for gap resolutions, `requested_resolution` column, dedup by `(tmdb_id, media_type, requested_resolution)`
- Admin requests table shows orange `补片 4K` / `补片 S21` badges
- Context-aware cancel: "已取消补片" for supplement, "求片已取消" for normal

## [1.0.18] - 2026-04-08
### Added
- **Edit existing media library configs** — pencil icon on each card, inline edit form with `PATCH /media-library/{id}`
- Reusable `MediaLibraryForm` component for both create and edit

## [1.0.17] - 2026-04-08
### Added
- **Multi-database support** — multiple media library configs side-by-side with card-based UI
- **Library version detail** — parse filenames for resolution/HDR/SxxExx, show `📀 1080p × 1` / `📺 S01: E01-E26 (1080p) 26集`
- `name_column`, `is_dir_column`, `trashed_column` config fields + migration 004
- `check_in_library()` returns `LibraryInfo` dict (not bool)

## [1.0.16] - 2026-04-08
### Fixed
- Media library `int → str` type cast with `CAST AS TEXT` for DBs storing tmdb_id as VARCHAR
- All status text now in Chinese (已在媒体库中, 求片已提交, N人已求过此片)

## [1.0.15] - 2026-04-08
### Added
- **Delete requests** — `DELETE /{request_id}` endpoint + trash button with confirmation
- **API media library check** — `db_type="api"` with HTTP GET, auth header, JSON response field
- Settings tab renamed from "TMDB Keys" to **"Request Config"**
- Migration 003: API columns on media library config

## [1.0.14] - 2026-04-07
### Fixed
- Callback handler tolerates missing `bot_db_id` (Panel < 1.1.5 didn't inject on callback_query)
- TMDB/IMDB links moved above status line

## [1.0.13] - 2026-04-07
### Added
- **Confirmation step** — ✅ 确认求片 / ❌ 取消 inline buttons; request saved only after confirm
- Same-user duplicate shows "🔄 你已经求过这部了" without buttons
- `callback_query` added to manifest bot_events

## [1.0.12] - 2026-04-07
### Fixed
- `_log_inbound` crash on `message.model_dump()` — exclude `bot`/`from_user` fields (aiogram `Default` sentinel)

## [1.0.11] - 2026-04-07
### Added
- **Rich reply cards**: poster (w780), tagline, runtime, country, director, top 3 cast, synopsis, IMDB/TMDB links
- **Web chat logging**: `/req` conversations appear in panel's chat page
### Fixed
- `datetime.now(timezone.utc)` → `datetime.utcnow()` for naive DateTime columns

## [1.0.10] - 2026-04-07
### Fixed
- All ORM models: `extend_existing=True` for safe reactivation
- `api_key` schema/column widened 200 → 500 chars for TMDB JWT tokens
- Frontend `addMutation.onError` displays validation errors inline

## [1.0.8] - 2026-04-07
### Fixed
- `GET /tmdb-keys` and `GET /media-library` 422 — route shadowed by `/{request_id}`. Constrained with Starlette `:int` converter

## [1.0.6] and earlier
- Initial release through iterative development
