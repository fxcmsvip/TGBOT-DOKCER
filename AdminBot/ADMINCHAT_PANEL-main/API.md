# ADMINCHAT Panel API Documentation

> Version: 1.0.0 | Last Updated: 2026-03-29

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All API endpoints require authentication via JWT token.

```
Authorization: Bearer <access_token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

## Agents API

### List Agents

```http
GET /agents
```

**Query Parameters:**
- `skip` (int, optional): Number of records to skip
- `limit` (int, optional): Maximum number of records (default: 100)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Customer Support",
    "description": "Handles customer inquiries",
    "system_prompt": "You are a helpful customer support agent...",
    "avatar_url": "https://...",
    "welcome_message": "Hello! How can I help you today?",
    "ai_config_id": 1,
    "is_active": true,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
]
```

### Get Agent

```http
GET /agents/{agent_id}
```

### Create Agent

```http
POST /agents
Content-Type: application/json

{
  "name": "Customer Support",
  "description": "Handles customer inquiries",
  "system_prompt": "You are a helpful customer support agent...",
  "avatar_url": "https://example.com/avatar.png",
  "welcome_message": "Hello! How can I help you today?",
  "ai_config_id": 1,
  "is_active": true
}
```

### Update Agent

```http
PUT /agents/{agent_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Agent

```http
DELETE /agents/{agent_id}
```

### Chat with Agent

```http
POST /agents/{agent_id}/chat
Content-Type: application/json

{
  "message": "Hello, I need help with my order",
  "conversation_id": null
}
```

**Response:**
```json
{
  "conversation_id": 1,
  "message": "Hello! I'd be happy to help you with your order...",
  "timestamp": "2026-03-29T10:05:00Z"
}
```

---

## Scheduled Tasks API

### List Tasks

```http
GET /tasks
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Daily Report",
    "description": "Generate daily statistics report",
    "task_type": "send_message",
    "cron_expression": "0 9 * * *",
    "timezone": "UTC",
    "config": {
      "bot_id": 1,
      "chat_id": -1001234567890,
      "message": "Daily report: ..."
    },
    "is_active": true,
    "last_run_at": "2026-03-28T09:00:00Z",
    "next_run_at": "2026-03-29T09:00:00Z",
    "created_at": "2026-03-01T10:00:00Z"
  }
]
```

### Get Task

```http
GET /tasks/{task_id}
```

### Create Task

```http
POST /tasks
Content-Type: application/json

{
  "name": "Daily Report",
  "description": "Generate daily statistics report",
  "task_type": "send_message",
  "cron_expression": "0 9 * * *",
  "timezone": "UTC",
  "config": {
    "bot_id": 1,
    "chat_id": -1001234567890,
    "message": "Daily report: ..."
  },
  "is_active": true
}
```

**Task Types:**
- `send_message`: Send a message to a chat
- `cleanup_data`: Clean up old data
- `sync_external`: Sync with external service
- `custom`: Custom task (requires handler)

### Update Task

```http
PUT /tasks/{task_id}
Content-Type: application/json

{
  "cron_expression": "0 10 * * *",
  "is_active": false
}
```

### Delete Task

```http
DELETE /tasks/{task_id}
```

### Execute Task Manually

```http
POST /tasks/{task_id}/execute
```

**Response:**
```json
{
  "success": true,
  "message": "Task executed successfully",
  "execution_time_ms": 1234
}
```

### Get Task Execution Logs

```http
GET /tasks/{task_id}/logs
```

**Query Parameters:**
- `skip` (int, optional): Number of records to skip
- `limit` (int, optional): Maximum number of records (default: 50)

**Response:**
```json
[
  {
    "id": 1,
    "task_id": 1,
    "status": "success",
    "started_at": "2026-03-29T09:00:00Z",
    "completed_at": "2026-03-29T09:00:01Z",
    "duration_ms": 1234,
    "error_message": null,
    "result": {"messages_sent": 1}
  }
]
```

---

## Bot Source Code API

### Get Bot Source Code

```http
GET /bots/{bot_id}/source
```

**Response:**
```json
{
  "bot_id": 1,
  "source_code": "from aiogram import Bot, Dispatcher\n...",
  "file_path": "/app/bot_sources/bot_1.py",
  "is_generated": true,
  "last_generated_at": "2026-03-29T10:00:00Z",
  "last_modified_at": "2026-03-29T10:05:00Z"
}
```

### Update Bot Source Code

```http
PUT /bots/{bot_id}/source
Content-Type: application/json

