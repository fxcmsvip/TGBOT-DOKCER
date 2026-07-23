# TMDB Movie Request Plugin

ADMINCHAT Panel plugin for TMDB movie/TV request management with multi-key rotation, media library dedup, confirmation flow, version/gap detection, and webhook push.

> **[中文文档](README.md)**

## Features

### Telegram Bot
- Submit requests via `/req <TMDB_URL>` (private) or `@bot req <TMDB_URL>` (group)
- **Rich reply cards**: poster, tagline, runtime, country, director, top 3 cast, synopsis, IMDB/TMDB links
- **Two-step confirmation**: preview card + ✅ Confirm / ❌ Cancel inline buttons before saving
- **Media library dedup**: queries external DB/API to check if title already exists

### Movie Supplement
- Library has 1080p but missing 4K → "✅ 补片 4K" button
- Library has 4K but missing 1080p → "✅ 补片 1080p" button
- Only checks 1080p / 4K — ignores 720p, DoVi flavours, etc.

### TV Season/Episode Supplement
- **Compact season summary**: `23 seasons | ✓ 20 complete | ⚠️ 3 incomplete`
- **Gap detection**: compares TMDB per-season episode counts vs library actual counts
- **Season supplement buttons**: up to 3 buttons for most-incomplete seasons
- **Precise episode supplement**: reply to the library card with `S21E15` to request a specific episode
- **Path-based fallback**: queries by `path LIKE '%[tmdbid=XXX]%'` when tmdb column is empty
- **Media-type filtering**: prevents tmdb_id collisions (`/movie/4614` vs `/tv/4614`)

### Admin Panel
- Request list with poster, title, TMDB ID, rating, request count, library status
- Action buttons: ✓ Fulfill (with optional webhook push), ✗ Reject, 🗑 Delete
- Supplement tags: orange badges like `补片 4K`, `补片 S21`, `补片 S05E18`

### Settings → Request Config
- **TMDB API Keys**: multi-key management with v3 API Key and v4 Bearer Token support
- **Media Library Check**: multiple DB/API connections, card-based UI, edit in place
- **Fulfill Webhook**: push request data to external systems when fulfilled

---

## Bot Commands

| Context | Format | Example |
|---|---|---|
| Private | `/req <TMDB_URL>` | `/req https://www.themoviedb.org/movie/550` |
| Private | `req <TMDB_URL>` | `req https://www.themoviedb.org/tv/1396` |
| Group | `@bot req <TMDB_URL>` | `@HALO_ChatBot req https://www.themoviedb.org/movie/550` |
| Supplement | Reply to card with `S21E15` | Precise single-episode request |
| Supplement | Reply to card with `S21` | Whole-season request |

---

## Fulfill Webhook

When an admin clicks ✓ (Fulfill), the plugin POSTs request data to a configured webhook URL.

### Configuration

In **Settings → Request Config → Plugin Config**:

| Field | Example | Description |
|---|---|---|
| Webhook URL | `https://api.example.com/fulfill` | Empty = disabled |
| Auth Header Name | `Authorization` / `X-Api-Key` | Empty = no auth header |
| Auth Header Value | `Bearer xxx` / `my-secret` | Corresponding value |

### Auth Methods

| Method | Header Name | Header Value |
|---|---|---|
| Bearer Token | `Authorization` | `Bearer eyJhbGci...` |
| API Key | `X-Api-Key` | `my-secret-key` |
| Basic Auth | `Authorization` | `Basic dXNlcjpwYXNz` |
| Custom | Any name | Any value |
| Query Param | (empty) | Append `?token=xxx` to URL |
| None | (empty) | (empty) |

### JSON Payload

```json
{
  "id": 8,
  "tmdb_id": 4614,
  "media_type": "tv",
  "title": "NCIS",
  "original_title": "NCIS",
  "requested_resolution": "S05E18",
  "request_count": 1,
  "admin_note": null
}
```

| `requested_resolution` | Meaning |
|---|---|
| `null` | Full request (whole title) |
| `"4K"` | Movie supplement — want 4K version |
| `"1080p"` | Movie supplement — want 1080p version |
| `"S21"` | TV supplement — want entire season 21 |
| `"S05E18"` | TV supplement — want season 5 episode 18 |

---

## Compatibility

Requires ADMINCHAT Panel >= **1.1.5**

## License

GPL-3.0 — (R) 2026 NovaHelix & SAKAKIBARA
