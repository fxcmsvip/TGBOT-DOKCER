# Plugin Backend API Reference

> **Package:** `acp_plugin_sdk`
> **Python:** 3.12+
> **Async:** All SDK methods are async unless noted otherwise.

This document defines the complete Python SDK surface available to ADMINCHAT Panel plugins. Plugin developers import from `acp_plugin_sdk` and interact with core platform data exclusively through the SDK bridge — never through direct model imports.

---

## Table of Contents

1. [PluginBase Class](#1-pluginbase-class)
2. [Core SDK Bridge (self.sdk)](#2-core-sdk-bridge)
3. [Secret Store](#3-secret-store)
4. [Plugin Config](#4-plugin-config)
5. [Event System](#5-event-system)
6. [Database Helpers](#6-database-helpers)
7. [Bot Handler Registration](#7-bot-handler-registration)
8. [FastAPI Router](#8-fastapi-router)
9. [Logging](#9-logging)
10. [Type Definitions](#10-type-definitions)
11. [Error Handling](#11-error-handling)
12. [Lifecycle & Execution Order](#12-lifecycle--execution-order)

---

## 1. PluginBase Class

Every plugin must subclass `PluginBase` and define a unique `plugin_id`.

```python
from acp_plugin_sdk import PluginBase

class MyPlugin(PluginBase):
    plugin_id = "my-plugin"          # Must match manifest.json plugin_id
    version = "1.0.0"                # Must match manifest.json version

    async def setup(self, app: "FastAPI", dp: "Dispatcher"):
        """
        Called once when the plugin is activated by the Panel admin.

        Args:
            app: The FastAPI application instance. Use to include plugin routers.
            dp: The aiogram 3 Dispatcher instance. Use to include bot routers.

        This is where you:
        - Register FastAPI API routers via app.include_router()
        - Register aiogram bot routers via dp.include_router()
        - Run initial database migrations
        - Start background tasks
        """
        from .api import router as api_router
        from .bot import router as bot_router

        app.include_router(api_router)
        dp.include_router(bot_router)
        await self.db.run_migrations()

    async def teardown(self):
        """
        Called when the plugin is deactivated or the Panel shuts down.

        Use to:
        - Cancel background tasks
        - Close external connections
        - Flush buffers

        Database tables are NOT dropped on teardown. They persist until
        the plugin is uninstalled (explicit admin action).
        """
        pass
```

### PluginBase Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `self.plugin_id` | `str` | The plugin's unique identifier |
| `self.version` | `str` | The plugin's semver version |
| `self.sdk` | `CoreSDKBridge` | Bridge to core platform APIs |
| `self.secrets` | `SecretStore` | Encrypted key-value storage |
| `self.config` | `PluginConfig` | Plugin configuration manager |
| `self.db` | `PluginDB` | Database session & migration helpers |
| `self.logger` | `logging.Logger` | Pre-configured logger |

### PluginBase Methods

| Method | Description |
|--------|-------------|
| `async setup(app, dp)` | Called on activation. Register routes/handlers here. |
| `async teardown()` | Called on deactivation. Clean up resources. |
| `on_event(event_name)` | Class-method decorator to register event handlers. |

---

## 2. Core SDK Bridge

The SDK bridge (`self.sdk`) provides read-only access to core platform data. Each API group requires a scope declared in the plugin's `manifest.json` under `core_api_scopes`.

```json
{
  "core_api_scopes": ["users:read", "bots:read", "conversations:read", "messages:read"]
}
```

If a plugin calls an API without the required scope, `PermissionDeniedError` is raised.

### 2.1 Users API

**Required scope:** `users:read`

```python
# Get a user by internal database ID
user = await self.sdk.users.get_by_id(id=42)

# Get a user by Telegram user ID
user = await self.sdk.users.get_by_tg_uid(tg_uid=123456789)

# Search users by username (partial match)
users = await self.sdk.users.search(username="john", limit=20)
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `get_by_id(id)` | `id: int` | `UserDict \| None` | Lookup by internal DB primary key |
| `get_by_tg_uid(tg_uid)` | `tg_uid: int` | `UserDict \| None` | Lookup by Telegram user ID |
| `search(username, limit)` | `username: str \| None`, `limit: int = 20` | `list[UserDict]` | Partial username match, max `limit` results |

#### Return Type: `UserDict`

```python
{
    "id": 42,                           # int — Internal database ID
    "tg_uid": 123456789,                # int — Telegram user ID
    "username": "john_doe",             # str | None — Telegram @username
    "first_name": "John",              # str — Telegram first name
    "last_name": "Doe",                # str | None — Telegram last name
    "is_blocked": False,                # bool — Whether user is blocked
    "is_premium": True,                 # bool — Telegram Premium status
    "created_at": "2026-01-15T10:30:00Z"  # str — ISO 8601 timestamp
}
```

### 2.2 Bots API

**Required scope:** `bots:read`

```python
# Get all active (running) bots
bots = await self.sdk.bots.get_active()

# Get a specific bot by internal ID
bot = await self.sdk.bots.get_by_id(id=1)
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `get_active()` | — | `list[BotDict]` | All bots with status "running" |
| `get_by_id(id)` | `id: int` | `BotDict \| None` | Lookup by internal DB primary key |

#### Return Type: `BotDict`

```python
{
    "id": 1,                            # int — Internal database ID
    "bot_username": "my_service_bot",   # str — Bot's @username
    "display_name": "Service Bot",      # str — Admin-facing display name
    "status": "running",                # str — "running" | "stopped" | "error"
    "created_at": "2026-01-10T08:00:00Z"  # str — ISO 8601 timestamp
}
```

### 2.3 Conversations API

**Required scope:** `conversations:read`

```python
# Get all conversations for a Telegram user
convos = await self.sdk.conversations.get_by_user(tg_user_id=123456789)
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `get_by_user(tg_user_id)` | `tg_user_id: int` | `list[ConversationDict]` | All conversations for the given TG user |

#### Return Type: `ConversationDict`

```python
{
    "id": 100,                          # int — Internal conversation ID
    "bot_id": 1,                        # int — Bot that owns this conversation
    "tg_user_id": 123456789,            # int — Telegram user ID
    "status": "open",                   # str — "open" | "closed" | "archived"
    "assigned_admin_id": 5,             # int | None — Assigned admin user ID
    "created_at": "2026-01-20T14:00:00Z",
    "updated_at": "2026-03-01T09:15:00Z"
}
```

### 2.4 Messages API

**Required scope:** `messages:read`

```python
# Get recent messages in a conversation
messages = await self.sdk.messages.get_recent(conversation_id=100, limit=50)
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `get_recent(conversation_id, limit)` | `conversation_id: int`, `limit: int = 50` | `list[MessageDict]` | Most recent messages, newest first |

#### Return Type: `MessageDict`

```python
{
    "id": 5000,                         # int — Internal message ID
    "conversation_id": 100,             # int — Parent conversation
    "tg_message_id": 42,                # int — Telegram message ID
    "direction": "incoming",            # str — "incoming" | "outgoing"
    "content_type": "text",             # str — "text" | "photo" | "document" | "sticker" | ...
    "text": "Hello, I need help",       # str | None — Text content
    "media_file_id": None,              # str | None — Telegram file_id for media
    "sender_admin_id": None,            # int | None — Admin who sent (outgoing only)
    "created_at": "2026-03-01T09:15:00Z"
}
```

---

## 3. Secret Store

Encrypted key-value storage for sensitive data (API keys, tokens, credentials). Values are encrypted at rest using the Panel's master encryption key. Secrets are scoped per-plugin — plugins cannot read each other's secrets.

```python
# Store a secret
await self.secrets.set("tmdb_api_key", "abc123xyz")

# Retrieve a secret
api_key = await self.secrets.get("tmdb_api_key")  # Returns "abc123xyz" or None

# Delete a secret
await self.secrets.delete("tmdb_api_key")

# List all secret keys (values are NOT returned)
keys = await self.secrets.list_keys()  # Returns ["tmdb_api_key", "webhook_secret"]
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `set(key, value)` | `key: str`, `value: str` | `None` | Store or overwrite a secret |
| `get(key)` | `key: str` | `str \| None` | Retrieve a secret value |
| `delete(key)` | `key: str` | `None` | Remove a secret |
| `list_keys()` | — | `list[str]` | List all stored key names |

### Constraints

- Key max length: 128 characters
- Value max length: 8192 characters
- Key characters: `a-z`, `A-Z`, `0-9`, `_`, `-`, `.`
- Max secrets per plugin: 50

---

## 4. Plugin Config

Configuration values defined by the plugin's `config_schema` in `manifest.json`. These are non-sensitive settings that admins can modify through the Panel UI.

```json
// manifest.json
{
  "config_schema": {
    "auto_approve": {
      "type": "boolean",
      "default": false,
      "label": "Auto-approve requests",
      "description": "Automatically approve all incoming requests"
    },
    "max_requests_per_day": {
      "type": "integer",
      "default": 10,
      "min": 1,
      "max": 100,
      "label": "Max daily requests"
    },
    "tmdb_language": {
      "type": "string",
      "default": "en-US",
      "label": "TMDB language code"
    }
  }
}
```

```python
# Read config
auto_approve = self.config.get("auto_approve")           # Returns False (default)
lang = self.config.get("tmdb_language", "en-US")          # With explicit fallback

# Write config
self.config.set("auto_approve", True)

# Get all config as dict
all_config = self.config.get_all()
# {"auto_approve": True, "max_requests_per_day": 10, "tmdb_language": "en-US"}
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `get(key, default)` | `key: str`, `default: Any = None` | `Any` | Get config value, fallback to schema default then `default` |
| `set(key, value)` | `key: str`, `value: Any` | `None` | Update a config value. Validates against schema. |
| `get_all()` | — | `dict[str, Any]` | All config key-value pairs with defaults applied |

### Config Schema Field Types

| Type | Python Type | Extra Validators |
|------|------------|-----------------|
| `string` | `str` | `min_length`, `max_length`, `pattern` (regex) |
| `integer` | `int` | `min`, `max` |
| `float` | `float` | `min`, `max` |
| `boolean` | `bool` | — |
| `select` | `str` | `options: list[{value, label}]` |

---

## 5. Event System

Plugins can subscribe to core platform events using the `@PluginBase.on_event()` decorator. Events are dispatched asynchronously. A plugin's event handlers only fire while the plugin is active.

```python
from acp_plugin_sdk import PluginBase

class MyPlugin(PluginBase):
    plugin_id = "my-plugin"

    @PluginBase.on_event("message.received")
    async def handle_message(self, event_data: dict):
        text = event_data["text"]
        if text and "/request" in text:
            await self.process_request(event_data)

    @PluginBase.on_event("user.created")
    async def handle_new_user(self, event_data: dict):
        self.logger.info(f"New user: {event_data['tg_uid']}")
```

### Available Events

#### Message Events

| Event | Trigger | event_data Schema |
|-------|---------|-------------------|
| `message.received` | Incoming message from Telegram user | `MessageEventData` |
| `message.sent` | Outgoing message sent by admin | `MessageEventData` |
| `message.edited` | Message edited by user or admin | `MessageEditedEventData` |
| `message.deleted` | Message deleted | `MessageDeletedEventData` |

**`MessageEventData`**
```python
{
    "message_id": 5000,                 # int — Internal message ID
    "tg_message_id": 42,               # int — Telegram message ID
    "conversation_id": 100,             # int — Conversation ID
    "bot_id": 1,                        # int — Bot ID that received it
    "tg_user_id": 123456789,            # int — Telegram user who sent it
    "direction": "incoming",            # str — "incoming" | "outgoing"
    "content_type": "text",             # str — "text" | "photo" | "document" | ...
    "text": "Hello, I need help",       # str | None — Message text
    "media_file_id": None,              # str | None — Telegram file_id
    "timestamp": "2026-03-01T09:15:00Z" # str — ISO 8601
}
```

**`MessageEditedEventData`**
```python
{
    "message_id": 5000,
    "tg_message_id": 42,
    "conversation_id": 100,
    "old_text": "Hello",                # str | None — Previous text
    "new_text": "Hello, I need help",   # str | None — Updated text
    "timestamp": "2026-03-01T09:16:00Z"
}
```

**`MessageDeletedEventData`**
```python
{
    "message_id": 5000,
    "tg_message_id": 42,
    "conversation_id": 100,
    "timestamp": "2026-03-01T09:17:00Z"
}
```

#### Conversation Events

| Event | Trigger | event_data Schema |
|-------|---------|-------------------|
| `conversation.opened` | New conversation created | `ConversationEventData` |
| `conversation.closed` | Conversation marked closed | `ConversationEventData` |
| `conversation.assigned` | Admin assigned to conversation | `ConversationAssignedEventData` |
| `conversation.unassigned` | Admin unassigned from conversation | `ConversationAssignedEventData` |

**`ConversationEventData`**
```python
{
    "conversation_id": 100,
    "bot_id": 1,
    "tg_user_id": 123456789,
    "status": "open",                   # str — New status
    "timestamp": "2026-03-01T09:15:00Z"
}
```

**`ConversationAssignedEventData`**
```python
{
    "conversation_id": 100,
    "bot_id": 1,
    "tg_user_id": 123456789,
    "admin_id": 5,                      # int | None — Assigned admin (None if unassigned)
    "previous_admin_id": None,          # int | None — Previously assigned admin
    "timestamp": "2026-03-01T09:15:00Z"
}
```

#### User Events

| Event | Trigger | event_data Schema |
|-------|---------|-------------------|
| `user.created` | New Telegram user first contacts a bot | `UserEventData` |
| `user.blocked` | User is blocked by admin | `UserEventData` |
| `user.unblocked` | User is unblocked | `UserEventData` |

**`UserEventData`**
```python
{
    "user_id": 42,                      # int — Internal user ID
    "tg_uid": 123456789,                # int — Telegram user ID
    "username": "john_doe",             # str | None
    "first_name": "John",              # str
    "last_name": "Doe",                # str | None
    "timestamp": "2026-03-01T09:15:00Z"
}
```

#### Bot Events

| Event | Trigger | event_data Schema |
|-------|---------|-------------------|
| `bot.started` | Bot begins polling/webhook | `BotEventData` |
| `bot.stopped` | Bot stops | `BotEventData` |
| `bot.error` | Bot encounters a fatal error | `BotErrorEventData` |

**`BotEventData`**
```python
{
    "bot_id": 1,
    "bot_username": "my_service_bot",
    "status": "running",                # str — New status
    "timestamp": "2026-03-01T09:15:00Z"
}
```

**`BotErrorEventData`**
```python
{
    "bot_id": 1,
    "bot_username": "my_service_bot",
    "error_type": "TelegramAPIError",   # str — Exception class name
    "error_message": "Unauthorized",    # str — Error description
    "timestamp": "2026-03-01T09:15:00Z"
}
```

#### Plugin Lifecycle Events

| Event | Trigger | event_data Schema |
|-------|---------|-------------------|
| `plugin.activated` | Any plugin is activated | `PluginLifecycleEventData` |
| `plugin.deactivated` | Any plugin is deactivated | `PluginLifecycleEventData` |

**`PluginLifecycleEventData`**
```python
{
    "plugin_id": "other-plugin",        # str — The plugin that changed state
    "version": "2.0.0",                # str — Plugin version
    "timestamp": "2026-03-01T09:15:00Z"
}
```

### Event Handler Rules

1. Event handlers must be `async` methods on the `PluginBase` subclass.
2. Handlers must not block for more than 30 seconds. Use background tasks for long operations.
3. Exceptions in event handlers are caught and logged; they do not propagate to the core platform.
4. Event handlers execute concurrently across plugins; order is not guaranteed.
5. A plugin cannot emit core events — only subscribe to them.

---

## 6. Database Helpers

Plugins can define their own SQLAlchemy models and manage migrations via Alembic. All plugin tables are automatically prefixed with `plg_{plugin_id}_` to prevent collisions.

### 6.1 Defining Models

```python
from acp_plugin_sdk import PluginModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

class MovieRequest(PluginModel):
    """
    Table name will be: plg_movie_request_movie_requests
    (auto-prefixed by PluginModel)
    """
    __tablename__ = "movie_requests"    # Logical name; prefix applied automatically

    id = Column(Integer, primary_key=True, autoincrement=True)
    tg_user_id = Column(Integer, nullable=False, index=True)
    tmdb_id = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    year = Column(Integer, nullable=True)
    status = Column(String(20), default="pending")  # pending | approved | rejected
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 6.2 Using Database Sessions

```python
async def some_method(self):
    async with self.db.get_session() as session:
        # Insert
        request = MovieRequest(tg_user_id=123, tmdb_id=550, title="Fight Club", year=1999)
        session.add(request)
        await session.commit()
        await session.refresh(request)

        # Query
        from sqlalchemy import select
        stmt = select(MovieRequest).where(MovieRequest.tg_user_id == 123)
        result = await session.execute(stmt)
        requests = result.scalars().all()

        # Update
        request.status = "approved"
        await session.commit()

        # Delete
        await session.delete(request)
        await session.commit()
```

### 6.3 Migrations

Plugins use Alembic for schema migrations. The SDK provides helpers:

```python
# In setup(), run all pending migrations
await self.db.run_migrations()

# Rollback the most recent migration
await self.db.rollback_migration()

# Rollback to a specific revision
await self.db.rollback_migration(target="abc123")
```

#### Migration Directory Structure

```
my-plugin/
  migrations/
    env.py            # Auto-generated, do not edit
    versions/
      001_initial.py
      002_add_index.py
```

#### Creating Migrations

```bash
# Via the ACP Plugin CLI
acp-plugin db revision --message "add ratings table"
acp-plugin db upgrade     # Apply pending migrations
acp-plugin db downgrade   # Rollback one step
```

### 6.4 Constraints

- All table names are prefixed: `plg_{plugin_id}_{tablename}`
- Plugins MUST NOT create foreign keys to core tables. Use `tg_user_id` (integer) and resolve via SDK.
- Max 20 tables per plugin.
- Plugin models must subclass `PluginModel`, not SQLAlchemy's `DeclarativeBase`.

---

## 7. Bot Handler Registration

Plugins can register aiogram 3 handlers for Telegram bot events. Use `PluginRouter` to create a router that is automatically scoped and injected with the SDK.

```python
from acp_plugin_sdk import PluginRouter
from aiogram import F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

router = PluginRouter()

@router.message(Command("request"))
async def cmd_request(message: Message, bot_db_id: int, plugin_sdk: "CoreSDKBridge"):
    """
    Handles /request command from users.

    Injected parameters:
    - bot_db_id: Internal DB ID of the bot that received this message
    - plugin_sdk: The SDK bridge instance for this plugin
    """
    user = await plugin_sdk.users.get_by_tg_uid(message.from_user.id)
    await message.reply(f"Hello {user['first_name']}! What movie would you like?")

@router.message(F.text & ~F.text.startswith("/"))
async def handle_text(message: Message, bot_db_id: int, plugin_sdk: "CoreSDKBridge"):
    """Handle plain text messages (non-commands)."""
    # Process the message
    pass

@router.callback_query(F.data.startswith("approve:"))
async def approve_callback(callback: CallbackQuery, bot_db_id: int, plugin_sdk: "CoreSDKBridge"):
    """Handle inline button callbacks."""
    request_id = int(callback.data.split(":")[1])
    await callback.answer("Approved!")
```

### Injected Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `bot_db_id` | `int` | Internal database ID of the bot that received the update |
| `plugin_sdk` | `CoreSDKBridge` | The SDK bridge — same as `self.sdk` on PluginBase |

### Handler Scoping

- Plugin handlers run **after** core handlers. If a core handler consumes an update, the plugin handler will not fire.
- Plugins should use specific filters (commands, prefixes, callback data patterns) to avoid conflicts.
- Avoid registering catch-all handlers (`@router.message()` with no filter) as they may interfere with core functionality.

### Registering the Router

```python
class MyPlugin(PluginBase):
    plugin_id = "my-plugin"

    async def setup(self, app, dp):
        from .bot import router as bot_router
        dp.include_router(bot_router)
```

---

## 8. FastAPI Router

Plugins can expose REST API endpoints using `PluginAPIRouter`. All routes are automatically namespaced under `/api/v1/p/{plugin_id}/`.

```python
from acp_plugin_sdk import PluginAPIRouter
from pydantic import BaseModel
from typing import Optional

router = PluginAPIRouter()

# This becomes: GET /api/v1/p/movie-request/stats
@router.get("/stats")
async def get_stats(db: "AsyncSession", current_user: "AdminUser"):
    """
    Injected parameters:
    - db: Async SQLAlchemy session scoped to plugin's tables
    - current_user: The authenticated admin user making the request
    """
    from sqlalchemy import select, func
    from .models import MovieRequest

    stmt = select(func.count()).select_from(MovieRequest)
    result = await db.execute(stmt)
    total = result.scalar()

    return {"total_requests": total}

# POST /api/v1/p/movie-request/requests
class CreateRequestBody(BaseModel):
    tmdb_id: int
    title: str
    year: Optional[int] = None

@router.post("/requests", status_code=201)
async def create_request(body: CreateRequestBody, db: "AsyncSession", current_user: "AdminUser"):
    from .models import MovieRequest

    req = MovieRequest(
        tg_user_id=0,  # Set appropriately
        tmdb_id=body.tmdb_id,
        title=body.title,
        year=body.year,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return {"id": req.id, "title": req.title, "status": req.status}

# GET /api/v1/p/movie-request/requests
@router.get("/requests")
async def list_requests(
    db: "AsyncSession",
    current_user: "AdminUser",
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
):
    from sqlalchemy import select
    from .models import MovieRequest

    stmt = select(MovieRequest).order_by(MovieRequest.created_at.desc())
    if status:
        stmt = stmt.where(MovieRequest.status == status)
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(stmt)
    requests = result.scalars().all()
    return [{"id": r.id, "title": r.title, "status": r.status} for r in requests]

# PATCH /api/v1/p/movie-request/requests/42
@router.patch("/requests/{request_id}")
async def update_request(request_id: int, body: dict, db: "AsyncSession", current_user: "AdminUser"):
    from sqlalchemy import select
    from .models import MovieRequest

    stmt = select(MovieRequest).where(MovieRequest.id == request_id)
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    if not req:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Request not found")

    for key, value in body.items():
        if hasattr(req, key):
            setattr(req, key, value)
    await db.commit()
    return {"id": req.id, "status": req.status}
```

### Injected Dependencies

| Parameter | Type | Description |
|-----------|------|-------------|
| `db` | `AsyncSession` | SQLAlchemy async session, auto-committed/rolled-back |
| `current_user` | `AdminUser` | Authenticated admin (JWT validated by core) |

### AdminUser Type

```python
{
    "id": 5,                    # int — Admin user ID
    "username": "admin1",       # str — Admin username
    "role": "admin",            # str — "superadmin" | "admin" | "agent"
    "is_active": True           # bool
}
```

### Authentication

All plugin API routes are protected by the core JWT authentication middleware. Plugins do not need to implement their own auth. The `current_user` dependency is injected automatically.

### Rate Limiting

Plugin API routes are subject to the Panel's global rate limiter. Default: 60 requests/minute per admin user. Plugins cannot override this.

### Registering the Router

```python
class MyPlugin(PluginBase):
    plugin_id = "my-plugin"

    async def setup(self, app, dp):
        from .api import router as api_router
        app.include_router(api_router)
```

---

## 9. Logging

Each plugin gets a pre-configured `logging.Logger` instance with the plugin ID as a prefix.

```python
class MyPlugin(PluginBase):
    plugin_id = "my-plugin"

    async def setup(self, app, dp):
        self.logger.info("Plugin activated")
        self.logger.warning("Configuration missing, using defaults")
        self.logger.error("Failed to connect to external API", exc_info=True)
```

### Log Format

```
2026-03-24 10:30:00 [INFO] plugin:my-plugin — Plugin activated
2026-03-24 10:30:01 [WARNING] plugin:my-plugin — Configuration missing, using defaults
```

### Log Levels

Standard Python logging levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.

The default log level is controlled by the Panel's `LOG_LEVEL` environment variable.

### Log Storage

Plugin logs are written to the Panel's unified log stream and can be viewed in the admin Panel under **Plugins > [Plugin Name] > Logs**.

---

## 10. Type Definitions

The SDK exports the following types for type checking and IDE support.

### TypedDicts

```python
from acp_plugin_sdk.types import (
    UserDict,
    BotDict,
    ConversationDict,
    MessageDict,
    AdminUser,
    MessageEventData,
    MessageEditedEventData,
    MessageDeletedEventData,
    ConversationEventData,
    ConversationAssignedEventData,
    UserEventData,
    BotEventData,
    BotErrorEventData,
    PluginLifecycleEventData,
    ConfigFieldSchema,
)
```

### UserDict

```python
class UserDict(TypedDict):
    id: int
    tg_uid: int
    username: str | None
    first_name: str
    last_name: str | None
    is_blocked: bool
    is_premium: bool
    created_at: str  # ISO 8601
```

### BotDict

```python
class BotDict(TypedDict):
    id: int
    bot_username: str
    display_name: str
    status: str  # "running" | "stopped" | "error"
    created_at: str
```

### ConversationDict

```python
class ConversationDict(TypedDict):
    id: int
    bot_id: int
    tg_user_id: int
    status: str  # "open" | "closed" | "archived"
    assigned_admin_id: int | None
    created_at: str
    updated_at: str
```

### MessageDict

```python
class MessageDict(TypedDict):
    id: int
    conversation_id: int
    tg_message_id: int
    direction: str  # "incoming" | "outgoing"
    content_type: str  # "text" | "photo" | "document" | "sticker" | ...
    text: str | None
    media_file_id: str | None
    sender_admin_id: int | None
    created_at: str
```

### AdminUser

```python
class AdminUser(TypedDict):
    id: int
    username: str
    role: str  # "superadmin" | "admin" | "agent"
    is_active: bool
```

### ConfigFieldSchema

```python
class ConfigFieldSchema(TypedDict):
    type: str           # "string" | "integer" | "float" | "boolean" | "select"
    default: Any
    label: str
    description: str | None
    min: int | float | None
    max: int | float | None
    min_length: int | None
    max_length: int | None
    pattern: str | None
    options: list[dict] | None  # For "select" type: [{"value": "...", "label": "..."}]
```

---

## 11. Error Handling

The SDK defines a hierarchy of exceptions plugins can catch or raise.

```python
from acp_plugin_sdk.exceptions import (
    ACPPluginError,          # Base exception for all SDK errors
    PermissionDeniedError,   # Plugin lacks required scope
    ResourceNotFoundError,   # Requested resource does not exist
    ConfigValidationError,   # Config value fails schema validation
    SecretStorageError,      # Secret store read/write failure
    DatabaseMigrationError,  # Migration failed
    RateLimitExceededError,  # SDK rate limit hit
)
```

### Exception Details

| Exception | When Raised | HTTP Code (if in API route) |
|-----------|------------|----------------------------|
| `PermissionDeniedError` | Calling SDK API without required scope | 403 |
| `ResourceNotFoundError` | Core resource not found (user, bot, etc.) | 404 |
| `ConfigValidationError` | `config.set()` with invalid value | 400 |
| `SecretStorageError` | Encryption/decryption failure, storage full | 500 |
| `DatabaseMigrationError` | Alembic migration fails | 500 |
| `RateLimitExceededError` | Too many SDK API calls (100/sec per plugin) | 429 |

### SDK Rate Limits

| Resource | Limit |
|----------|-------|
| Core SDK API calls (`self.sdk.*`) | 100 calls/second per plugin |
| Secret store operations | 10 calls/second per plugin |
| Config operations | 20 calls/second per plugin |
| Database sessions | 10 concurrent sessions per plugin |

---

## 12. Lifecycle & Execution Order

Understanding the plugin lifecycle is critical for correct initialization and cleanup.

### Activation Sequence

```
1. Panel admin clicks "Activate" in Plugin Management UI
2. Core validates manifest.json
3. Core checks required scopes against admin permissions
4. PluginBase.__init__() is called
   - self.sdk, self.secrets, self.config, self.db, self.logger initialized
5. plugin.setup(app, dp) is called
   - Plugin registers API routers and bot handlers
   - Plugin runs database migrations
6. Event handlers are registered
7. Plugin status set to "active"
8. plugin.activated event emitted
```

### Deactivation Sequence

```
1. Panel admin clicks "Deactivate" (or Panel shuts down)
2. plugin.teardown() is called
   - Plugin cancels background tasks, closes connections
3. API routers are removed from FastAPI
4. Bot handlers are removed from Dispatcher
5. Event handlers are unregistered
6. Plugin status set to "inactive"
7. plugin.deactivated event emitted
8. Database tables are NOT dropped (persist until uninstall)
```

### Error Recovery

If `setup()` raises an exception:
- The plugin is marked as "error" status
- No routes or handlers are registered
- The error is logged and visible in the admin UI
- Admin can retry activation after fixing the issue

If an event handler raises an exception:
- The exception is caught and logged
- Other plugins' handlers continue executing
- The plugin remains active
