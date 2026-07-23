# ACP Market - REST API Specification

> **PROPRIETARY & CONFIDENTIAL** - Internal design document for ACP Market development.

## Overview

ACP Market is the official plugin marketplace for ADMINCHAT Panel. This document defines the complete REST API surface.

- **Base URL**: `https://market.adminchat.com/api/v1`
- **Protocol**: HTTPS only (TLS 1.3)
- **Content-Type**: `application/json` (unless otherwise noted)
- **Date format**: ISO 8601 (`2026-03-24T12:00:00Z`)

---

## Authentication

Two authentication methods are supported:

| Method | Header | Use Case |
|--------|--------|----------|
| Bearer JWT | `Authorization: Bearer <token>` | Web UI (developer dashboard, admin panel) |
| API Key | `X-ACP-API-Key: <key>` | Panel instances (registry operations, billing) |

JWT tokens expire after 15 minutes. Refresh tokens expire after 30 days.

API keys are long-lived and scoped (see [MARKET_RBAC.md](./MARKET_RBAC.md) for scopes).

---

## 1. Authentication Endpoints

### POST /auth/register

Register a new developer account.

**Auth**: Public

**Request Body**:
```json
{
  "email": "dev@example.com",
  "username": "my-dev-name",
  "password": "min12chars!Secure",
  "display_name": "My Dev Name",
  "github_url": "https://github.com/my-dev-name"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email, unique |
| `username` | string | Yes | 3-32 chars, `[a-z0-9_-]`, unique |
| `password` | string | Yes | Min 12 chars, 1 uppercase, 1 digit, 1 special |
| `display_name` | string | Yes | 2-64 chars |
| `github_url` | string | No | Valid GitHub profile URL |

**Response 201**:
```json
{
  "id": "usr_a1b2c3d4",
  "email": "dev@example.com",
  "username": "my-dev-name",
  "display_name": "My Dev Name",
  "role": "developer",
  "verified": false,
  "created_at": "2026-03-24T12:00:00Z",
  "tokens": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `USERNAME_ALREADY_EXISTS` | 409 | Username taken |
| `VALIDATION_ERROR` | 422 | Field validation failed |

---

### POST /auth/login

Authenticate and receive JWT tokens.

**Auth**: Public

**Request Body**:
```json
{
  "email": "dev@example.com",
  "password": "min12chars!Secure"
}
```

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Response 200**:
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "usr_a1b2c3d4",
    "email": "dev@example.com",
    "username": "my-dev-name",
    "display_name": "My Dev Name",
    "role": "developer",
    "verified": false
  }
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `ACCOUNT_SUSPENDED` | 403 | Account has been suspended |
| `ACCOUNT_NOT_VERIFIED` | 403 | Email not verified (if email verification enabled) |

---

### POST /auth/refresh

Refresh an expired access token.

**Auth**: JWT (refresh token in body)