{
  "source_code": "from aiogram import Bot, Dispatcher\n# Custom code..."
}
```

### Regenerate Source Code

```http
POST /bots/{bot_id}/source/regenerate
```

**Response:**
```json
{
  "bot_id": 1,
  "source_code": "from aiogram import Bot, Dispatcher\n...",
  "message": "Source code regenerated successfully"
}
```

### Validate Source Code

```http
POST /bots/{bot_id}/source/validate
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

### Restart Bot

```http
POST /bots/{bot_id}/source/restart
```

**Response:**
```json
{
  "bot_id": 1,
  "status": "running",
  "mode": "local",
  "message": "Bot restarted successfully in local mode"
}
```

**Restart Strategy:**
1. Try to start the local source code file
2. If local execution fails, fall back to remote mode (using stored token)
3. Return the actual mode used

---

## AI Configuration API

### List AI Configs

```http
GET /ai/configs
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "OpenAI GPT-4",
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4",
    "auth_type": "api_key",
    "is_active": true,
    "created_at": "2026-03-01T10:00:00Z"
  }
]
```

### Create AI Config

```http
POST /ai/configs
Content-Type: application/json

{
  "name": "OpenAI GPT-4",
  "provider": "openai",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4",
  "auth_type": "api_key",
  "api_key": "sk-...",
  "is_active": true
}
```

**Supported Providers:**
- `openai`: OpenAI API (GPT-4, GPT-3.5)
- `anthropic`: Anthropic API (Claude)
- `ollama`: Ollama local AI (Llama, Mistral, etc.)
- `coze`: Coze (扣子) API
- `custom`: Custom OpenAI-compatible API

### Test AI Connection

```http
POST /ai/configs/{config_id}/test
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "response_time_ms": 234
}
```

---

## Environment Variables

### New Variables (v1.0.0)

```bash
# ===== AI Provider =====
AI_PROVIDER=openai          # openai | anthropic | ollama | coze | custom
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-xxx
AI_MODEL=gpt-4o-mini

# ===== Ollama (Local AI) =====
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# ===== Coze (扣子) =====
COZE_API_KEY=your_coze_api_key
COZE_BOT_ID=your_coze_bot_id

# ===== Agent System =====
AGENT_DEFAULT_MODEL=gpt-4o-mini
AGENT_MAX_HISTORY=20

# ===== Bot Source Code Management =====
BOT_SOURCE_DIR=/app/bot_sources
BOT_LOCAL_EXECUTION=false

# ===== Scheduled Tasks =====
TASK_SCHEDULER_ENABLED=true
TASK_SCHEDULER_TIMEZONE=UTC
```

---

## Changelog

### v1.0.0 (2026-03-29)

**New Features:**
- Added Agent System with role management and multi-model support
- Added Scheduled Tasks with cron expression support
- Added Bot Source Code Management with online editor
- Added Ollama and Coze AI provider support
- Added i18n support (Chinese/English)

**Security Fixes:**
- Bot tokens are now encrypted using Fernet before storage
- Fernet encryption key no longer logged to console

**Improvements:**
- Enhanced AI handler to support multiple providers
- Added source code validation before execution
- Improved restart strategy with fallback mechanism

---

*For more information, see [README.md](./README.md)*
