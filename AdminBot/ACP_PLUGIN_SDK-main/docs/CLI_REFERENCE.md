# @acp/cli -- Command-Line Reference

The `@acp/cli` package is the primary development tool for building, testing, and publishing ADMINCHAT Panel plugins. This document covers every command, option, and configuration detail.

---

## Installation

Install globally via npm:

```bash
npm install -g @acp/cli
```

Or run commands on-demand without installing:

```bash
npx @acp/cli <command>
```

Verify the installation:

```bash
acp --version
# @acp/cli 1.x.x
```

---

## Commands

### `acp create-plugin <name>`

Scaffold a new plugin project with all required files and directories.

**Usage:**

```bash
acp create-plugin my-plugin
acp create-plugin "Auto Responder" --template backend-only --id auto-responder
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Human-readable plugin name. Used as the display name in the Market listing and as the basis for the auto-generated plugin ID. |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--template <type>` | `full` | Project template. One of: `full` (backend + frontend), `backend-only`, `frontend-only`. |
| `--id <plugin-id>` | Auto-generated | Override the plugin ID. Must be lowercase alphanumeric with hyphens only (`[a-z0-9-]+`). When omitted, the CLI converts `name` to kebab-case (e.g., `"Auto Responder"` becomes `auto-responder`). |
| `--author <name>` | From `~/.acp/config.json` | Author name written into `manifest.json`. Falls back to the `default_author` value in your global config, or prompts interactively. |
| `--dir <path>` | `./<name>` | Output directory. Created if it does not exist. |

**Interactive Prompts:**

When run without `--yes`, the CLI asks for:

1. **Plugin name** -- pre-filled with the `<name>` argument.
2. **Description** -- one-line summary for Market listing.
3. **Categories** -- select from: `productivity`, `automation`, `analytics`, `moderation`, `integration`, `entertainment`, `utility`.
4. **Capabilities** -- checkboxes: `bot_handlers`, `api_routes`, `frontend_pages`, `settings_panel`, `scheduled_tasks`, `event_listeners`.

Pass `--yes` to accept all defaults and skip prompts.

**Generated Project Structure (full template):**

```
my-plugin/
├── manifest.json              # Plugin metadata, permissions, capabilities
├── backend/
│   ├── plugin.py              # PluginBase subclass with setup() and teardown()
│   ├── routes.py              # Example FastAPI router mounted at /api/v1/p/{plugin_id}/
│   ├── handlers.py            # Example aiogram bot handler
│   ├── models.py              # SQLAlchemy model with plg_{plugin_id}_ table prefix
│   ├── schemas.py             # Pydantic v2 request/response schemas
│   ├── services/              # Business logic directory
│   │   └── __init__.py
│   └── migrations/
│       └── 001_init.py        # Initial database migration
├── frontend/
│   ├── vite.config.ts         # Pre-configured with @acp/plugin-sdk/vite helpers
│   ├── package.json           # Dependencies including @acp/plugin-sdk
│   ├── tsconfig.json          # TypeScript config extending @acp/plugin-sdk/tsconfig
│   ├── src/
│   │   ├── index.ts           # Module Federation exposes entry point
│   │   ├── pages/
│   │   │   └── MainPage.tsx   # Example page component
│   │   ├── settings/
│   │   │   └── SettingsTab.tsx # Plugin settings UI
│   │   └── types.ts           # Shared TypeScript types
│   └── screenshots/           # Screenshots for Market listing (add .png files here)
├── tests/
│   ├── test_routes.py         # pytest tests for API routes
│   └── test_handlers.py       # pytest tests for bot handlers
├── README.md                  # Plugin documentation (shown on Market page)
├── CHANGELOG.md               # Version history
└── .gitignore                 # Pre-configured ignores for Python + Node
```

The `backend-only` template omits the `frontend/` directory and sets `capabilities.frontend_pages` to `false` in the manifest. The `frontend-only` template omits the `backend/` directory and sets `capabilities.bot_handlers` and `capabilities.api_routes` to `false`.

**Example:**

```bash
# Create a full plugin with custom ID
acp create-plugin "TMDB Movie Search" --id tmdb-search --author "Jane Dev"

# Create a backend-only automation plugin
acp create-plugin "Auto Tagger" --template backend-only

# Create in a specific directory, skip prompts
acp create-plugin "Quick Stats" --dir ~/projects/quick-stats --yes
```

---

### `acp dev`

Start a local development environment with hot-reloading. Must be run from the plugin root directory (where `manifest.json` is located).

**Usage:**

```bash
cd my-plugin/
acp dev
acp dev --port 3002 --panel-url http://192.168.1.100:8000
```