**Request Body**:
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Response 200**:
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_REFRESH_TOKEN` | 401 | Token expired or invalid |
| `TOKEN_REVOKED` | 401 | Token has been revoked |

---

### POST /auth/api-keys

Generate a new API key for Panel instances.

**Auth**: JWT

**Request Body**:
```json
{
  "name": "Production Panel",
  "scopes": ["registry:read", "billing:read", "billing:write"],
  "expires_at": "2027-03-24T00:00:00Z"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-128 chars, descriptive label |
| `scopes` | string[] | Yes | Valid scopes (see RBAC doc) |
| `expires_at` | string | No | ISO 8601 datetime, null = never expires |

**Response 201**:
```json
{
  "id": "key_x1y2z3",
  "name": "Production Panel",
  "key": "acp_mk_live_a1b2c3d4e5f6g7h8i9j0...",
  "scopes": ["registry:read", "billing:read", "billing:write"],
  "created_at": "2026-03-24T12:00:00Z",
  "expires_at": "2027-03-24T00:00:00Z",
  "last_used_at": null
}
```

> **IMPORTANT**: The `key` field is only returned once at creation time. It cannot be retrieved later.

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_SCOPES` | 422 | One or more scopes invalid |
| `MAX_API_KEYS_REACHED` | 429 | Maximum 10 API keys per user |

---

### GET /auth/api-keys

List all API keys for the authenticated user.

**Auth**: JWT

**Response 200**:
```json
{
  "items": [
    {
      "id": "key_x1y2z3",
      "name": "Production Panel",
      "key_prefix": "acp_mk_live_a1b2c3d4...",
      "scopes": ["registry:read", "billing:read", "billing:write"],
      "created_at": "2026-03-24T12:00:00Z",
      "expires_at": "2027-03-24T00:00:00Z",
      "last_used_at": "2026-03-24T15:30:00Z"
    }
  ],
  "total": 1
}
```

> **Note**: Only the first 16 characters of the key are returned (`key_prefix`).

---

### DELETE /auth/api-keys/{id}

Revoke an API key. Immediately invalidates the key.

**Auth**: JWT

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | API key ID (e.g., `key_x1y2z3`) |

**Response 204**: No content.

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `API_KEY_NOT_FOUND` | 404 | Key does not exist or not owned by user |

---

### GET /auth/me

Get current authenticated user information.

**Auth**: JWT or API Key

**Response 200**:
```json
{
  "id": "usr_a1b2c3d4",
  "email": "dev@example.com",
  "username": "my-dev-name",
  "display_name": "My Dev Name",
  "role": "developer",
  "verified": true,
  "github_url": "https://github.com/my-dev-name",
  "stripe_connected": true,
  "created_at": "2026-03-24T12:00:00Z",
  "stats": {
    "plugins_published": 3,
    "total_downloads": 1250
  }
}
```

When authenticated via API Key, the response also includes:
```json
{
  "auth_method": "api_key",
  "api_key_id": "key_x1y2z3",
  "api_key_name": "Production Panel",
  "api_key_scopes": ["registry:read", "billing:read"]
}
```

---

## 2. Plugin Registry Endpoints

### GET /plugins

List and search published plugins with pagination.

**Auth**: Public

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | - | Full-text search across name, description, tags |
| `category` | string | - | Filter by category slug (e.g., `entertainment`, `moderation`, `utility`) |
| `sort` | string | `popular` | Sort order: `popular`, `newest`, `updated`, `name`, `downloads` |
| `page` | integer | 1 | Page number (1-indexed) |
| `page_size` | integer | 20 | Items per page (max 100) |
| `min_panel_version` | string | - | Minimum compatible Panel version (semver, e.g., `0.8.0`) |
| `pricing` | string | `all` | Filter: `free`, `paid`, `all` |
| `developer` | string | - | Filter by developer username |
| `tag` | string | - | Filter by tag (can specify multiple, comma-separated) |

**Response 200**:
```json
{
  "items": [
    {
      "id": "plg_movie-request",
      "name": "Movie Request Bot",
      "slug": "movie-request",
      "short_description": "Allow users to request movies via Telegram",
      "icon_url": "https://cdn.market.adminchat.com/icons/movie-request.png",
      "category": "entertainment",
      "tags": ["movies", "requests", "media"],
      "developer": {
        "username": "sakakibara",
        "display_name": "SAKAKIBARA",
        "verified": true
      },
      "pricing": {
        "model": "one_time",
        "price": 9.99,
        "currency": "USD"
      },
      "stats": {
        "downloads": 1250,
        "active_installs": 340,
        "avg_rating": 4.7,
        "review_count": 23
      },
      "latest_version": "1.2.0",
      "min_panel_version": "0.7.0",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-20T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 156,
    "total_pages": 8
  }
}
```

---

### GET /plugins/{id}

Get full plugin detail including version list.

**Auth**: Public

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Plugin ID (e.g., `plg_movie-request`) |

**Response 200**:
```json
{
  "id": "plg_movie-request",
  "name": "Movie Request Bot",
  "slug": "movie-request",
  "short_description": "Allow users to request movies via Telegram",
  "long_description": "## Movie Request Bot\n\nFull markdown description...",
  "icon_url": "https://cdn.market.adminchat.com/icons/movie-request.png",
  "screenshots": [
    {
      "url": "https://cdn.market.adminchat.com/screenshots/movie-request/1.png",
      "caption": "Movie search interface"
    },
    {
      "url": "https://cdn.market.adminchat.com/screenshots/movie-request/2.png",
      "caption": "Request queue management"
    }
  ],
  "category": "entertainment",
  "tags": ["movies", "requests", "media"],
  "developer": {
    "id": "usr_a1b2c3d4",
    "username": "sakakibara",
    "display_name": "SAKAKIBARA",
    "verified": true,
    "plugins_count": 5
  },
  "pricing": {
    "model": "one_time",
    "price": 9.99,
    "currency": "USD"
  },
  "capabilities": ["bot_handler", "web_panel", "settings_page", "database"],
  "min_panel_version": "0.7.0",
  "max_panel_version": null,
  "repository_url": "https://github.com/sakakibara/acp-movie-request",
  "support_url": "https://github.com/sakakibara/acp-movie-request/issues",
  "license": "MIT",
  "stats": {
    "downloads": 1250,
    "active_installs": 340,
    "avg_rating": 4.7,
    "review_count": 23,
    "latest_download_count_30d": 89
  },
  "latest_version": {
    "version": "1.2.0",
    "released_at": "2026-03-20T08:00:00Z",
    "changelog": "- Fixed movie search pagination\n- Added TMDB integration",
    "bundle_size": 245760,
    "sha256": "a1b2c3d4..."
  },
  "versions": [
    {
      "version": "1.2.0",
      "released_at": "2026-03-20T08:00:00Z",
      "min_panel_version": "0.7.0"
    },
    {
      "version": "1.1.0",
      "released_at": "2026-02-10T08:00:00Z",
      "min_panel_version": "0.7.0"
    },
    {
      "version": "1.0.0",
      "released_at": "2026-01-15T10:00:00Z",
      "min_panel_version": "0.6.0"
    }
  ],
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-03-20T08:00:00Z"
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `PLUGIN_NOT_FOUND` | 404 | Plugin does not exist |
| `PLUGIN_RECALLED` | 410 | Plugin has been recalled (security issue) |

---

### GET /plugins/{id}/versions

Get all versions of a plugin with changelogs.

**Auth**: Public

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Plugin ID |

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page (max 50) |

**Response 200**:
```json
{
  "items": [
    {
      "version": "1.2.0",
      "released_at": "2026-03-20T08:00:00Z",
      "changelog": "- Fixed movie search pagination\n- Added TMDB integration",
      "min_panel_version": "0.7.0",
      "max_panel_version": null,
      "bundle_size": 245760,
      "sha256": "a1b2c3d4e5f6...",
      "review_status": "approved",
      "downloads": 89
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 3,
    "total_pages": 1
  }
}
```

---

### GET /plugins/{id}/versions/{ver}

Get detail for a specific version.

**Auth**: Public

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Plugin ID |
| `ver` | string | Semver version string (e.g., `1.2.0`) |

**Response 200**:
```json
{
  "plugin_id": "plg_movie-request",
  "version": "1.2.0",
  "released_at": "2026-03-20T08:00:00Z",
  "changelog": "- Fixed movie search pagination\n- Added TMDB integration",
  "min_panel_version": "0.7.0",
  "max_panel_version": null,
  "bundle_size": 245760,
  "sha256": "a1b2c3d4e5f6...",
  "signature": "ed25519_base64_signature...",
  "manifest": {
    "id": "movie-request",
    "name": "Movie Request Bot",
    "version": "1.2.0",
    "author": "sakakibara",
    "capabilities": ["bot_handler", "web_panel", "settings_page", "database"],
    "entry_points": {
      "backend": "backend/main.py",
      "frontend": "frontend/index.tsx"
    },
    "dependencies": {
      "python": ["httpx>=0.24.0"],
      "npm": ["@tanstack/react-query"]
    },
    "settings_schema": {}
  },
  "review": {
    "status": "approved",
    "reviewer": "reviewer-username",
    "reviewed_at": "2026-03-19T16:00:00Z"
  },
  "downloads": 89
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `VERSION_NOT_FOUND` | 404 | Version does not exist |

---

### POST /plugins

Submit a new plugin to the Market.

**Auth**: JWT (Developer role required)

**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bundle` | file | Yes | Plugin zip bundle (max 50MB) |
| `icon` | file | Yes | Plugin icon (PNG/SVG, 256x256 min) |
| `screenshots` | file[] | Yes (min 1) | Screenshot images (PNG/JPG, max 5) |
| `category` | string | Yes | Category slug |
| `tags` | string | No | Comma-separated tags (max 10) |
| `pricing_model` | string | Yes | `free`, `one_time`, `subscription_monthly`, `subscription_yearly` |
| `price` | number | Conditional | Required if pricing_model is not `free`. In USD, min $0.99 |
| `repository_url` | string | No | Source code repository URL |
| `support_url` | string | No | Support/issues URL |
| `plugin_license` | string | No | License identifier (MIT, GPL-3.0, etc.) |

The bundle zip must contain a valid `manifest.json` at its root. The `name`, `version`, `short_description`, and `long_description` (README.md) are extracted from the bundle.

**Response 201**:
```json
{
  "id": "plg_movie-request",
  "submission_id": "sub_r4s5t6",
  "status": "pending_review",
  "message": "Plugin submitted successfully. Automated review will begin shortly.",
  "estimated_review_time": "48 hours"
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_MANIFEST` | 422 | manifest.json missing or invalid |
| `BUNDLE_TOO_LARGE` | 413 | Bundle exceeds 50MB |
| `PLUGIN_ID_TAKEN` | 409 | Plugin ID already exists |
| `PAID_REQUIRES_VERIFICATION` | 403 | Developer must be verified for paid plugins |
| `STRIPE_NOT_CONNECTED` | 403 | Stripe Connect required for paid plugins |
| `MISSING_SCREENSHOTS` | 422 | At least 1 screenshot required |

---

### POST /plugins/{id}/versions

Submit a new version for an existing plugin.

**Auth**: JWT (Developer role, must be plugin owner)

**Content-Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bundle` | file | Yes | Updated plugin zip bundle |
| `screenshots` | file[] | No | Updated screenshots (replaces existing if provided) |

The version number is read from the `manifest.json` inside the bundle. It must be higher than the current latest version (semver comparison).

**Response 201**:
```json
{
  "plugin_id": "plg_movie-request",
  "version": "1.3.0",
  "submission_id": "sub_u7v8w9",
  "status": "pending_review",
  "review_track": "minor_update",
  "message": "Version submitted. Minor update review track (automated + abbreviated human review)."
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `NOT_PLUGIN_OWNER` | 403 | You are not the owner of this plugin |
| `VERSION_EXISTS` | 409 | This version already exists |
| `VERSION_NOT_HIGHER` | 422 | Version must be higher than current latest |
| `INVALID_MANIFEST` | 422 | manifest.json missing or invalid |

---

### PATCH /plugins/{id}

Update plugin metadata (does not change code/bundle).

**Auth**: JWT (Developer role, must be plugin owner)

**Request Body** (all fields optional):
```json
{
  "short_description": "Updated short description",
  "category": "utility",
  "tags": ["movies", "requests"],
  "pricing_model": "subscription_monthly",
  "price": 4.99,
  "repository_url": "https://github.com/dev/plugin",
  "support_url": "https://github.com/dev/plugin/issues",
  "plugin_license": "MIT"
}
```

> **Note**: Pricing model changes only apply to new purchases. Existing licenses remain valid under their original terms.

**Response 200**: Returns updated plugin object (same schema as GET /plugins/{id}).

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `NOT_PLUGIN_OWNER` | 403 | You are not the owner |
| `PLUGIN_NOT_FOUND` | 404 | Plugin does not exist |

---

### DELETE /plugins/{id}

Remove a plugin from the Market.

**Auth**: JWT (Admin role required)

**Request Body**:
```json
{
  "reason": "Security vulnerability - data exfiltration",
  "recall": true,
  "notify_instances": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason for removal |
| `recall` | boolean | No | If true, triggers `plugin.recalled` webhook to all affected instances |
| `notify_instances` | boolean | No | Send notification webhooks (default true) |

**Response 200**:
```json
{
  "id": "plg_movie-request",
  "status": "recalled",
  "affected_instances": 340,
  "notifications_sent": 340
}
```

---

## 3. Plugin Download Endpoints

### GET /plugins/{id}/versions/{ver}/download

Download the signed plugin bundle zip.

**Auth**: API Key (scope: `registry:read`)

For **paid plugins**, a valid license is required. The API key's associated user must have an active license for this plugin.

**Response 200**: Binary stream (`application/zip`)

**Headers**:
```
Content-Disposition: attachment; filename="movie-request-1.2.0.zip"
Content-Length: 245760
X-Bundle-SHA256: a1b2c3d4e5f6...
X-Bundle-Signature: ed25519_base64_signature...
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `LICENSE_REQUIRED` | 402 | Paid plugin, no valid license found |
| `LICENSE_EXPIRED` | 402 | License has expired |
| `PLUGIN_NOT_FOUND` | 404 | Plugin or version not found |
| `DOWNLOAD_RATE_LIMITED` | 429 | Download rate limit exceeded |

---

### GET /plugins/{id}/versions/{ver}/signature

Download the Ed25519 signature file for bundle verification.

**Auth**: API Key (scope: `registry:read`)

**Response 200**: Binary stream (`application/octet-stream`)

The signature is an Ed25519 signature over the SHA256 hash of the bundle zip. Panel verifies with the Market's embedded public key.

**Headers**:
```
Content-Disposition: attachment; filename="movie-request-1.2.0.sig"
X-Signing-Key-Id: market-key-2026-01
```

---

### POST /plugins/check-updates

Batch check for available updates for installed plugins.

**Auth**: API Key (scope: `registry:read`)

**Request Body**:
```json
{
  "installed": [
    {
      "plugin_id": "movie-request",
      "version": "1.1.0",
      "panel_version": "0.8.0"
    },
    {
      "plugin_id": "auto-responder",
      "version": "2.0.0",
      "panel_version": "0.8.0"
    }
  ]
}
```

**Response 200**:
```json
{
  "updates": [
    {
      "plugin_id": "movie-request",
      "current_version": "1.1.0",
      "latest_version": "1.2.0",
      "compatible": true,
      "changelog": "- Fixed movie search pagination\n- Added TMDB integration",
      "requires_license_upgrade": false
    }
  ],
  "recalled": [
    {
      "plugin_id": "malicious-plugin",
      "reason": "Security vulnerability detected",
      "recalled_at": "2026-03-23T10:00:00Z"
    }
  ],
  "checked_at": "2026-03-24T12:00:00Z"
}
```

---

## 4. Review Management Endpoints

### GET /review/queue

List submissions pending review.

**Auth**: JWT (Reviewer role or higher)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `pending` | `pending`, `in_review`, `all` |
| `track` | string | - | `new_plugin`, `patch_update`, `minor_update`, `major_update` |
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page |

**Response 200**:
```json
{
  "items": [
    {
      "submission_id": "sub_r4s5t6",
      "plugin_id": "plg_movie-request",
      "plugin_name": "Movie Request Bot",
      "version": "1.2.0",
      "developer": {
        "username": "sakakibara",
        "verified": true
      },
      "track": "minor_update",
      "submitted_at": "2026-03-23T10:00:00Z",
      "automated_review": {
        "status": "passed",
        "warnings": ["npm_audit_warning"],
        "completed_at": "2026-03-23T10:03:00Z"
      },
      "assigned_reviewer": null
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 5,
    "total_pages": 1
  }
}
```

---

### GET /review/{submission_id}

Get full review detail for a submission.

**Auth**: JWT (Reviewer role or higher)

**Response 200**:
```json
{
  "submission_id": "sub_r4s5t6",
  "plugin_id": "plg_movie-request",
  "plugin_name": "Movie Request Bot",
  "version": "1.2.0",
  "track": "minor_update",
  "developer": {
    "id": "usr_a1b2c3d4",
    "username": "sakakibara",
    "verified": true
  },
  "submitted_at": "2026-03-23T10:00:00Z",
  "automated_review": {
    "status": "passed",
    "checks": [
      { "name": "manifest_schema", "status": "passed", "message": null },
      { "name": "bundle_size", "status": "passed", "message": "245KB / 50MB" },
      { "name": "python_syntax", "status": "passed", "message": "3 files checked" },
      { "name": "typescript_build", "status": "passed", "message": null },
      { "name": "python_dep_audit", "status": "passed", "message": null },
      { "name": "npm_dep_audit", "status": "warning", "message": "1 low severity vulnerability in transitive dep" },
      { "name": "forbidden_patterns", "status": "passed", "message": null },
      { "name": "core_model_imports", "status": "passed", "message": null },
      { "name": "table_name_prefix", "status": "passed", "message": "All tables use plg_movie_request_ prefix" },
      { "name": "route_prefix", "status": "passed", "message": "All routes under /plugins/movie-request/" },
      { "name": "capability_check", "status": "passed", "message": null },
      { "name": "screenshot_presence", "status": "passed", "message": "2 screenshots" },
      { "name": "readme_length", "status": "passed", "message": "1240 chars" }
    ],
    "completed_at": "2026-03-23T10:03:00Z"
  },
  "human_review": {
    "status": "pending",
    "assigned_reviewer": null,
    "checklist": null
  },
  "bundle_url": "https://internal.market.adminchat.com/review/sub_r4s5t6/bundle.zip",
  "diff_url": "https://internal.market.adminchat.com/review/sub_r4s5t6/diff",
  "previous_version": "1.1.0"
}
```

---

### POST /review/{submission_id}/approve

Approve a submission. Publishes the plugin version to the Market.

**Auth**: JWT (Reviewer role or higher)

**Request Body**:
```json
{
  "notes": "Clean code, well documented. Minor npm audit warning is a transitive dependency, acceptable."
}
```

**Response 200**:
```json
{
  "submission_id": "sub_r4s5t6",
  "status": "approved",
  "published_at": "2026-03-24T12:00:00Z",
  "reviewer": "reviewer-username"
}
```

---

### POST /review/{submission_id}/reject

Reject a submission.

**Auth**: JWT (Reviewer role or higher)

**Request Body**:
```json
{
  "reason": "Plugin makes unauthorized API calls to external tracking service.",
  "category": "security",
  "details": "Found in backend/main.py line 45: HTTP POST to https://track.example.com with user data."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Human-readable rejection reason |
| `category` | string | Yes | `security`, `quality`, `functionality`, `policy` |
| `details` | string | No | Detailed explanation for the developer |

**Response 200**:
```json
{
  "submission_id": "sub_r4s5t6",
  "status": "rejected",
  "reason": "Plugin makes unauthorized API calls to external tracking service.",
  "category": "security",
  "rejected_at": "2026-03-24T12:00:00Z",
  "reviewer": "reviewer-username",
  "appeal_eligible": true
}
```

---

### POST /review/{submission_id}/request-changes

Request changes from the developer before final decision.

**Auth**: JWT (Reviewer role or higher)

**Request Body**:
```json
{
  "changes_requested": [
    {
      "file": "backend/main.py",
      "line": 45,
      "issue": "Remove external HTTP call to tracking service",
      "severity": "required"
    },
    {
      "file": "frontend/MovieSearch.tsx",
      "line": null,
      "issue": "Consider adding loading states for better UX",
      "severity": "suggested"
    }
  ],
  "summary": "One required security fix and one UX suggestion."
}
```

**Response 200**:
```json
{
  "submission_id": "sub_r4s5t6",
  "status": "changes_requested",
  "changes_count": 2,
  "required_changes": 1,
  "suggested_changes": 1,
  "requested_at": "2026-03-24T12:00:00Z",
  "reviewer": "reviewer-username"
}
```

---

## 5. Billing Endpoints

### POST /billing/checkout

Create a Stripe Checkout Session for purchasing a plugin license.

**Auth**: API Key (scope: `billing:write`)

**Request Body**:
```json
{
  "plugin_id": "plg_movie-request",
  "version": "1.2.0",
  "pricing_model": "one_time",
  "return_url": "https://my-panel.example.com/market/callback",
  "cancel_url": "https://my-panel.example.com/market"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plugin_id` | string | Yes | Plugin to purchase |
| `version` | string | No | Specific version (defaults to latest) |
| `pricing_model` | string | Yes | Must match plugin's configured pricing |
| `return_url` | string | Yes | Redirect URL after successful payment |
| `cancel_url` | string | No | Redirect URL if payment cancelled |

**Response 200**:
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_live_...",
  "session_id": "cs_live_a1b2c3d4",
  "expires_at": "2026-03-24T12:30:00Z"
}
```

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `PLUGIN_NOT_FOUND` | 404 | Plugin does not exist |
| `PLUGIN_IS_FREE` | 422 | Cannot checkout a free plugin |
| `ALREADY_LICENSED` | 409 | User already has an active license |
| `PRICING_MISMATCH` | 422 | Requested pricing model doesn't match plugin |

---

### GET /billing/licenses

List licenses for the authenticated user/Panel instance.

**Auth**: API Key (scope: `billing:read`)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `plugin_id` | string | - | Filter by plugin |
| `status` | string | `active` | `active`, `expired`, `revoked`, `all` |
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page |

**Response 200**:
```json
{
  "items": [
    {
      "id": "lic_m1n2o3",
      "license_key": "acp_lic_movie-request_a1b2c3d4e5f6...",
      "plugin_id": "plg_movie-request",
      "plugin_name": "Movie Request Bot",
      "type": "one_time",
      "status": "active",
      "valid_for_version": "1.x",
      "purchased_at": "2026-02-01T10:00:00Z",
      "expires_at": null,
      "stripe_subscription_id": null
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 3,
    "total_pages": 1
  }
}
```

---

### GET /billing/licenses/{id}

Verify a specific license's validity.

**Auth**: API Key (scope: `billing:read`)

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | License ID or license key |

**Response 200**:
```json
{
  "id": "lic_m1n2o3",
  "license_key": "acp_lic_movie-request_a1b2c3d4e5f6...",
  "plugin_id": "plg_movie-request",
  "type": "one_time",
  "status": "active",
  "valid": true,
  "valid_for_version": "1.x",
  "expires_at": null,
  "validated_at": "2026-03-24T12:00:00Z"
}
```

---

### POST /billing/webhooks/stripe

Stripe webhook endpoint. Receives Stripe events for payment processing.

**Auth**: Stripe webhook signature verification (`Stripe-Signature` header)

**Handled Events**:
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create license, record purchase |
| `invoice.payment_succeeded` | Extend subscription license |
| `invoice.payment_failed` | Mark license as `past_due` |
| `customer.subscription.deleted` | Mark license as `expired` |
| `charge.refunded` | Revoke license, trigger `license.revoked` webhook |

**Response 200**: `{ "received": true }`

---

### GET /billing/developer/earnings

Revenue dashboard for plugin developers.

**Auth**: JWT (Developer role)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `30d` | `7d`, `30d`, `90d`, `365d`, `all` |
| `plugin_id` | string | - | Filter by specific plugin |

**Response 200**:
```json
{
  "total_revenue": 1250.00,
  "platform_fee": 375.00,
  "net_earnings": 875.00,
  "pending_payout": 125.00,
  "currency": "USD",
  "by_plugin": [
    {
      "plugin_id": "plg_movie-request",
      "plugin_name": "Movie Request Bot",
      "revenue": 899.10,
      "sales_count": 90,
      "refund_count": 1,
      "refund_amount": 9.99
    }
  ],
  "by_period": [
    {
      "date": "2026-03-01",
      "revenue": 49.95,
      "sales_count": 5
    }
  ],
  "payouts": [
    {
      "id": "po_x1y2z3",
      "amount": 750.00,
      "status": "paid",
      "stripe_transfer_id": "tr_...",
      "paid_at": "2026-03-15T00:00:00Z"
    }
  ]
}
```

---

### POST /billing/developer/payout-settings

Configure Stripe Connect account for receiving payouts.

**Auth**: JWT (Developer role)

**Request Body**:
```json
{
  "action": "create_onboarding_link",
  "return_url": "https://market.adminchat.com/dashboard/settings",
  "refresh_url": "https://market.adminchat.com/dashboard/settings?stripe_refresh=1"
}
```

| Action | Description |
|--------|-------------|
| `create_onboarding_link` | Generate Stripe Connect onboarding URL |
| `check_status` | Check if Stripe account is fully onboarded |
| `create_dashboard_link` | Generate link to Stripe Express dashboard |

**Response 200** (for `create_onboarding_link`):
```json
{
  "onboarding_url": "https://connect.stripe.com/setup/...",
  "expires_at": "2026-03-24T12:30:00Z"
}
```

---

## 6. Analytics Endpoints

### GET /analytics/plugin/{id}

Plugin-level analytics for the developer or admin.

**Auth**: JWT (Developer - own plugins only, Admin - any plugin)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `30d` | `7d`, `30d`, `90d`, `365d`, `all` |
| `granularity` | string | `day` | `hour`, `day`, `week`, `month` |

**Response 200**:
```json
{
  "plugin_id": "plg_movie-request",
  "period": "30d",
  "summary": {
    "total_downloads": 89,
    "active_installs": 340,
    "new_installs": 45,
    "uninstalls": 12,
    "avg_rating": 4.7,
    "review_count": 23,
    "revenue": 449.55,
    "error_reports": 3
  },
  "timeseries": [
    {
      "date": "2026-03-24",
      "downloads": 5,
      "installs": 3,
      "uninstalls": 0,
      "revenue": 29.97,
      "errors": 0
    }
  ],
  "version_breakdown": [
    {
      "version": "1.2.0",
      "active_installs": 280,
      "downloads": 60
    },
    {
      "version": "1.1.0",
      "active_installs": 55,
      "downloads": 25
    }
  ],
  "panel_version_breakdown": [
    { "panel_version": "0.8.x", "installs": 250 },
    { "panel_version": "0.7.x", "installs": 90 }
  ]
}
```

---

### GET /analytics/global

Platform-wide analytics.

**Auth**: JWT (Admin role required)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `30d` | `7d`, `30d`, `90d`, `365d`, `all` |

**Response 200**:
```json
{
  "period": "30d",
  "summary": {
    "total_plugins": 156,
    "total_developers": 45,
    "total_downloads": 12500,
    "active_panel_instances": 890,
    "total_revenue": 15600.00,
    "platform_revenue": 4680.00,
    "new_plugins": 8,
    "new_developers": 3,
    "pending_reviews": 5,
    "avg_review_time_hours": 18.5
  },
  "top_plugins": [
    {
      "plugin_id": "plg_movie-request",
      "name": "Movie Request Bot",
      "downloads_period": 89,
      "active_installs": 340
    }
  ],
  "category_breakdown": [
    { "category": "entertainment", "count": 35, "downloads": 4500 },
    { "category": "moderation", "count": 28, "downloads": 3200 }
  ]
}
```

---

## 7. Admin Endpoints

### GET /admin/users

List and search users.

**Auth**: JWT (Admin role required)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | - | Search by username, email, display name |
| `role` | string | - | Filter by role |
| `status` | string | - | `active`, `suspended` |
| `verified` | boolean | - | Filter by verification status |
| `page` | integer | 1 | Page number |
| `page_size` | integer | 20 | Items per page |

**Response 200**:
```json
{
  "items": [
    {
      "id": "usr_a1b2c3d4",
      "email": "dev@example.com",
      "username": "sakakibara",
      "display_name": "SAKAKIBARA",
      "role": "developer",
      "verified": true,
      "status": "active",
      "plugins_count": 5,
      "api_keys_count": 2,
      "created_at": "2026-01-15T10:00:00Z",
      "last_login_at": "2026-03-24T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

---

### PATCH /admin/users/{id}

Update a user's role or status.

**Auth**: JWT (Admin role required)

**Request Body** (all fields optional):
```json
{
  "role": "reviewer",
  "status": "suspended",
  "suspension_reason": "Submitted malicious plugin",
  "verified": true
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `role` | string | `user`, `developer`, `reviewer`, `admin` (cannot set `super_admin`) |
| `status` | string | `active`, `suspended` |
| `suspension_reason` | string | Required when setting status to `suspended` |
| `verified` | boolean | Developer verification badge |

**Response 200**: Returns updated user object.

**Errors**:
| Code | HTTP | Description |
|------|------|-------------|
| `USER_NOT_FOUND` | 404 | User does not exist |
| `CANNOT_MODIFY_SUPER_ADMIN` | 403 | Cannot modify super_admin accounts |
| `CANNOT_ASSIGN_SUPER_ADMIN` | 403 | super_admin role cannot be assigned via API |

---

### GET /admin/stats

Real-time platform statistics.

**Auth**: JWT (Admin role required)

**Response 200**:
```json
{
  "users": {
    "total": 890,
    "by_role": {
      "super_admin": 1,
      "admin": 3,
      "reviewer": 5,
      "developer": 45,
      "user": 836
    },
    "active_today": 156,
    "new_last_7d": 23
  },
  "plugins": {
    "total_published": 156,
    "total_versions": 412,
    "pending_review": 5,
    "recalled": 2
  },
  "billing": {
    "revenue_today": 149.85,
    "revenue_mtd": 4560.00,
    "active_subscriptions": 234,
    "pending_payouts": 890.00
  },
  "infrastructure": {
    "storage_used_gb": 12.5,
    "api_requests_today": 45000,
    "avg_response_time_ms": 45
  }
}
```

---

## Webhook Events (Market to Panel)

Market pushes webhook notifications to Panel instances that have configured a webhook URL.

### Webhook Delivery
- Method: `POST`
- Content-Type: `application/json`
- Signature header: `X-Market-Signature: sha256=<HMAC-SHA256 of body using webhook secret>`
- Retry: 3 attempts with exponential backoff (1min, 5min, 30min)

### Event: plugin.update_available

```json
{
  "event": "plugin.update_available",
  "timestamp": "2026-03-24T12:00:00Z",
  "data": {
    "plugin_id": "plg_movie-request",
    "plugin_name": "Movie Request Bot",
    "current_version": "1.1.0",
    "new_version": "1.2.0",
    "changelog": "- Fixed movie search pagination\n- Added TMDB integration",
    "requires_license_upgrade": false,
    "min_panel_version": "0.7.0"
  }
}
```

### Event: plugin.recalled

```json
{
  "event": "plugin.recalled",
  "timestamp": "2026-03-24T12:00:00Z",
  "data": {
    "plugin_id": "plg_malicious-plugin",
    "plugin_name": "Malicious Plugin",
    "reason": "Security vulnerability - data exfiltration",
    "action_required": "disable",
    "recalled_by": "admin-username"
  }
}
```

### Event: license.expired

```json
{
  "event": "license.expired",
  "timestamp": "2026-03-24T12:00:00Z",
  "data": {
    "plugin_id": "plg_movie-request",
    "license_key": "acp_lic_movie-request_a1b2c3d4...",
    "type": "subscription_monthly",
    "expired_at": "2026-03-24T00:00:00Z",
    "grace_period_ends": "2026-03-31T00:00:00Z"
  }
}
```

---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "Plugin 'xyz' does not exist",
    "details": {},
    "request_id": "req_a1b2c3d4"
  }
}
```

### Standard Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Rate limits are enforced per IP (public) or per API key (authenticated).

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Public endpoints | 60 requests | 1 minute |
| Authenticated endpoints | 300 requests | 1 minute |
| Plugin download | 100 requests | 1 hour |
| Plugin upload | 10 requests | 1 hour |
| Stripe webhook | Unlimited | - |

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1711281600
```

When rate limited, the response includes:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "details": {
      "retry_after": 45
    }
  }
}
```
