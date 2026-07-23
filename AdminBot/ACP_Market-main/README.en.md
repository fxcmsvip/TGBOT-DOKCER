# ACP Market

[中文版](./README.md)

**ACP Market** is the official plugin marketplace for [AdminChat Panel](https://github.com/fxxkrlab). Developers can publish, distribute, and monetize plugins while users discover and install them with one click.

## Features

- **Plugin Registry** — Publish, version, and manage plugins with semantic versioning
- **Plugin Detail Page** — Full plugin info, version history, pricing, download stats
- **Review Workflow** — Multi-stage review pipeline (pending → approved / rejected / changes requested)
- **Ed25519 Bundle Signing** — Automatic signing on upload, signature + hash in download headers, Panel-side verification
- **Stripe Billing** — One-time & subscription pricing, automatic license generation, 70/30 revenue split
- **Role-Based Access** — User, Developer, Reviewer, Admin, Super Admin
- **HttpOnly Cookie Auth** — Secure JWT auth with refresh token rotation and Remember Me
- **Password Reset** — SMTP + SendGrid email with token-based reset flow
- **Admin Dashboard** — User management (edit name/email/role/status), platform stats, plugin moderation
- **Developer Dashboard** — Plugin stats, revenue tracking, CSV export, accurate review status display
- **Marketplace UI** — Search, category filter, sort, pagination
- **Documentation Site** — 11-page docs (User Guide + Developer Guide) with API reference, SDK docs, design system spec, and more

## Screenshots

### Plugin Marketplace (Public)
![Marketplace](docs/designs/01-public-marketplace.png)

### Login / Register
![Login](docs/designs/02-login-register.png)

### Developer Dashboard
![Dashboard](docs/designs/03-developer-dashboard.png)

### Plugin Submission
![Submit Plugin](docs/designs/04-plugin-submission.png)

### Revenue & Stripe Integration
![Revenue](docs/designs/05-revenue-stripe.png)

### Review Queue (Reviewer View)
![Review Queue](docs/designs/06-review-queue.png)

### Admin Panel
![Admin Panel](docs/designs/07-admin-panel.png)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  Vite + React 19 + Tailwind CSS v4 + Zustand         │
│  Pages: Marketplace, Login, Dashboard, Revenue,       │
│         ReviewQueue, AdminPanel, ResetPassword         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (cookie + JSON)
┌──────────────────────▼──────────────────────────────┐
│                  Backend (FastAPI)                     │
│  Async Python 3.12 + SQLAlchemy 2.0 + asyncpg         │
│  Endpoints: /auth, /plugins, /billing, /review, /admin │
└──────┬───────────────┬──────────────────────────────┘
       │               │
  ┌────▼────┐   ┌──────▼──────┐
  │PostgreSQL│   │    Redis    │
  │   16     │   │     7       │
  └─────────┘   └─────────────┘
```

## Auth Flow

```
┌────────┐     POST /auth/login      ┌─────────┐
│ Browser │ ──────────────────────►  │ Backend  │
│         │ ◄──────────────────────  │         │
│         │  Set-Cookie: acp_session  │         │
│         │  Set-Cookie: refresh      │         │
└────┬───┘                           └────┬────┘
     │                                     │
     │  GET /auth/me (cookie auto-sent)    │
     │ ──────────────────────────────────► │
     │ ◄────────────────────────────────── │
     │       { user object }               │
     │                                     │
     │  401 → POST /auth/refresh (cookie)  │
     │ ──────────────────────────────────► │
     │ ◄────────────────────────────────── │
     │   New cookies set                   │
```

## Plugin Lifecycle

```
Developer                Reviewer                System
    │                       │                       │
    │  POST /plugins        │                       │
    │  (zip + metadata)     │                       │
    │──────────────────────►│                       │
    │                       │                       │
    │               GET /review/queue               │
    │                       │──────────────────────►│
    │                       │                       │
    │              POST /review/:id/approve         │
    │                       │──────────────────────►│
    │                       │                  is_published=true
    │                       │                       │
    │                  Plugin visible in Marketplace │
```

## Billing Flow

```
Buyer           Frontend        Backend          Stripe
  │  Click Buy     │               │               │
  │───────────────►│  POST /billing/checkout        │
  │                │──────────────►│               │
  │                │               │  Create Session│
  │                │               │──────────────►│
  │                │  checkout_url  │               │
  │◄───────────────│◄──────────────│               │
  │                │               │               │
  │  Pay on Stripe │               │               │
  │───────────────────────────────────────────────►│
  │                │               │  Webhook       │
  │                │               │◄──────────────│
  │                │               │               │
  │                │          Create License        │
  │                │          Create Purchase        │
  │                │          (70/30 split)          │
```

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/fxxkrlab/ACP_Market.git
cd ACP_Market
docker compose up --build
```

| Service    | URL                     |
|------------|-------------------------|
| Frontend   | http://localhost:5173   |
| Backend    | http://localhost:8001   |
| PostgreSQL | localhost:5433          |
| Redis      | localhost:6380          |

Default admin: `admin@novahelix.org` / `changeme`

### Manual

**Prerequisites:** Python 3.12+, Node.js 20+, PostgreSQL 16+, Redis 7+

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (another terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and customize:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/acp_market` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/1` |
| `JWT_SECRET_KEY` | JWT signing secret | `CHANGE-ME-IN-PRODUCTION` |
| `STRIPE_SECRET_KEY` | Stripe API key | (empty) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | (empty) |
| `SMTP_HOST` | SMTP server | (empty) |
| `SENDGRID_API_KEY` | SendGrid fallback | (empty) |
| `INIT_ADMIN_EMAIL` | Initial admin email | `admin@novahelix.org` |
| `INIT_ADMIN_PASSWORD` | Initial admin password | `changeme` |
| `COOKIE_SECURE` | Set `false` for local HTTP dev | `true` |
| `ED25519_PRIVATE_KEY` | Ed25519 PEM private key (bundle signing) | (empty, signing disabled) |

## Project Structure

```
ACP_Market/
├── backend/
│   └── app/
│       ├── api/          # Route handlers (auth, plugins, billing, review, admin, signing)
│       ├── models/       # SQLAlchemy ORM models
│       ├── schemas/      # Pydantic request/response schemas
│       ├── utils/        # Security, email, signing, init helpers
│       ├── config.py     # Pydantic Settings
│       ├── database.py   # Async engine + session
│       └── main.py       # FastAPI app entry
├── frontend/
│   └── src/
│       ├── api/          # Axios client with cookie auth
│       ├── components/   # Modal, Sidebar, PluginCard, StatusBadge
│       ├── constants/    # Roles, version
│       ├── pages/        # All page components (incl. /docs site)
│       ├── stores/       # Zustand auth store
│       └── utils/        # formatNumber, formatCurrency, escapeCsvCell
├── docker-compose.yml
├── Dockerfile
└── docs/
```

## Versioning

Starting from `v0.1.0`:
- Patch (`+0.0.1`): bug fixes, minor tweaks
- Minor (`+0.1.0`): new features, significant changes
- No duplicate version tags

## License

MIT License. See [LICENSE](./LICENSE).

---

**Powered by ACP Market** | &copy; 2026 NovaHelix
