English | [中文](./README.md)

---

<!-- Community & Status -->
![GitHub Stars](https://img.shields.io/github/stars/fxxkrlab/ACP_PLUGINS?style=flat-square&color=FFD700&logo=github)
![GitHub Forks](https://img.shields.io/github/forks/fxxkrlab/ACP_PLUGINS?style=flat-square&color=8B5CF6&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/fxxkrlab/ACP_PLUGINS?style=flat-square&color=FF8800&logo=github)
![GitHub Last Commit](https://img.shields.io/github/last-commit/fxxkrlab/ACP_PLUGINS?style=flat-square&color=059669&logo=github)
![License](https://img.shields.io/badge/License-GPL_3.0-blue?style=flat-square)

<!-- Ecosystem -->
![ADMINCHAT Panel](https://img.shields.io/badge/ADMINCHAT-Panel-00D9FF?style=flat-square&logo=telegram&logoColor=white)
![ACP Plugin SDK](https://img.shields.io/badge/ACP-Plugin_SDK-8B5CF6?style=flat-square)
![ACP Market](https://img.shields.io/badge/ACP-Market-059669?style=flat-square)

<!-- Vibe -->
![Built with AI](https://img.shields.io/badge/Built_with-Claude_AI_%F0%9F%A4%96-8B5CF6?style=flat-square)
![Made with Love](https://img.shields.io/badge/Made_with-%E2%9D%A4%EF%B8%8F-FF4444?style=flat-square)

# ACP Plugins

> &reg; 2026 NovaHelix & SAKAKIBARA

**Official plugin repository for ADMINCHAT Panel** &mdash; A curated collection of reviewed third-party plugins and official example plugins. All plugins follow the ACP Plugin SDK specification and can be installed via [ACP Market](https://acpmarket.novahelix.org).

---

## Available Plugins

| Plugin | Description | Version | Status |
|--------|-------------|---------|--------|
| [movie-request](./movie-request/) | TMDB Request System — Users submit TMDB links via Bot, with auto metadata parsing, deduplication, and external media library lookup | 1.0.0 | Published |

---

## Movie Request System

A full-featured movie/TV request system powered by TMDB.

### Features

- **TMDB Request System** &mdash; Users submit TMDB movie/TV links via Bot; metadata is automatically parsed and stored
- **Smart Trigger Rules** &mdash; `/req` command in private chats, `@bot req` in group chats; prevents duplicate triggers across Bot pools
- **Auto Deduplication** &mdash; Duplicate requests for the same title are merged; request count increments and all requesting users are tracked
- **TMDB API Multi-Key Rotation** &mdash; Configure multiple TMDB API keys with automatic rotation and rate-limit handling
- **Optional External Media Library** &mdash; Connect PostgreSQL/MySQL databases to check if a title already exists in your library
- **Admin Management Page** &mdash; View, approve, or reject requests from the web panel

### Trigger Rules

| Context | Format | Triggered | Reason |
|---------|--------|-----------|--------|
| Private | `/req TMDB_URL` | Yes | Command trigger |
| Private | `req TMDB_URL` | Yes | Shorthand trigger |
| Private | Bare TMDB URL | No | Not recognized as a request |
| Group | `@bot req TMDB_URL` | Yes | @mention + req |
| Group | `/req TMDB_URL` | No | Prevents duplicate triggers across Bot pool |

### Processing Flow

1. User sends a message containing a TMDB URL
2. Custom filter checks the trigger pattern (private: `^/?req\s`, group: `@bot_username\s+req`)
3. Regex extracts `tmdb_id` and `media_type` from the URL
4. Database deduplication check on `tmdb_id + media_type`
   - **Existing**: Increment request count, add user record, reply with card
   - **New**: Fetch details from TMDB API, query external media library (optional), store record, reply with cover card

---

## Development Guide

Want to build your own ACP plugin? Use the [ACP Plugin SDK](https://github.com/fxxkrlab/acp-plugin-sdk).

### Quick Start

```bash
# Install the SDK and CLI tools
pip install acp-plugin-sdk

# Initialize a new plugin project
acp-cli init my-plugin

# Validate manifest.json and plugin structure
acp-cli validate

# Build the plugin package
acp-cli build

# Publish to ACP Market
acp-cli publish
```

### Plugin Capabilities

ACP plugins support five capability declarations (configured in `manifest.json`):

| Capability | Description |
|------------|-------------|
| `database` | Plugin owns independent database tables (auto-migration) |
| `bot_handler` | Register Telegram Bot message handlers |
| `api_routes` | Register backend API routes |
| `frontend_pages` | Provide frontend pages (sidebar entry) |
| `settings_tab` | Add configuration tabs to the settings page |

### Related Links

- [ACP Plugin SDK](https://github.com/fxxkrlab/acp-plugin-sdk) &mdash; Plugin development SDK + CLI tools
- [ADMINCHAT Panel](https://github.com/fxxkrlab/ADMINCHAT_PANEL) &mdash; Main project
- [ACP Market](https://acpmarket.novahelix.org) &mdash; Plugin marketplace

---

## License

This project is licensed under [GPL-3.0](LICENSE).

&reg; 2026 NovaHelix & SAKAKIBARA. All rights reserved.

Copyright holders may use the code commercially (closed-source). Third parties must keep it open source under GPL-3.0.
