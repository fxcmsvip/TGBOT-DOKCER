# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-29

### Added

#### Agent System
- **Agent Model**: New `Agent` model for defining AI agent roles with name, description, system prompt, avatar, and welcome message
- **Agent Conversations**: Track conversation history between users and agents
- **Agent Messages**: Store individual messages in agent conversations
- **Agent API**: Full CRUD endpoints for agent management (`/api/v1/agents`)
- **Agent Chat**: Chat endpoint for interacting with agents (`/api/v1/agents/{id}/chat`)
- **Agent Frontend**: New Agents page with create/edit/delete functionality
- **Multi-Model Support**: Each agent can bind to different AI configurations

#### Scheduled Tasks
- **Task Model**: New `ScheduledTask` model with cron expression support
- **Task Types**: Support for `send_message`, `cleanup_data`, `sync_external`, and `custom` task types
- **Task Execution Logs**: Track task execution history with status, duration, and results
- **Task API**: Full CRUD endpoints for task management (`/api/v1/tasks`)
- **Manual Execution**: Execute tasks on-demand via API
- **Timezone Support**: Configure task timezone independently

#### Bot Source Code Management
- **Source Code Model**: New `BotSourceCode` model for storing generated Python source
- **Source Generator**: Automatically generate aiogram Python code from bot configuration
- **Source API**: Endpoints for get/update/regenerate/validate/restart (`/api/v1/bots/{id}/source`)
- **Local Execution**: Option to run generated bot code locally
- **Smart Restart**: Try local execution first, fall back to remote mode on failure
- **Source Editor**: Frontend component for viewing and editing bot source code
- **Syntax Validation**: Validate Python syntax before saving

#### AI Provider Extensions
- **Ollama Support**: Local AI provider support via Ollama API
- **Coze Support**: Integration with Coze (扣子) platform
- **Provider Field**: New `provider` field in AI config to distinguish between providers
- **Ollama Handler**: Specialized request/response handling for Ollama format
- **Coze Handler**: Specialized request/response handling for Coze format

#### Internationalization (i18n)
- **i18next Integration**: Full i18n support using react-i18next
- **Language Detection**: Automatic language detection from browser settings
- **Language Switcher**: Settings page language selector (System/Chinese/English)
- **Translation Files**: Complete zh-CN and en-US translations
- **Time Formatting**: Localized time and date formatting

### Changed

#### Security
- **Bot Token Encryption**: Bot tokens are now encrypted using Fernet before storage
- **Token Hash**: Added `token_hash` field for deduplication queries
- **Fernet Key Logging**: Auto-generated Fernet key no longer logged to console
- **Migration 007**: New migration to encrypt existing plaintext tokens

#### Configuration
- **New Environment Variables**: Added variables for agents, tasks, and bot source management
- **Config Expansion**: Extended `Settings` class with new configuration options

#### AI Handler
- **Multi-Provider Support**: Refactored AI handler to support multiple providers
- **Ollama Format**: Added Ollama-specific request/response format handling
- **Coze Format**: Added Coze-specific request/response format handling
- **Response Parsing**: Enhanced response parsing for different provider formats

### Fixed

- **Login Page Refresh**: Identified polling issue causing login page refresh (Chat.tsx 5s polling)
- **Token Refresh**: Improved token refresh logic to prevent unnecessary redirects

### Database Migrations

- **007_add_agents_and_tasks.py**: 
  - Create `agents` table
  - Create `agent_conversations` table
  - Create `agent_messages` table
  - Create `scheduled_tasks` table
  - Create `task_execution_logs` table
  - Create `bot_source_codes` table
  - Add `token_hash` column to `bots` table

### Documentation

- **API.md**: Comprehensive API documentation for all endpoints
- **CHANGELOG.md**: This changelog file
- **README.md**: Updated with new features section
- **.env.example**: Updated with new environment variables and comments

---

## [0.9.0] - 2026-03-15

### Added
- Initial i18n infrastructure
- Language store with Zustand
- Translation files for zh-CN and en-US

### Changed
- Migrated hardcoded English text to i18n keys
- Updated Settings page with language switcher

---

## [0.8.0] - 2026-03-01

### Added
- Multi-bot pool management
- FAQ engine with 5 match modes and 8 reply modes
- RAG knowledge base integration with Dify
- AI Provider OAuth authentication
- WebSocket real-time chat
- User management system

---

[1.0.0]: https://github.com/fxxkrlab/ADMINCHAT_PANEL/releases/tag/v1.0.0
[0.9.0]: https://github.com/fxxkrlab/ADMINCHAT_PANEL/releases/tag/v0.9.0
[0.8.0]: https://github.com/fxxkrlab/ADMINCHAT_PANEL/releases/tag/v0.8.0
