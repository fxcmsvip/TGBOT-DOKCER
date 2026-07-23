# Changelog

All notable changes to ACP Market will be documented in this file.

Version format: `MAJOR.MINOR.PATCH` starting at `0.1.0`
- Patch (`+0.0.1`): bug fixes, minor tweaks
- Minor (`+0.1.0`): new features, significant changes

---

## [0.2.5] - 2026-03-27

### Fixed
- **Detail API missing `latest_version`** — Plugin detail endpoint now returns `latest_version` (approved only), preventing Panel from showing "Update to v1.0.0" when v1.0.1 is installed
- **Versions sorted newest-first** — Detail endpoint returns approved versions sorted by `created_at` descending

## [0.2.4] - 2026-03-27

### Fixed
- Footer version number not updated (was hardcoded as 0.2.1)

## [0.2.3] - 2026-03-27

### Changed
- CI workflow now builds both backend and frontend GHCR images on tag push

## [0.2.2] - 2026-03-27

### Fixed
- **`latest_version` returned pending versions** — Plugin list API showed unreviewed (pending) versions as the latest, causing Panel to display "Update Available" for versions not yet approved; now only returns approved versions

---

## [0.1.1] - 2026-03-26

### Fixed
- Show plugin author name in review queue cards and plugin cards
- README now uses Chinese as the default language with English link

### Changed
- Added 7 UI design screenshots to both README (CN/EN)

---

## [0.1.0] - 2026-03-25

### Added
- **Plugin Marketplace** — Public-facing plugin discovery with search, category filtering, sorting, and pagination
- **Plugin Registry API** — Submit plugins (zip + JSON metadata), version management, semantic versioning, bundle download with license validation
- **Review Workflow** — Multi-stage review pipeline for plugin submissions (pending / approved / rejected / changes requested)
- **Stripe Billing** — Checkout sessions, one-time and subscription pricing, automatic license/purchase creation via webhook, 70/30 revenue split
- **Developer Dashboard** — Plugin stats, downloads, revenue overview, with server-side `author_id` filtering
- **Revenue Page** — Transaction history from purchases API, CSV export with injection protection, Stripe Connect placeholder
- **Review Queue** — Reviewer/admin UI for approving, rejecting, or requesting changes on submissions
- **Admin Panel** — User management (role editing, suspend/activate), platform-wide statistics
- **HttpOnly Cookie Authentication** — Secure JWT access/refresh tokens in HttpOnly cookies with SameSite=Lax, fallback to Bearer header for API clients
- **Remember Me** — Configurable session cookie duration via `remember_me` flag
- **Password Reset** — Forgot password email flow with SMTP (primary) + SendGrid (fallback), token-based reset page
- **Shared Modal Component** — Accessible modal with focus trap, Escape key, ARIA attributes; used across ReviewQueue, AdminPanel, Login
- **Error States** — Error UI with retry buttons on Revenue, ReviewQueue, AdminPanel pages
- **CSV Injection Protection** — `escapeCsvCell()` utility for safe CSV exports
- **Role-Based Access Control** — 5-tier role hierarchy (user → developer → reviewer → admin → super_admin)
- **Docker Compose** — Full-stack development environment with PostgreSQL 16, Redis 7, backend (hot reload), frontend (Vite HMR), healthchecks
- **GHCR Container Image** — Published to `ghcr.io/fxxkrlab/acp_market:0.1.0`

### Security
- HttpOnly + Secure + SameSite cookies (no localStorage token storage)
- Bcrypt password hashing
- JWT with configurable expiry and refresh rotation
- Stripe webhook signature validation with idempotency checks
- Path traversal prevention for plugin bundles
- Input validation (plugin ID, version format regex)
- CSV formula injection prevention
- Blocking SMTP wrapped in `asyncio.to_thread()` to avoid event loop blocking

### Technical
- Backend: FastAPI + SQLAlchemy 2.0 async + asyncpg + Pydantic v2
- Frontend: React 19 + Vite + Tailwind CSS v4 + Zustand + Axios
- API envelope auto-unwrap interceptor for consistent frontend data access
- Consistent response format between login/register endpoints