**What it does:**

1. Reads `manifest.json` to determine plugin capabilities.
2. Starts the frontend Vite dev server (port 3001 by default) with Module Federation configured.
3. Watches backend Python files (`backend/**/*.py`) for changes and signals the Panel instance to reload the plugin module.
4. Proxies API requests from the frontend dev server to the running Panel instance.
5. Displays a consolidated log stream from both frontend and backend in the terminal.

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--panel-url <url>` | `http://localhost:8000` | Base URL of the running ADMINCHAT Panel instance. The CLI proxies `/api/v1/p/{plugin_id}/*` requests to this URL and connects to its WebSocket endpoint. |
| `--port <port>` | `3001` | Port for the frontend Vite dev server. |
| `--backend-only` | `false` | Only watch backend files. Skips frontend dev server startup. Useful for backend-only plugins or when testing via the Panel UI directly. |
| `--frontend-only` | `false` | Only start the frontend dev server. Skips backend file watching. Useful when backend changes are not needed. |

**Environment Setup:**

For the Panel instance to load your plugin in development mode, set the `PLUGIN_DEV_PATH` environment variable when starting the Panel:

```bash
# In your Panel's docker-compose.override.yml or .env file:
PLUGIN_DEV_PATH=/absolute/path/to/my-plugin
```

This tells the Panel to load the plugin directly from the filesystem instead of from the installed plugins directory. Changes to backend files are detected automatically.

**Terminal Output:**

```
  ACP Plugin Dev Server
  Plugin:    my-plugin (v1.0.0)
  Frontend:  http://localhost:3001
  Panel:     http://localhost:8000
  Status:    Connected

  [frontend]  ready in 420ms
  [backend]   watching 6 Python files
  [backend]   plugin loaded into Panel

  Press Ctrl+C to stop
```

**Notes:**

- The frontend dev server injects the plugin's `remoteEntry.js` into the Panel's shell at runtime.
- Changes to `manifest.json` require restarting `acp dev`.
- Database migrations are NOT run automatically. Use the Panel's migration runner or run them manually.
- The Panel instance must have development mode enabled (`ENVIRONMENT=development` in its config).

---

### `acp build`

Build the plugin for production distribution or Market publishing.

**Usage:**

```bash
acp build
acp build --output ./release/my-plugin-v1.2.0.zip
```

**What it does (in order):**

1. **Validates** `manifest.json` against the plugin manifest schema.
2. **Type-checks** frontend TypeScript code (`tsc --noEmit`).
3. **Builds frontend** via Vite production build, producing `remoteEntry.js` and hashed asset files.
4. **Packages backend** Python source files (no compilation -- Python is distributed as source).
5. **Generates a SHA-256 content hash** of all included files for integrity verification.
6. **Creates** `dist/plugin.zip` containing the final distributable bundle.

**Output structure inside `plugin.zip`:**

```
manifest.json                  # Plugin metadata
signature.json                 # Developer signature and content hash
backend/
  plugin.py
  routes.py
  handlers.py
  models.py
  schemas.py
  services/
    __init__.py
  migrations/
    001_init.py
frontend/
  remoteEntry.js               # Module Federation entry point
  assets/
    MainPage-[hash].js         # Code-split chunks
    index-[hash].css            # Extracted CSS
screenshots/
  main-page.png                # Market listing screenshots
README.md                      # Displayed on Market plugin page
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--output <path>` | `dist/plugin.zip` | Path for the output zip file. Directories are created if they don't exist. |
| `--skip-frontend` | `false` | Skip the frontend build step. Use for backend-only plugins. The frontend directory is excluded from the zip. |
| `--skip-validation` | `false` | Skip manifest schema validation. Not recommended -- the Market will reject invalid manifests during publish. |

**Build Output:**

```
  Building plugin: my-plugin v1.0.0

  [1/5] Validating manifest... OK
  [2/5] Type-checking frontend... OK (0 errors)
  [3/5] Building frontend... OK (142 KB gzipped)
  [4/5] Packaging backend... OK (6 files)
  [5/5] Generating content hash... OK

  Output: dist/plugin.zip (187 KB)
  SHA-256: a1b2c3d4e5f6...
```

**Notes:**

- The build process does NOT include `node_modules`, `__pycache__`, `.git`, `tests/`, or any dotfiles.
- Frontend shared dependencies (`react`, `react-dom`, `zustand`, `@tanstack/react-query`) are marked as externals and not bundled. They are provided by the Panel shell at runtime.
- Python dependencies listed in `manifest.json` under `backend.dependencies` are installed by the Panel when the plugin is activated -- they are not bundled.

