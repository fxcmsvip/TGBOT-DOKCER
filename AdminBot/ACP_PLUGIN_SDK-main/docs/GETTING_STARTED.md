# Getting Started with ADMINCHAT Panel Plugins

Build your first ADMINCHAT Panel plugin in about 15 minutes. By the end of this guide you will have a working plugin with a backend API endpoint, a bot command handler, and a frontend page -- all running locally against your Panel instance.

---

## Prerequisites

Before you start, make sure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18+ | `node --version` |
| Python | 3.12+ | `python3 --version` |
| ADMINCHAT Panel instance | 0.8.0+ | Running locally or on a server you control |
| ACP Market account | -- | Register at https://market.adminchat.com (needed only for publishing) |

You should also be comfortable with Python (FastAPI), React (TypeScript), and basic terminal usage.

---

## Step 1: Install the CLI

Install the `@acp/cli` tool globally:

```bash
npm install -g @acp/cli
```

Verify it installed correctly:

```bash
acp --version
```

If you prefer not to install globally, you can use `npx @acp/cli <command>` anywhere in this guide instead of `acp <command>`.

---

## Step 2: Create Your First Plugin

Let's create a simple "Hello World" plugin. Run:

```bash
acp create-plugin hello-world
```

The CLI will ask a few questions. For this tutorial, use these answers:

```
? Plugin name: Hello World
? Description: A simple hello world plugin for learning
? Categories: utility
? Capabilities: [x] bot_handlers  [x] api_routes  [x] frontend_pages  [x] settings_panel
```

Once complete, you'll see:

```
  Plugin created: hello-world
  Directory: ./hello-world

  Next steps:
    cd hello-world
    acp dev
```

Move into the plugin directory:

```bash
cd hello-world
```

Take a look at what was generated:

```
hello-world/
├── manifest.json
├── backend/
│   ├── plugin.py
│   ├── routes.py
│   ├── handlers.py
│   ├── models.py
│   ├── schemas.py
│   ├── services/
│   └── migrations/
│       └── 001_init.py
├── frontend/
│   ├── vite.config.ts
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   └── MainPage.tsx
│   │   ├── settings/
│   │   │   └── SettingsTab.tsx
│   │   └── types.ts
│   └── screenshots/
├── tests/
├── README.md
├── CHANGELOG.md
└── .gitignore
```

Each file has a specific role. We'll walk through the important ones in the next steps.

---

## Step 3: Understand the Manifest

