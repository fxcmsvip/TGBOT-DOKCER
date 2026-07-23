import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function BackendApi() {
  return (
    <div>
      <Heading level={1} id="backend-sdk">Python Backend SDK Reference</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP Backend SDK provides a Python framework for building server-side plugin logic
        that runs inside the ADMINCHAT Panel process. Plugins subclass{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">PluginBase</span>{' '}
        and gain access to the core platform through a rich set of bridges, helpers, and
        decorators. The SDK is designed for Python 3.11+ and integrates natively with
        FastAPI and aiogram 3.
      </p>

      {/* ── PluginBase Class ─────────────────────────────────── */}
      <Heading level={2} id="plugin-base">PluginBase Class</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every backend plugin must define a class that inherits from{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">PluginBase</span>.
        The class must set <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">plugin_id</span> and{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">version</span> as
        class-level attributes, and implement the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">setup()</span> lifecycle
        method.
      </p>
      <CodeBlock language="python" title="Minimal plugin skeleton">
{`from acp_sdk import PluginBase

class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    async def setup(self, app, dp):
        """Called once when the Panel loads the plugin.

        Args:
            app: The FastAPI application instance.
            dp:  The aiogram Dispatcher instance.
        """
        self.logger.info("Plugin loaded successfully")

    async def teardown(self):
        """Called when the plugin is unloaded or the Panel shuts down.
        Use this to close connections, flush buffers, etc.
        """
        self.logger.info("Plugin unloaded")`}
      </CodeBlock>

      <Callout type="info" title="Class-level attributes">
        <span className="font-mono text-xs">plugin_id</span> must match the{' '}
        <span className="font-mono text-xs">id</span> field in your manifest.json exactly.
        The <span className="font-mono text-xs">version</span> attribute is used for runtime
        compatibility checks and should stay in sync with the manifest.
      </Callout>

      <Heading level={3} id="lifecycle">Lifecycle Methods</Heading>
      <PropsTable
        columns={['Method', 'Signature', 'Description']}
        rows={[
          ['setup', 'async def setup(self, app, dp)', 'Required. Called once when the plugin is loaded. Receives the FastAPI app and the aiogram Dispatcher. Use it to register routes, handlers, and initialize resources.'],
          ['teardown', 'async def teardown(self)', 'Optional. Called when the plugin is being unloaded or the Panel process is shutting down. Clean up connections, flush caches, cancel background tasks.'],
        ]}
      />

      {/* ── PluginBase Attributes ────────────────────────────── */}
      <Heading level={2} id="attributes">PluginBase Attributes</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        After instantiation, every plugin instance has access to the following attributes.
        These are injected by the runtime before <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">setup()</span> is
        called, so they are safe to use from the first line of your setup method.
      </p>
      <PropsTable
        columns={['Attribute', 'Type', 'Description']}
        rows={[
          ['self.sdk', 'CoreSDKBridge', 'Bridge to core ADMINCHAT Panel APIs — users, groups, messages, panel settings, payments, and notifications.'],
          ['self.secrets', 'SecretStore', 'Encrypted key-value store for sensitive data such as API tokens, webhook secrets, and third-party credentials.'],
          ['self.config', 'PluginConfigClient', 'Typed configuration store for user-facing plugin settings. Values are persisted across restarts.'],
          ['self.db', 'DatabaseHelper', 'Provides a scoped SQLAlchemy async session and migration utilities. Tables are auto-prefixed with plg_{plugin_id}_.'],
          ['self.logger', 'logging.Logger', 'Pre-configured logger namespaced to the plugin ID. Outputs to the Panel log stream with structured context.'],
        ]}
      />

      {/* ── Core SDK Bridge ──────────────────────────────────── */}
      <Heading level={2} id="core-sdk">Core SDK Bridge (self.sdk)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">self.sdk</span> attribute
        exposes the full ADMINCHAT Panel core API as async Python methods. All calls go through
        the internal RPC bus, so they are fast and do not require HTTP overhead.
      </p>

      <Heading level={3} id="sdk-users">Users</Heading>
      <CodeBlock language="python" title="User operations">
{`# Get a user by Telegram ID
user = await self.sdk.users.get(telegram_id=123456789)

# Search users with filters
results = await self.sdk.users.search(
    query="john",
    role="admin",
    limit=20,
    offset=0,
)

# Update user metadata
await self.sdk.users.update(
    telegram_id=123456789,
    metadata={"vip_level": 3, "notes": "Premium customer"},
)

# List all administrators
admins = await self.sdk.users.list_admins()`}
      </CodeBlock>

      <Heading level={3} id="sdk-groups">Groups</Heading>
      <CodeBlock language="python" title="Group operations">
{`# List all managed groups
groups = await self.sdk.groups.list()

# Get group details
group = await self.sdk.groups.get(group_id=-1001234567890)

# Get group member count
count = await self.sdk.groups.member_count(group_id=-1001234567890)

# Update group settings
await self.sdk.groups.update(
    group_id=-1001234567890,
    settings={"welcome_enabled": True},
)`}
      </CodeBlock>

      <Heading level={3} id="sdk-messages">Messages</Heading>
      <CodeBlock language="python" title="Message operations">
{`# Send a text message
await self.sdk.messages.send(
    chat_id=123456789,
    text="Hello from the plugin!",
    parse_mode="HTML",
)

# Send a message with inline keyboard
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="Open", callback_data="open_item")],
])

await self.sdk.messages.send(
    chat_id=123456789,
    text="Choose an action:",
    reply_markup=keyboard,
)

# Edit an existing message
await self.sdk.messages.edit(
    chat_id=123456789,
    message_id=42,
    text="Updated content",
)

# Delete a message
await self.sdk.messages.delete(chat_id=123456789, message_id=42)`}
      </CodeBlock>

      <Heading level={3} id="sdk-panel">Panel</Heading>
      <CodeBlock language="python" title="Panel operations">
{`# Get Panel instance information
info = await self.sdk.panel.get_info()
# Returns: { version, instance_id, hostname, uptime, ... }

# Get Panel configuration value
value = await self.sdk.panel.get_config("telegram.bot_token_masked")

# Check feature flag
enabled = await self.sdk.panel.is_feature_enabled("payments")`}
      </CodeBlock>

      <Heading level={3} id="sdk-payments">Payments</Heading>
      <CodeBlock language="python" title="Payment operations">
{`# Create an invoice
invoice = await self.sdk.payments.create_invoice(
    user_id=123456789,
    amount=9.99,
    currency="USD",
    description="Premium subscription - 1 month",
    metadata={"plan": "premium", "period": "monthly"},
)

# Check payment status
status = await self.sdk.payments.get_status(invoice_id=invoice.id)

# List user transactions
transactions = await self.sdk.payments.list_transactions(
    user_id=123456789,
    limit=50,
)

# Issue a refund
await self.sdk.payments.refund(invoice_id=invoice.id, reason="Customer request")`}
      </CodeBlock>

      <Heading level={3} id="sdk-notifications">Notifications</Heading>
      <CodeBlock language="python" title="Notification operations">
{`# Send an admin notification
await self.sdk.notifications.send_admin(
    title="New order received",
    body="Order #1234 — $49.99 from user @johndoe",
    level="info",  # "info" | "warning" | "error"
)

# Send a user notification (in-panel)
await self.sdk.notifications.send_user(
    user_id=123456789,
    title="Your order is ready",
    body="Download your files from the dashboard.",
    action_url="/p/my-plugin/orders/1234",
)

# Broadcast to all admins
await self.sdk.notifications.broadcast_admins(
    title="System alert",
    body="Plugin detected unusual activity.",
    level="warning",
)`}
      </CodeBlock>

      {/* ── Secret Store ─────────────────────────────────────── */}
      <Heading level={2} id="secrets">Secret Store (self.secrets)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The secret store provides encrypted, per-plugin key-value storage for sensitive
        credentials. Values are encrypted at rest using AES-256-GCM and are never exposed
        in logs, config exports, or API responses.
      </p>
      <CodeBlock language="python" title="Secret store usage">
{`# Store a secret
await self.secrets.set("stripe_api_key", "sk_live_abc123...")

# Retrieve a secret
api_key = await self.secrets.get("stripe_api_key")
# Returns None if the key does not exist

# Delete a secret
await self.secrets.delete("stripe_api_key")

# List all stored key names (values are NOT returned)
keys = await self.secrets.list_keys()
# Returns: ["stripe_api_key", "webhook_secret"]`}
      </CodeBlock>
      <PropsTable
        columns={['Method', 'Signature', 'Returns', 'Description']}
        rows={[
          ['get', 'async get(key: str)', 'str | None', 'Retrieve a decrypted secret value by key. Returns None if the key does not exist.'],
          ['set', 'async set(key: str, value: str)', 'None', 'Store or update an encrypted secret. Maximum value size is 16 KB.'],
          ['delete', 'async delete(key: str)', 'None', 'Remove a secret by key. No-op if the key does not exist.'],
          ['list_keys', 'async list_keys()', 'list[str]', 'Return all stored key names without their values.'],
        ]}
      />

      <Callout type="warning" title="Secret size limits">
        Each secret value is limited to 16 KB. A plugin can store up to 64 secrets. If you
        need to store larger payloads, consider using the database or an external vault service.
      </Callout>

      {/* ── Plugin Config ────────────────────────────────────── */}
      <Heading level={2} id="config">Plugin Config (self.config)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The config client manages user-facing plugin settings. Unlike secrets, config values
        are visible in the admin settings UI and can be edited by panel administrators. Config
        keys and default values are defined in{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">manifest.json</span> under
        the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">settings</span> field.
      </p>
      <CodeBlock language="python" title="Plugin config usage">
{`# Get a single config value (returns the default if not explicitly set)
welcome_msg = await self.config.get("welcome_message")

# Get all config as a dictionary
all_config = await self.config.get_all()
# Returns: {"welcome_message": "Hello!", "max_retries": 3, ...}

# Set a config value programmatically
await self.config.set("welcome_message", "Welcome aboard!")

# Reset a value back to its manifest-defined default
await self.config.reset("welcome_message")`}
      </CodeBlock>
      <PropsTable
        columns={['Method', 'Signature', 'Returns', 'Description']}
        rows={[
          ['get', 'async get(key: str)', 'Any', 'Get a config value. Returns the manifest default if the key has not been explicitly set.'],
          ['get_all', 'async get_all()', 'dict[str, Any]', 'Return the full config dictionary with current values merged over defaults.'],
          ['set', 'async set(key: str, value: Any)', 'None', 'Set a config value. The value must match the type declared in the manifest.'],
          ['reset', 'async reset(key: str)', 'None', 'Reset a config key to its manifest-defined default value.'],
        ]}
      />

      {/* ── Event System ─────────────────────────────────────── */}
      <Heading level={2} id="events">Event System</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The event system allows plugins to react to platform-wide lifecycle events. Use the{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">@on_event</span> decorator
        to register async handlers that are invoked when specific events occur.
      </p>
      <CodeBlock language="python" title="Event handler registration">
{`from acp_sdk import PluginBase, on_event

class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    @on_event("user.joined")
    async def handle_user_joined(self, event):
        """Fires when a new user joins any managed group."""
        self.logger.info(f"New user: {event.user_id} in {event.group_id}")
        await self.sdk.messages.send(
            chat_id=event.group_id,
            text=f"Welcome, {event.user_name}!",
        )

    @on_event("user.left")
    async def handle_user_left(self, event):
        self.logger.info(f"User left: {event.user_id}")

    @on_event("payment.completed")
    async def handle_payment(self, event):
        self.logger.info(f"Payment {event.invoice_id}: {event.amount}")

    async def setup(self, app, dp):
        pass`}
      </CodeBlock>

      <Heading level={3} id="available-events">Available Events</Heading>
      <PropsTable
        columns={['Event Name', 'Payload Fields', 'Description']}
        rows={[
          ['user.joined', 'user_id, user_name, group_id', 'A new user joined a managed group.'],
          ['user.left', 'user_id, group_id', 'A user left or was removed from a managed group.'],
          ['user.banned', 'user_id, group_id, banned_by, reason', 'A user was banned from a managed group.'],
          ['user.updated', 'user_id, changes', 'User profile or metadata was updated.'],
          ['group.created', 'group_id, group_name, created_by', 'A new group was added to the Panel.'],
          ['group.settings_changed', 'group_id, changes', 'Group settings were modified.'],
          ['payment.completed', 'invoice_id, user_id, amount, currency', 'A payment was successfully processed.'],
          ['payment.refunded', 'invoice_id, user_id, amount, reason', 'A payment was refunded.'],
          ['plugin.installed', 'plugin_id, version, installed_by', 'A plugin was installed on the Panel.'],
          ['plugin.uninstalled', 'plugin_id, uninstalled_by', 'A plugin was removed from the Panel.'],
          ['plugin.config_changed', 'plugin_id, key, old_value, new_value', 'A plugin config value was changed by an admin.'],
          ['panel.startup', 'version, timestamp', 'The Panel process has started.'],
          ['panel.shutdown', 'reason, timestamp', 'The Panel process is shutting down gracefully.'],
        ]}
      />

      {/* ── Database Helpers ──────────────────────────────────── */}
      <Heading level={2} id="database">Database Helpers (self.db)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Each plugin gets a scoped database helper backed by SQLAlchemy 2.0 async. All tables
        created by a plugin are automatically prefixed with{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">plg_{'{plugin_id}'}_</span>{' '}
        to prevent naming collisions.
      </p>
      <CodeBlock language="python" title="Defining models and using sessions">
{`from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from acp_sdk.db import PluginModel

class Order(PluginModel):
    """Auto-creates table: plg_my_plugin_orders"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    product = Column(String(200), nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, server_default=func.now())


class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    async def setup(self, app, dp):
        # Run migrations to create / update tables
        await self.db.run_migrations()

    async def create_order(self, user_id: int, product: str):
        async with self.db.session() as session:
            order = Order(user_id=user_id, product=product)
            session.add(order)
            await session.commit()
            await session.refresh(order)
            return order

    async def get_user_orders(self, user_id: int):
        async with self.db.session() as session:
            from sqlalchemy import select
            stmt = select(Order).where(
                Order.user_id == user_id
            ).order_by(Order.created_at.desc())
            result = await session.execute(stmt)
            return result.scalars().all()`}
      </CodeBlock>

      <PropsTable
        columns={['Method', 'Signature', 'Description']}
        rows={[
          ['session', 'db.session() -> AsyncContextManager[AsyncSession]', 'Returns a scoped async session context manager. The session auto-commits on exit or rolls back on exception.'],
          ['run_migrations', 'async db.run_migrations()', 'Runs Alembic auto-migrations for all PluginModel subclasses registered by this plugin. Safe to call on every startup.'],
        ]}
      />

      <Callout type="info" title="Table naming">
        Always use <span className="font-mono text-xs">PluginModel</span> as the base class for
        your models. It automatically applies the{' '}
        <span className="font-mono text-xs">plg_{'{plugin_id}'}_</span> prefix to the
        table name you declare in <span className="font-mono text-xs">__tablename__</span>.
      </Callout>

      {/* ── Bot Handler Registration ─────────────────────────── */}
      <Heading level={2} id="bot-handlers">Bot Handler Registration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins register Telegram bot handlers through the aiogram 3{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Dispatcher</span>{' '}
        instance passed to <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">setup()</span>.
        Create a <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Router</span>{' '}
        and include it in the dispatcher.
      </p>
      <CodeBlock language="python" title="Registering bot handlers">
{`from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

router = Router(name="my-plugin")

@router.message(Command("stats"))
async def cmd_stats(message: Message):
    """Handle /stats command."""
    await message.answer("Here are your stats...")

@router.message(F.text.startswith("!help"))
async def text_help(message: Message):
    """Handle messages starting with !help."""
    await message.answer("How can I help you?")

@router.callback_query(F.data.startswith("order:"))
async def on_order_callback(callback: CallbackQuery):
    """Handle order-related inline button callbacks."""
    order_id = callback.data.split(":")[1]
    await callback.answer(f"Processing order {order_id}...")


class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    async def setup(self, app, dp):
        dp.include_router(router)
        self.logger.info("Bot handlers registered")`}
      </CodeBlock>

      <Callout type="warning" title="Handler isolation">
        Each plugin should create its own <span className="font-mono text-xs">Router</span> instance.
        Do not modify the dispatcher directly or register global middleware. The Panel runtime
        may reject plugins that attempt to override core handlers.
      </Callout>

      {/* ── FastAPI Router ────────────────────────────────────── */}
      <Heading level={2} id="fastapi-router">FastAPI Router</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins can expose custom HTTP endpoints by registering a FastAPI{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">APIRouter</span>.
        All plugin routes are mounted under the prefix{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">/api/v1/p/{'{plugin_id}'}/ </span>
        automatically.
      </p>
      <CodeBlock language="python" title="Defining API routes">
{`from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

api_router = APIRouter()

class CreateOrderRequest(BaseModel):
    product: str
    quantity: int = 1

class OrderResponse(BaseModel):
    id: int
    product: str
    status: str

@api_router.get("/orders")
async def list_orders(user_id: int):
    """GET /api/v1/p/my-plugin/orders?user_id=123"""
    ...

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(body: CreateOrderRequest):
    """POST /api/v1/p/my-plugin/orders"""
    ...

@api_router.get("/orders/{order_id}")
async def get_order(order_id: int):
    """GET /api/v1/p/my-plugin/orders/42"""
    ...

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: int):
    """DELETE /api/v1/p/my-plugin/orders/42"""
    ...


class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    async def setup(self, app, dp):
        app.include_router(
            api_router,
            prefix=f"/api/v1/p/{self.plugin_id}",
            tags=[self.plugin_id],
        )`}
      </CodeBlock>

      <Callout type="info" title="Authentication">
        Plugin API routes automatically inherit the Panel's authentication middleware. The
        current user is available via FastAPI dependency injection. Use{' '}
        <span className="font-mono text-xs">Depends(get_current_user)</span> from{' '}
        <span className="font-mono text-xs">acp_sdk.auth</span> to access the authenticated user.
      </Callout>

      {/* ── Logging ───────────────────────────────────────────── */}
      <Heading level={2} id="logging">Logging</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every plugin receives a pre-configured <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">self.logger</span>{' '}
        instance that is namespaced to the plugin ID. Log output is routed to the Panel's
        centralized logging system with structured context including the plugin ID, version,
        and request correlation ID.
      </p>
      <CodeBlock language="python" title="Logging examples">
{`class MyPlugin(PluginBase):
    plugin_id = "my-plugin"
    version = "1.0.0"

    async def setup(self, app, dp):
        self.logger.info("Plugin setup started")
        self.logger.debug("Registering %d handlers", 5)

    async def process_order(self, order_id: int):
        self.logger.info("Processing order", extra={
            "order_id": order_id,
            "action": "process",
        })
        try:
            # ... processing logic ...
            self.logger.info("Order processed successfully",
                           extra={"order_id": order_id})
        except Exception as e:
            self.logger.error("Order processing failed",
                            extra={"order_id": order_id},
                            exc_info=True)`}
      </CodeBlock>

      <PropsTable
        columns={['Level', 'Method', 'Use For']}
        rows={[
          ['DEBUG', 'self.logger.debug()', 'Verbose diagnostic information. Only visible when Panel log level is set to DEBUG.'],
          ['INFO', 'self.logger.info()', 'General operational messages — startup, key actions, request summaries.'],
          ['WARNING', 'self.logger.warning()', 'Recoverable issues — deprecated usage, retries, fallback behavior.'],
          ['ERROR', 'self.logger.error()', 'Failures that affect functionality — failed API calls, data corruption, unhandled states.'],
          ['CRITICAL', 'self.logger.critical()', 'Severe errors that may cause the plugin to stop functioning entirely.'],
        ]}
      />

      {/* ── Error Handling ────────────────────────────────────── */}
      <Heading level={2} id="errors">Error Handling</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK provides a hierarchy of typed exceptions that integrate with the Panel's
        error reporting and API error response formatting. Always raise SDK exceptions
        rather than generic Python exceptions so the Panel can produce consistent error
        responses.
      </p>
      <CodeBlock language="python" title="SDK exception classes">
{`from acp_sdk.errors import (
    PluginError,       # Base class for all plugin errors
    NotFoundError,     # Resource not found (maps to HTTP 404)
    PermissionError,   # Insufficient permissions (maps to HTTP 403)
    ConfigError,       # Invalid or missing configuration
)

# Raise in API handlers for clean error responses
@api_router.get("/orders/{order_id}")
async def get_order(order_id: int):
    order = await find_order(order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    if not has_access(order):
        raise PermissionError("You do not have access to this order")
    return order

# Raise config errors during setup
async def setup(self, app, dp):
    api_key = await self.secrets.get("external_api_key")
    if not api_key:
        raise ConfigError(
            "Missing required secret 'external_api_key'. "
            "Please set it in the plugin settings."
        )`}
      </CodeBlock>

      <PropsTable
        columns={['Exception', 'HTTP Status', 'When to Use']}
        rows={[
          ['PluginError', '500', 'Base class. Use for generic plugin failures that don\'t fit a more specific type.'],
          ['NotFoundError', '404', 'A requested resource (order, user, record) does not exist.'],
          ['PermissionError', '403', 'The current user lacks the required permission to perform the action.'],
          ['ConfigError', '500', 'A required configuration value or secret is missing or invalid. Blocks plugin startup if raised in setup().'],
        ]}
      />

      <Callout type="danger" title="Unhandled exceptions">
        If your plugin raises an unhandled exception during a request, the Panel will catch it,
        log a full traceback, and return a generic 500 response. Repeated unhandled errors may
        trigger automatic plugin suspension. Always wrap risky operations in try/except blocks.
      </Callout>
    </div>
  );
}