---

### `acp validate`

Run all validation checks on the current plugin without building.

**Usage:**

```bash
acp validate
```

**Checks performed (in order):**

| # | Check | Description |
|---|-------|-------------|
| 1 | Manifest schema | `manifest.json` conforms to the ACP plugin manifest JSON schema. All required fields are present, types are correct, and enum values are valid. |
| 2 | Required files | All files declared in the manifest exist on disk. For `full` plugins: `backend/plugin.py`, `backend/routes.py`, `frontend/src/index.ts`. |
| 3 | Python syntax | All `.py` files under `backend/` pass `py_compile` syntax check. |
| 4 | TypeScript compilation | `tsc --noEmit` succeeds with zero errors against the frontend source. |
| 5 | Shared dependency versions | Frontend `package.json` dependency versions for shared libraries (React, etc.) are compatible with the Panel's pinned versions. |
| 6 | DB table name prefixes | All SQLAlchemy model `__tablename__` values start with `plg_{plugin_id}_`. |
| 7 | API route prefixes | All FastAPI route paths in `routes.py` do NOT include the `/api/v1/p/{plugin_id}` prefix (it is added automatically by the loader). Routes should start with `/`. |
| 8 | Frontend route prefixes | All frontend route paths registered in `index.ts` start with `/p/{plugin_id}/`. |
| 9 | Forbidden imports | No imports of core Panel models (`from app.models import ...`), no usage of `eval()` or `exec()` in backend code. |
| 10 | Screenshot files | If `manifest.screenshots` declares screenshot filenames, those files exist in `frontend/screenshots/` or `screenshots/`. |

**Output example:**

```
  Validating plugin: my-plugin v1.0.0

  [PASS] Manifest schema valid
  [PASS] Required files present
  [PASS] Python syntax OK (6 files)
  [PASS] TypeScript compilation OK
  [PASS] Shared dependency versions compatible
  [WARN] DB table "stats" in models.py:12 should be "plg_my_plugin_stats"
  [PASS] API route prefixes OK
  [PASS] Frontend route prefixes OK
  [PASS] No forbidden imports
  [FAIL] Screenshot "dashboard.png" declared in manifest but not found

  Result: 1 error, 1 warning
```

Errors must be fixed before publishing. Warnings are advisory but should be addressed.

---

### `acp publish`

Upload a built plugin to the ACP Market for distribution.

**Usage:**

```bash
acp publish
acp publish --message "Added dark mode support and fixed memory leak"
acp publish --dry-run
```

**What it does (in order):**

1. Runs `acp build` if `dist/plugin.zip` does not exist or source files have changed since the last build.
2. Runs `acp validate` -- aborts on any errors.
3. Signs the bundle with the developer's private key (from `~/.acp/credentials` or `--api-key`).
4. Uploads the signed `plugin.zip` to the Market API.
5. Submits the new version for review.

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--market-url <url>` | `https://market.adminchat.com` | Market API base URL. Override for staging or self-hosted Market instances. |
| `--api-key <key>` | From `~/.acp/credentials` | Developer API key. Can also be set via the `ACP_MARKET_API_KEY` environment variable. Precedence: flag > env var > credentials file. |
| `--dry-run` | `false` | Run the full build, validate, and sign pipeline without uploading. Useful for testing the publish flow in CI. |
| `--message <msg>` | None | Release notes for this version. Displayed on the Market version history page. If omitted, the CLI prompts for a message interactively. |

**Output:**

```
  Publishing my-plugin v1.2.0 to ACP Market

  [1/5] Building... OK
  [2/5] Validating... OK (0 errors, 0 warnings)
  [3/5] Signing bundle... OK
  [4/5] Uploading (187 KB)... OK
  [5/5] Submitting for review... OK

  Version 1.2.0 submitted for review.
  Track status: https://market.adminchat.com/dev/plugins/my-plugin/versions/1.2.0
  Typical review time: 1-3 business days.
```

**Review Process:**

After submission, the Market team reviews the plugin for:

- Security (no malicious code, no data exfiltration).
- Stability (no known crash patterns, migrations are reversible).
- Quality (manifest is complete, screenshots are accurate, README is informative).
- Compatibility (shared dependency versions, Panel version constraints).

You receive an email notification when the review is complete. If rejected, the notification includes specific feedback on what to fix.

---

### `acp login`

Authenticate with the ACP Market and store credentials locally.

**Usage:**

```bash
acp login
acp login --market-url https://staging-market.adminchat.com
```

**What it does:**

1. Opens your default browser to the Market login/registration page.
2. After you authenticate in the browser, the CLI receives an API key via a local callback server.
3. Stores the API key in `~/.acp/credentials`.

