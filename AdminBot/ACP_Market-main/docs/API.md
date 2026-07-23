# ACP Market API Reference

Base URL: `/api/v1`

All responses are wrapped in:
```json
{ "code": 200, "message": "success", "data": { ... } }
```

---

## Authentication

### POST /auth/register
Create a developer account. Sets HttpOnly auth cookies.

**Body:**
```json
{
  "email": "dev@example.com",
  "username": "mydev",
  "password": "securepassword",
  "display_name": "My Dev"
}
```

### POST /auth/login
Login with email/password. Sets HttpOnly auth cookies.

**Body:**
```json
{
  "email": "dev@example.com",
  "password": "securepassword",
  "remember_me": true
}
```

### POST /auth/refresh
Refresh access token. Reads refresh token from cookie or body.

### POST /auth/logout
Clear auth cookies.

### GET /auth/me
Get current authenticated user. **Requires auth.**

### POST /auth/forgot-password
Send password reset email. Always returns 200 (prevents email enumeration).

**Body:** `{ "email": "dev@example.com" }`

### POST /auth/reset-password
Reset password using token from email.

**Body:** `{ "token": "...", "new_password": "newpassword12" }`

### POST /auth/change-password
Change password for authenticated user. **Requires auth.**

**Body:** `{ "old_password": "...", "new_password": "..." }`

### POST /auth/api-keys
Generate API key. **Requires auth.**

### GET /auth/api-keys
List API keys. **Requires auth.**

### DELETE /auth/api-keys/{key_id}
Revoke API key. **Requires auth.**

---

## Plugins

### GET /plugins
List published plugins (public).

**Query params:** `q`, `category`, `sort` (popular|newest|updated), `page`, `page_size`, `pricing` (all|free|paid), `author_id`, `min_panel_version`

### GET /plugins/{plugin_id}
Plugin detail with approved versions (public).

### GET /plugins/{plugin_id}/versions/{version}
Specific version detail (public).

### POST /plugins
Submit new plugin. **Requires auth.**

**Multipart form:** `bundle` (zip file) + `metadata` (JSON string)

### POST /plugins/{plugin_id}/versions
Submit new version. **Requires auth (owner only).**

### GET /plugins/{plugin_id}/versions/{version}/download
Download plugin bundle. **Requires auth.** Validates license for paid plugins.

### POST /plugins/check-updates
Batch check for updates.

**Body:** `{ "installed": [{"id": "...", "version": "..."}], "panel_version": "1.0.0" }`

---

## Billing

### POST /billing/checkout
Create Stripe Checkout Session. **Requires auth.**

**Body:** `{ "plugin_id": "...", "version": "..." }`

### GET /billing/licenses
List current user's licenses. **Requires auth.**

### GET /billing/purchases
List purchases for plugins authored by current user. **Requires auth.**

**Query params:** `page`, `page_size`

### GET /billing/licenses/{license_key}/validate
Validate a license key (public).

### POST /billing/webhooks/stripe
Stripe webhook handler (signature-verified).

---

## Review

### GET /review/queue
List pending submissions. **Requires reviewer role.**

### GET /review/{submission_id}
Submission detail. **Requires reviewer role.**

### POST /review/{submission_id}/approve
Approve and publish. **Requires reviewer role.**

### POST /review/{submission_id}/reject
Reject with reason. **Requires reviewer role.**

### POST /review/{submission_id}/request-changes
Request changes with feedback. **Requires reviewer role.**

---

## Admin

### GET /admin/users
List users with search/role filtering. **Requires admin role.**

### PATCH /admin/users/{user_id}
Update user role/status. **Requires admin role.**

### GET /admin/stats
Platform statistics. **Requires admin role.**

### DELETE /admin/plugins/{plugin_id}
Force remove plugin. **Requires admin role.**