Open `manifest.json`. This is the identity card of your plugin -- the Panel reads it to know what your plugin does, what it needs, and where its pieces are.

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "A simple hello world plugin for learning",
  "author": "Your Name",
  "license": "GPL-3.0",
  "panel_version": ">=0.8.0",

  "categories": ["utility"],

  "capabilities": {
    "bot_handlers": true,
    "api_routes": true,
    "frontend_pages": true,
    "settings_panel": true,
    "scheduled_tasks": false,
    "event_listeners": false
  },

  "permissions": {
    "core_api_scopes": ["users.read"],
    "bot_scopes": ["messages.send"],
    "db_tables": ["plg_hello_world_greetings"]
  },

  "backend": {
    "entry": "plugin.py",
    "dependencies": []
  },

  "frontend": {
    "entry": "src/index.ts",
    "shared_dependencies": {
      "react": "^18.0.0",
      "react-dom": "^18.0.0"
    }
  },

  "menu": [
    {
      "label": "Hello World",
      "icon": "Hand",
      "route": "/p/hello-world/main"
    }
  ],

  "screenshots": []
}
```

Here is what each section means:

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier. Used in DB table prefixes (`plg_hello_world_*`), API paths (`/api/v1/p/hello-world/*`), and frontend routes (`/p/hello-world/*`). |
| `name` | Human-readable name shown in the Panel sidebar and Market listing. |
| `version` | Semver version. Bump with `acp version patch/minor/major`. |
| `panel_version` | Minimum Panel version required. The Panel will refuse to load a plugin if incompatible. |
| `capabilities` | Declares which subsystems your plugin uses. The Panel only initializes what you declare. |
| `permissions` | What your plugin can access from the Panel core. Users see this before installing. |
| `backend.dependencies` | Python packages your plugin needs (installed by the Panel at activation time). |
| `frontend.shared_dependencies` | Libraries shared with the Panel shell. These are NOT bundled -- the Panel provides them at runtime. |
| `menu` | Sidebar menu items. Each entry adds a link in the Panel sidebar. `icon` is a Lucide icon name. |

---

## Step 4: Backend Development

The backend is where your business logic lives: API endpoints, bot command handlers, database models, and integrations with the Panel core.

### 4.1 The Plugin Entry Point

Open `backend/plugin.py`. This is the heart of your plugin's backend:

```python
from acp_sdk import PluginBase, PluginContext


class HelloWorldPlugin(PluginBase):
    """Hello World plugin for ADMINCHAT Panel."""

    async def setup(self, ctx: PluginContext) -> None:
        """Called when the plugin is activated.

        Use this to initialize resources, register event listeners,
        and perform one-time setup.
        """
        self.logger.info("Hello World plugin activated!")

        # Access the Core SDK for interacting with the Panel
        # self.sdk is available after setup() is called
        # Example: user_count = await self.sdk.users.count()

    async def teardown(self) -> None:
        """Called when the plugin is deactivated.

        Clean up resources, cancel background tasks, close connections.
        """
        self.logger.info("Hello World plugin deactivated.")
```

The `setup()` method runs when an admin activates your plugin. The `teardown()` method runs when they deactivate it. Both are async -- use `await` freely.

### 4.2 Define a Database Model

Open `backend/models.py`. All plugin tables MUST use the `plg_{plugin_id}_` prefix:

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from acp_sdk.db import PluginBase as ModelBase


class Greeting(ModelBase):
    """Stores greeting records."""

    __tablename__ = "plg_hello_world_greetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_uid = Column(BigInteger, nullable=False, index=True)
    message = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Greeting id={self.id} tg_uid={self.telegram_uid}>"
```

The `plg_hello_world_` prefix is enforced by the validator. If you name a table `greetings` instead of `plg_hello_world_greetings`, `acp validate` will flag it.

### 4.3 Create a Migration

Open `backend/migrations/001_init.py`:

```python
"""Initial migration: create greetings table."""

from acp_sdk.db import migration


@migration(version=1)
async def upgrade(db):
    await db.execute("""
        CREATE TABLE IF NOT EXISTS plg_hello_world_greetings (
            id SERIAL PRIMARY KEY,
            telegram_uid BIGINT NOT NULL,
            message VARCHAR(500) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_plg_hw_greetings_tg_uid
            ON plg_hello_world_greetings(telegram_uid);
    """)


@migration(version=1)
async def downgrade(db):
    await db.execute("DROP TABLE IF EXISTS plg_hello_world_greetings;")
```

Migrations run automatically when the plugin is activated for the first time (or when a new migration file is detected after an update).

### 4.4 Write a Pydantic Schema

Open `backend/schemas.py`:

```python
from datetime import datetime
from pydantic import BaseModel, Field


class GreetingCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class GreetingResponse(BaseModel):
    id: int
    telegram_uid: int
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GreetingListResponse(BaseModel):
    greetings: list[GreetingResponse]
    total: int
```

### 4.5 Write an API Route

Open `backend/routes.py`. Routes are mounted automatically at `/api/v1/p/hello-world/`. You define paths relative to that prefix:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from acp_sdk.dependencies import get_db, get_current_user, get_plugin_sdk

from .models import Greeting
from .schemas import GreetingCreate, GreetingResponse, GreetingListResponse

router = APIRouter()


@router.get("/greetings", response_model=GreetingListResponse)
async def list_greetings(
    limit: int = 20,
    offset: int = 0,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    """List all greetings. Accessible at GET /api/v1/p/hello-world/greetings"""
    query = select(Greeting).order_by(Greeting.created_at.desc())
    total_query = select(func.count()).select_from(Greeting)

    result = await db.execute(query.limit(limit).offset(offset))
    total_result = await db.execute(total_query)

    return GreetingListResponse(
        greetings=result.scalars().all(),
        total=total_result.scalar(),
    )


@router.post("/greetings", response_model=GreetingResponse, status_code=201)
async def create_greeting(
    body: GreetingCreate,
    db=Depends(get_db),
    user=Depends(get_current_user),
    sdk=Depends(get_plugin_sdk),
):
    """Create a new greeting record."""
    greeting = Greeting(
        telegram_uid=user.telegram_uid,
        message=body.message,
    )
    db.add(greeting)
    await db.commit()
    await db.refresh(greeting)

    sdk.logger.info(f"New greeting from user {user.telegram_uid}: {body.message}")
    return greeting
```

Key points:

- **Do not** include `/api/v1/p/hello-world` in your route paths. The Panel adds that prefix automatically.
- `get_current_user` gives you the authenticated Panel user (JWT-based).
- `get_plugin_sdk` gives you access to the Core SDK for querying Panel data.
- `get_db` provides an async SQLAlchemy session scoped to the request.

### 4.6 Write a Bot Handler

Open `backend/handlers.py`. Bot handlers process incoming Telegram messages:

```python
from aiogram import types
from aiogram.filters import Command
from acp_sdk.bot import PluginHandler, handler


class HelloHandler(PluginHandler):
    """Responds to the /hello command in Telegram."""

    @handler(Command("hello"), priority=50)
    async def handle_hello(self, message: types.Message) -> None:
        """When a user sends /hello, greet them and record it."""
        user_name = message.from_user.first_name or "there"

        # Send a reply via Telegram
        await message.reply(f"Hello, {user_name}! Welcome to the Hello World plugin.")

        # Use the Core SDK to look up the user in Panel
        panel_user = await self.sdk.users.get_by_tg_uid(message.from_user.id)
        if panel_user:
            self.logger.info(f"Known user greeted: {panel_user.display_name}")

        # Store the greeting in our plugin's database
        async with self.db_session() as db:
            from .models import Greeting

            greeting = Greeting(
                telegram_uid=message.from_user.id,
                message=f"Hello from {user_name}",
            )
            db.add(greeting)
            await db.commit()
```

The `@handler` decorator registers the function with the Panel's bot dispatcher. The `priority` parameter (1-100, default 50) determines order when multiple plugins handle the same trigger -- lower numbers run first.

### 4.7 Using the Core SDK

The `self.sdk` object (available in handlers and routes via dependency injection) gives you read access to Panel core data:

```python
# Look up a user by Telegram UID
user = await self.sdk.users.get_by_tg_uid(123456789)

# Get conversation history
conversations = await self.sdk.conversations.list(status="open", limit=10)

# Read a setting from the Panel
panel_name = await self.sdk.settings.get("panel_name")

# Send a Telegram message through the bot
await self.sdk.bot.send_message(chat_id=123456789, text="Hello from plugin!")
```

The available scopes depend on what you declared in `manifest.json` under `permissions.core_api_scopes`. If you try to call an API you haven't declared, you get a `PermissionDeniedError`.

### 4.8 Using the Secret Store

Never hardcode API keys or tokens. Use the plugin secret store:

```python
# In your plugin.py setup():
async def setup(self, ctx: PluginContext) -> None:
    api_key = await ctx.secrets.get("external_api_key")
    if not api_key:
        self.logger.warning("External API key not configured")

# In routes or handlers:
api_key = await sdk.secrets.get("external_api_key")
```

Admins set secret values through the Panel admin UI. Your `SettingsTab.tsx` can include a form field for the secret, and the SDK handles encryption at rest.

### 4.9 Listening to Core Events

If your plugin needs to react to things happening in the Panel (new conversation, user assignment, etc.), declare `event_listeners: true` in your manifest capabilities and register listeners in `setup()`:

```python
async def setup(self, ctx: PluginContext) -> None:
    ctx.events.on("conversation.created", self.on_new_conversation)
    ctx.events.on("message.received", self.on_message)

async def on_new_conversation(self, event):
    self.logger.info(f"New conversation: {event.conversation_id}")
    # Auto-assign, send greeting, update stats, etc.

async def on_message(self, event):
    # React to every incoming message
    pass
```

---

## Step 5: Frontend Development

The frontend is a React micro-application loaded into the Panel shell via Module Federation. You get access to the Panel's design system, routing, and state management.

### 5.1 Create a Page Component

Open `frontend/src/pages/MainPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { usePluginSDK } from "@acp/plugin-sdk";

interface Greeting {
  id: number;
  telegram_uid: number;
  message: string;
  created_at: string;
}

export default function MainPage() {
  const { api, toast } = usePluginSDK();
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");

  // Fetch greetings from our plugin API
  const loadGreetings = async () => {
    try {
      const res = await api.get("/greetings");
      setGreetings(res.data.greetings);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Failed to load greetings");
    }
  };

  useEffect(() => {
    loadGreetings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await api.post("/greetings", { message });
      toast.success("Greeting created!");
      setMessage("");
      loadGreetings();
    } catch (err) {
      toast.error("Failed to create greeting");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white font-[Space_Grotesk]">
          Hello World
        </h1>
        <p className="text-[#8a8a8a] mt-1">
          A simple greeting tracker. Total greetings: {total}
        </p>
      </div>

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a greeting..."
          className="flex-1 bg-[#141414] border border-[#2f2f2f] rounded-lg px-4 py-2
                     text-white placeholder-[#4a4a4a] focus:border-[#00D9FF]
                     focus:outline-none font-[Inter]"
        />
        <button
          type="submit"
          className="bg-[#00D9FF] text-black font-medium px-6 py-2 rounded-lg
                     hover:bg-[#00C4E6] transition-colors font-[Inter]"
        >
          Send
        </button>
      </form>

      {/* Greetings List */}
      <div className="space-y-2">
        {greetings.map((g) => (
          <div
            key={g.id}
            className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4
                       flex items-center justify-between"
          >
            <div>
              <span className="text-white font-[Inter]">{g.message}</span>
              <span className="text-[#6a6a6a] text-sm ml-3 font-[JetBrains_Mono]">
                UID: {g.telegram_uid}
              </span>
            </div>
            <span className="text-[#4a4a4a] text-xs font-[JetBrains_Mono]">
              {new Date(g.created_at).toLocaleString()}
            </span>
          </div>
        ))}

        {greetings.length === 0 && (
          <p className="text-[#6a6a6a] text-center py-8">
            No greetings yet. Send one above or use /hello in Telegram!
          </p>
        )}
      </div>
    </div>
  );
}
```

### 5.2 The usePluginSDK Hook

The `usePluginSDK()` hook is your main interface to the Panel from frontend code:

```tsx
const {
  api,          // Axios instance pre-configured with /api/v1/p/{plugin_id}/ base URL
  toast,        // Toast notification methods: toast.success(), toast.error(), toast.info()
  navigate,     // Router navigation function
  currentUser,  // Currently logged-in Panel user object
  theme,        // Current theme settings
  ws,           // WebSocket connection for real-time updates
} = usePluginSDK();
```

The `api` instance automatically includes the JWT token and sets the correct base URL. You only need to specify the path relative to your plugin:

```tsx
// These are equivalent:
await api.get("/greetings");
// Internally calls: GET /api/v1/p/hello-world/greetings
```

### 5.3 Design System Classes

The Panel uses a dark theme with specific colors. Use these Tailwind classes to match:

```
Background:   bg-[#0C0C0C]  (page)   bg-[#080808]  (sidebar)
              bg-[#0A0A0A]  (cards)  bg-[#141414]  (elevated/inputs)

Accent:       bg-[#00D9FF]  text-[#00D9FF]  border-[#00D9FF]

Text:         text-white     (primary)       text-[#8a8a8a]  (secondary)
              text-[#6a6a6a] (muted)         text-[#4a4a4a]  (placeholder)

Borders:      border-[#2f2f2f] (default)     border-[#1A1A1A] (subtle)

Status:       text-[#059669]  (success/green)
              text-[#FF8800]  (warning/orange)
              text-[#FF4444]  (error/red)
              text-[#8B5CF6]  (role/purple)

Fonts:        font-[Space_Grotesk]   (headings)
              font-[Inter]           (body text)
              font-[JetBrains_Mono]  (data, code, UIDs)

Radius:       rounded-lg (6-10px, cards/buttons)
              rounded     (4px, tags/badges)
```

### 5.4 Module Federation Entry Point

Open `frontend/src/index.ts`. This file tells the Panel shell what your plugin exposes:

```ts
import MainPage from "./pages/MainPage";
import SettingsTab from "./settings/SettingsTab";

export { MainPage, SettingsTab };

// Plugin route registration
export const routes = [
  {
    path: "/p/hello-world/main",
    component: MainPage,
    label: "Hello World",
  },
];

// Settings tab registration
export const settings = {
  component: SettingsTab,
  label: "Hello World Settings",
};
```

### 5.5 Add a Settings Tab

Open `frontend/src/settings/SettingsTab.tsx`:

```tsx
import { useState, useEffect } from "react";
import { usePluginSDK } from "@acp/plugin-sdk";

export default function SettingsTab() {
  const { api, toast } = usePluginSDK();
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings");
        setGreeting(res.data.default_greeting || "");
      } catch {
        // Settings not configured yet, use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      await api.put("/settings", { default_greeting: greeting });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (loading) return <div className="text-[#6a6a6a]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white font-[Space_Grotesk]">
          Hello World Settings
        </h2>
        <p className="text-[#8a8a8a] text-sm mt-1">
          Configure the default greeting message for the /hello bot command.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-[#8a8a8a] font-[Inter]">
          Default Greeting
        </label>
        <input
          type="text"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Hello, welcome to our service!"
          className="w-full bg-[#141414] border border-[#2f2f2f] rounded-lg px-4 py-2
                     text-white placeholder-[#4a4a4a] focus:border-[#00D9FF]
                     focus:outline-none font-[Inter]"
        />
      </div>

      <button
        onClick={handleSave}
        className="bg-[#00D9FF] text-black font-medium px-6 py-2 rounded-lg
                   hover:bg-[#00C4E6] transition-colors font-[Inter]"
      >
        Save Settings
      </button>
    </div>
  );
}
```

The Settings tab appears in the Panel's Settings page under a section for your plugin. Admins can configure plugin-specific options there.

---

## Step 6: Local Development

With the code in place, let's run the plugin locally.

### 6.1 Configure Your Panel Instance

Add the development path to your Panel's environment:

```bash
# In your Panel's .env file or docker-compose.override.yml:
PLUGIN_DEV_PATH=/absolute/path/to/hello-world
ENVIRONMENT=development
```

Restart the Panel to pick up the new environment variable.

### 6.2 Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 6.3 Start Dev Mode

```bash
acp dev
```

You should see:

```
  ACP Plugin Dev Server
  Plugin:    hello-world (v1.0.0)
  Frontend:  http://localhost:3001
  Panel:     http://localhost:8000
  Status:    Connected

  [frontend]  ready in 420ms
  [backend]   watching 6 Python files
  [backend]   plugin loaded into Panel
```

### 6.4 Test It

1. **Frontend page**: Open your Panel at `http://localhost:8000`. You should see "Hello World" in the sidebar. Click it to see your MainPage component.

2. **API endpoint**: Test the API directly:
   ```bash
   curl -H "Authorization: Bearer <your-jwt>" \
        http://localhost:8000/api/v1/p/hello-world/greetings
   ```

3. **Bot command**: Send `/hello` to your Telegram bot. The bot should reply with a greeting, and a new record should appear on the frontend page.

4. **Hot reload**: Edit `MainPage.tsx` or `routes.py` -- changes reflect automatically without restarting.

---

## Step 7: Build and Validate

Before publishing, make sure everything passes validation:

```bash
acp validate
```

Fix any errors or warnings the validator reports. Common issues:

- Table name missing `plg_hello_world_` prefix.
- Unused screenshot declared in manifest.
- Frontend shared dependency version mismatch.

Once validation passes, build the production bundle:

```bash
acp build
```

This creates `dist/plugin.zip` containing your compiled frontend and backend source. You can inspect the zip contents to verify everything looks correct:

```bash
unzip -l dist/plugin.zip
```

---

## Step 8: Publish to the Market

### 8.1 Authenticate

If you haven't already, log in to the ACP Market:

```bash
acp login
```

This opens your browser for authentication and stores your credentials locally.

### 8.2 Add Screenshots

Before publishing, add at least one screenshot of your plugin's UI to the `frontend/screenshots/` directory. These appear on your Market listing page. Use PNG format, 1280x800 resolution recommended.

Update `manifest.json` to list them:

```json
{
  "screenshots": ["main-page.png"]
}
```

### 8.3 Publish

```bash
acp publish --message "Initial release: greeting tracker with /hello bot command"
```

The CLI builds, validates, signs, and uploads your plugin in one step. After submission, the Market review team checks your plugin. Typical review time is 1-3 business days. You'll receive an email when the review is complete.

### 8.4 After Approval

Once approved, your plugin appears in the ACP Market. Panel administrators can browse, install, and activate it from their admin interface. When a user installs your plugin:

1. The Panel downloads and extracts `plugin.zip`.
2. Backend dependencies are installed.
3. Database migrations run.
4. The frontend `remoteEntry.js` is served from `/plugins/hello-world/remoteEntry.js`.
5. The sidebar menu item appears.
6. Bot handlers become active.

---

## Common Patterns

Here are quick examples of patterns you will use frequently.

### Backend-Only Plugin (No Frontend)

Some plugins only need backend logic -- no UI pages. Use the `backend-only` template:

```bash
acp create-plugin "Auto Tagger" --template backend-only
```

The manifest will have `capabilities.frontend_pages: false`. The plugin can still have API routes (accessed by other plugins or external tools) and bot handlers.

```python
# backend/handlers.py -- Automatically tag new conversations
from aiogram import types
from acp_sdk.bot import PluginHandler, handler, MessageFilter


class AutoTaggerHandler(PluginHandler):
    @handler(MessageFilter.new_conversation(), priority=10)
    async def tag_conversation(self, message: types.Message) -> None:
        text = message.text or ""
        tags = []

        if any(word in text.lower() for word in ["urgent", "asap", "emergency"]):
            tags.append("urgent")
        if any(word in text.lower() for word in ["refund", "payment", "billing"]):
            tags.append("billing")

        if tags:
            conv = await self.sdk.conversations.get_by_message(message.message_id)
            if conv:
                await self.sdk.conversations.add_tags(conv.id, tags)
                self.logger.info(f"Auto-tagged conversation {conv.id}: {tags}")
```

### Plugin with Scheduled Tasks

Declare `scheduled_tasks: true` in your manifest capabilities, then register tasks in `setup()`:

```python
from acp_sdk import PluginBase, PluginContext


class StatsPlugin(PluginBase):
    async def setup(self, ctx: PluginContext) -> None:
        # Run every hour
        ctx.scheduler.add_job(
            self.compute_hourly_stats,
            trigger="interval",
            hours=1,
            id=f"{self.plugin_id}_hourly_stats",
        )

        # Run daily at 00:00 UTC
        ctx.scheduler.add_job(
            self.generate_daily_report,
            trigger="cron",
            hour=0,
            minute=0,
            id=f"{self.plugin_id}_daily_report",
        )

    async def compute_hourly_stats(self):
        async with self.db_session() as db:
            # Query and aggregate stats...
            pass

    async def generate_daily_report(self):
        summary = await self.sdk.conversations.stats(period="day")
        await self.sdk.bot.send_message(
            chat_id=self.config.admin_chat_id,
            text=f"Daily report: {summary.total_conversations} conversations",
        )

    async def teardown(self) -> None:
        # Scheduler jobs are cleaned up automatically
        pass
```

### Plugin That Listens to Core Events

React to events happening in the Panel without polling:

```python
async def setup(self, ctx: PluginContext) -> None:
    ctx.events.on("conversation.created", self.on_conversation_created)
    ctx.events.on("conversation.assigned", self.on_assigned)
    ctx.events.on("message.received", self.on_message)
    ctx.events.on("user.created", self.on_new_user)

async def on_conversation_created(self, event):
    """Fires when a Telegram user starts a new conversation."""
    self.logger.info(f"New conversation: {event.conversation_id}")

    # Example: send a welcome message after 5 seconds
    await asyncio.sleep(5)
    await self.sdk.bot.send_message(
        chat_id=event.telegram_chat_id,
        text="Thanks for reaching out! An agent will be with you shortly.",
    )

async def on_assigned(self, event):
    """Fires when a conversation is assigned to an agent."""
    agent = await self.sdk.users.get(event.agent_id)
    self.logger.info(f"Conversation {event.conversation_id} assigned to {agent.display_name}")
```

Available events: `conversation.created`, `conversation.assigned`, `conversation.closed`, `conversation.reopened`, `message.received`, `message.sent`, `user.created`, `agent.online`, `agent.offline`.

### Plugin with External API Integration

Example: a plugin that fetches movie info from TMDB.

```python
# backend/services/tmdb.py
import httpx
from acp_sdk.dependencies import get_plugin_sdk


class TMDBService:
    BASE_URL = "https://api.themoviedb.org/3"

    def __init__(self, api_key: str):
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            params={"api_key": api_key},
            timeout=10.0,
        )

    async def search_movie(self, query: str) -> list[dict]:
        response = await self.client.get("/search/movie", params={"query": query})
        response.raise_for_status()
        return response.json()["results"][:5]

    async def close(self):
        await self.client.aclose()


# backend/plugin.py
class TMDBPlugin(PluginBase):
    async def setup(self, ctx: PluginContext) -> None:
        api_key = await ctx.secrets.get("tmdb_api_key")
        if not api_key:
            raise ValueError("TMDB API key not configured. Set it in plugin settings.")
        self.tmdb = TMDBService(api_key)

    async def teardown(self) -> None:
        await self.tmdb.close()


# backend/handlers.py
class MovieHandler(PluginHandler):
    @handler(Command("movie"), priority=50)
    async def search_movie(self, message: types.Message) -> None:
        query = message.text.replace("/movie", "").strip()
        if not query:
            await message.reply("Usage: /movie <title>")
            return

        results = await self.plugin.tmdb.search_movie(query)
        if not results:
            await message.reply("No movies found.")
            return

        lines = []
        for m in results:
            year = m.get("release_date", "")[:4]
            rating = m.get("vote_average", "N/A")
            lines.append(f"- {m['title']} ({year}) - Rating: {rating}/10")

        await message.reply("\n".join(lines))
```

### Plugin with a Settings Configuration Form

A common pattern is letting admins configure your plugin through a settings form. The backend stores settings, and the frontend provides the UI.

```python
# backend/routes.py
@router.get("/settings")
async def get_settings(db=Depends(get_db), user=Depends(get_current_user)):
    # Only admins can access settings
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    settings = await db.execute(
        select(PluginSetting).where(PluginSetting.plugin_id == "hello-world")
    )
    result = settings.scalars().all()
    return {s.key: s.value for s in result}


@router.put("/settings")
async def update_settings(
    body: dict,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    for key, value in body.items():
        await db.merge(PluginSetting(plugin_id="hello-world", key=key, value=value))
    await db.commit()
    return {"status": "ok"}
```

---

## Troubleshooting

### "Module not found: @acp/plugin-sdk"

The `@acp/plugin-sdk` package is not installed in your frontend directory.

```bash
cd frontend
npm install @acp/plugin-sdk
```

### "Shared dependency version mismatch"

Your plugin's `package.json` specifies a React version that is incompatible with the Panel's version. Check the Panel's required shared dependency versions:

```bash
acp info  # Shows the Panel version constraint
```

Then align your `frontend/package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

The versions must satisfy the ranges listed in the Panel's Module Federation shared config.

### "Permission denied" when calling Core SDK

Your plugin is trying to access a core API scope that is not declared in `manifest.json`. Add the required scope:

```json
{
  "permissions": {
    "core_api_scopes": ["users.read", "conversations.read", "conversations.write"]
  }
}
```

After changing the manifest, the Panel admin must re-approve the new permissions.

### "Table already exists" during migration

Your table name is missing the `plg_{plugin_id}_` prefix, which causes a collision with a core table or another plugin's table. Rename the table:

```python
# Wrong:
__tablename__ = "greetings"

# Correct:
__tablename__ = "plg_hello_world_greetings"
```

### Frontend not loading in the Panel

Check that the `remoteEntry.js` path is correct. The Panel expects it at:

```
/plugins/hello-world/remoteEntry.js
```

In development mode (`acp dev`), the Vite dev server serves this file. In production, the Panel serves it from the installed plugin directory. Common causes:

- The `vite.config.ts` has a wrong `name` in the Module Federation config.
- The plugin ID in `manifest.json` does not match the directory name.
- The Panel instance is not configured with `PLUGIN_DEV_PATH`.

### Bot handler not triggering

1. **Priority conflict**: Another plugin or the core bot handles the same trigger with a lower (higher-priority) number. Increase your handler's priority or choose a unique command name.

2. **Capability not declared**: Make sure `capabilities.bot_handlers` is `true` in `manifest.json`.

3. **Plugin not activated**: Check the Panel admin interface to confirm the plugin status is "Active".

4. **Handler registration error**: Check the Panel logs for errors during plugin load:
   ```bash
   docker logs adminchat-panel-backend | grep hello-world
   ```

### Build fails with TypeScript errors

Run the type-checker manually to see all errors:

```bash
cd frontend
npx tsc --noEmit
```

Common causes: missing type declarations for `@acp/plugin-sdk`, or importing a Panel internal type that is not exported from the SDK.

---

## Next Steps

Now that you have a working plugin:

1. **Read the [CLI Reference](./CLI_REFERENCE.md)** for the full list of commands and options.
2. **Read the [SDK Reference](./SDK_REFERENCE.md)** for the complete backend and frontend API.
3. **Read the [Manifest Schema](./MANIFEST_SCHEMA.md)** for every available manifest field.
4. **Browse the [ACP Market](https://market.adminchat.com)** to see published plugins for inspiration.
5. **Join the developer community** at https://community.adminchat.com for help and discussion.

Happy building!