**Output:**

```
  Opening browser for authentication...
  Waiting for login callback...

  Authenticated as: jane@example.com
  Developer ID: dev_xK9mP2
  Credentials saved to ~/.acp/credentials
```

If the browser does not open automatically, the CLI prints a URL to copy and paste manually.

---

### `acp info`

Display information about the current plugin from `manifest.json`.

**Usage:**

```bash
acp info
```

**Output:**

```
  Plugin:       my-plugin
  Name:         My Plugin
  Version:      1.2.0
  Author:       Jane Dev
  License:      GPL-3.0
  Panel:        >=0.8.0
  Capabilities: bot_handlers, api_routes, frontend_pages, settings_panel
  Categories:   productivity, automation
  Permissions:  core_api_scopes: [users.read, conversations.read]
  Tables:       plg_my_plugin_stats, plg_my_plugin_config
```

---

### `acp version <new-version>`

Bump the plugin version in `manifest.json`.

**Usage:**

```bash
acp version patch      # 1.0.0 -> 1.0.1
acp version minor      # 1.0.0 -> 1.1.0
acp version major      # 1.0.0 -> 2.0.0
acp version 2.5.0      # Set an exact version
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `patch` | Increment the patch version (1.0.0 -> 1.0.1). Use for bug fixes. |
| `minor` | Increment the minor version (1.0.0 -> 1.1.0). Use for new features. |
| `major` | Increment the major version (1.0.0 -> 2.0.0). Use for breaking changes. |
| `<x.y.z>` | Set a specific semver version string. |

**Output:**

```
  Version updated: 1.0.0 -> 1.0.1
  Updated: manifest.json
```

The command only modifies `manifest.json`. It does not create git tags or commits -- that is left to your own workflow.

---

## Global Configuration

### `~/.acp/config.json`

Global CLI settings. Created on first run or via `acp login`.

```json
{
  "market_url": "https://market.adminchat.com",
  "default_author": "Your Name",
  "default_license": "GPL-3.0",
  "telemetry": true
}
```

| Field | Description |
|-------|-------------|
| `market_url` | Default Market API URL. Override per-command with `--market-url`. |
| `default_author` | Used when scaffolding new plugins if `--author` is not specified. |
| `default_license` | Default license for new plugins. |
| `telemetry` | Send anonymous usage statistics to help improve the CLI. Set to `false` to disable. |

### `~/.acp/credentials`

Authentication credentials. Managed by `acp login`.

```json
{
  "api_key": "acp_dev_xxxxxxxxxxxxxxxxxxxx",
  "developer_id": "dev_xK9mP2",
  "email": "jane@example.com",
  "created_at": "2026-03-20T10:00:00Z"
}
```

This file should NOT be committed to version control. It is excluded by default in generated `.gitignore` files.

---

## Exit Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `0` | Success | Command completed without errors. |
| `1` | Validation error | `manifest.json` is invalid, required files missing, or code checks failed. Run `acp validate` for details. |
| `2` | Build error | Frontend TypeScript compilation failed, Vite build error, or packaging failure. Check the build output for details. |
| `3` | Network error | Could not reach the Market API or the Panel instance. Check your `--market-url` / `--panel-url` and network connectivity. |
| `4` | Authentication error | API key is missing, expired, or invalid. Run `acp login` to re-authenticate. |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ACP_MARKET_API_KEY` | Developer API key. Used by `acp publish` if `--api-key` is not provided and `~/.acp/credentials` does not exist. |
| `ACP_MARKET_URL` | Market API base URL. Lower priority than `--market-url` flag and `~/.acp/config.json`. |
| `PLUGIN_DEV_PATH` | Set on the Panel instance (not the CLI). Points to your plugin directory for development-mode loading. |
| `NO_COLOR` | Set to any value to disable colored terminal output. |

---

## Usage in CI/CD

Example GitHub Actions workflow for automated publishing:

```yaml
name: Publish Plugin
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install CLI
        run: npm install -g @acp/cli

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Build and publish
        run: acp publish --message "Release ${GITHUB_REF_NAME}"
        env:
          ACP_MARKET_API_KEY: ${{ secrets.ACP_MARKET_API_KEY }}
```

---

## See Also

- [Getting Started Guide](./GETTING_STARTED.md) -- Step-by-step tutorial for building your first plugin.
- [Plugin SDK Reference](./SDK_REFERENCE.md) -- Backend and frontend SDK API documentation.
- [Manifest Schema](./MANIFEST_SCHEMA.md) -- Complete manifest.json field reference.
