# Plugin Security Specification

**Version:** 1.0.0
**Status:** Authoritative
**Last Updated:** 2026-03-24

This document defines the security model for the ADMINCHAT Panel plugin system, covering bundle signing, content integrity, permission enforcement, runtime isolation, audit trails, Market review checks, and incident response.

---

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Bundle Signing](#bundle-signing)
3. [Content Integrity](#content-integrity)
4. [Permission Enforcement](#permission-enforcement)
5. [Frontend Isolation](#frontend-isolation)
6. [Runtime Security](#runtime-security)
7. [Audit Trail](#audit-trail)
8. [Market Review Security Checks](#market-review-security-checks)
9. [Incident Response](#incident-response)
10. [Security Configuration Reference](#security-configuration-reference)

---

## Security Architecture Overview

The plugin security model follows a defense-in-depth strategy with multiple independent layers:

```
+---------------------------------------------------------------------+
|                        ADMINCHAT Panel                               |
|                                                                      |
|  +---------------------+    +------------------------------------+  |
|  |   Market Gateway     |    |   Plugin Runtime Sandbox            |  |
|  |                      |    |                                    |  |
|  |  - Ed25519 verify    |    |  +------------------------------+  |  |
|  |  - SHA-256 verify    |    |  | CoreSDKBridge                |  |  |
|  |  - Manifest validate |    |  |  - Permission check per call |  |  |
|  |  - Dependency check  |    |  |  - Scope enforcement         |  |  |
|  +---------------------+    |  |  - Rate limiting              |  |  |
|                              |  +------------------------------+  |  |
|                              |                                    |  |
|                              |  +------------------------------+  |  |
|                              |  | Module Loader                 |  |  |
|                              |  |  - Import whitelist           |  |  |
|                              |  |  - No direct core imports     |  |  |
|                              |  |  - Sandboxed sys.path         |  |  |
|                              |  +------------------------------+  |  |
|                              |                                    |  |
|                              |  +------------------------------+  |  |
|                              |  | Database Fence                |  |  |
|                              |  |  - plg_{id}_ prefix enforced  |  |  |
|                              |  |  - No raw SQL on core tables  |  |  |
|                              |  +------------------------------+  |  |
|                              |                                    |  |
|                              |  +------------------------------+  |  |
|                              |  | Filesystem Fence              |  |  |
|                              |  |  - /data/plugins/{id}/ only   |  |  |
|                              |  |  - No path traversal          |  |  |
|                              |  +------------------------------+  |  |
|                              +------------------------------------+  |
|                                                                      |
|  +---------------------+    +------------------------------------+  |
|  | Frontend Sandbox     |    | Audit System                       |  |
|  |  - ErrorBoundary     |    |  - All state changes logged        |  |
|  |  - SDK hooks only    |    |  - Permission violations logged    |  |
|  |  - CSS isolation     |    |  - Tamper-evident log chain        |  |
|  +---------------------+    +------------------------------------+  |
+---------------------------------------------------------------------+
```

### Trust Boundaries

| Boundary | Trust Level | Enforcement |
|----------|-------------|-------------|
| Market -> Panel | Verified publisher | Ed25519 signature + SHA-256 hash |
| Plugin backend -> Core APIs | Declared scopes | CoreSDKBridge permission checks |
| Plugin backend -> Database | Namespaced tables | SQL query interceptor |
| Plugin backend -> Filesystem | Sandboxed directory | Path normalization + prefix check |
| Plugin frontend -> Panel state | SDK hooks only | React context isolation |
| Plugin frontend -> DOM | Error boundary | PluginErrorBoundary wrapper |

---

## Bundle Signing

### Cryptographic Scheme

| Parameter | Value |
|-----------|-------|
| Algorithm | Ed25519 (EdDSA over Curve25519) |
| Key size | 256 bits |
| Hash for signing input | SHA-256 of the raw zip bytes |
| Signature format | 64 bytes, base64-encoded |
| Public key format | 32 bytes, base64-encoded |

### Signing Process (Market side)

```
                    Market CI/CD Pipeline

 Plugin ZIP         SHA-256              Ed25519 Sign
 (raw bytes) -----> Hash (32 bytes) ---> Signature (64 bytes)
                         |                    |
                         v                    v
                    Stored in              Stored in
                    Market DB              Market DB
                    (content_hash)         (signature)
```

Step-by-step:

1. Developer submits plugin bundle (zip file) to the Market.
2. Market CI/CD validates the bundle (see [Market Review Security Checks](#market-review-security-checks)).
3. Market computes `SHA-256(zip_bytes)` and stores as `content_hash`.
4. Market signs `content_hash` with the Market Ed25519 private key: `signature = Ed25519_Sign(private_key, content_hash)`.
5. Market stores `signature` alongside the bundle metadata.
6. Bundle, `content_hash`, and `signature` are served via the Market API.

### Verification Process (Panel side)

```
                    Panel Installation

 Downloaded ZIP     SHA-256              Ed25519 Verify
 (raw bytes) -----> Hash (32 bytes) ---> Compare with
                         |               Market signature
                         v                    |
                    Compare with              v
                    Market content_hash   Valid? Proceed
                         |               Invalid? REJECT
                         v
                    Match? Proceed
                    Mismatch? REJECT
```

Step-by-step:

1. Panel downloads the zip bundle from Market CDN.
2. Panel computes `SHA-256(downloaded_zip_bytes)`.
3. Panel fetches `content_hash` and `signature` from Market API.
4. **Hash verification:** Panel compares computed hash with `content_hash`. Mismatch -> reject with `HASH_MISMATCH` error.
5. **Signature verification:** Panel verifies `Ed25519_Verify(market_public_key, content_hash, signature)`. Failure -> reject with `INVALID_SIGNATURE` error.
6. Both checks pass -> proceed with extraction and installation.

### Key Management

| Aspect | Details |
|--------|---------|
| Market private key storage | HSM (Hardware Security Module) or encrypted vault. Never on disk in plaintext. |
| Panel public key storage | Built into Panel binary at compile time. Also configurable via `PLUGIN_MARKET_PUBLIC_KEY` environment variable. |
| Key format in Panel config | Base64-encoded 32-byte Ed25519 public key |

### Key Rotation

The Market supports key rotation to mitigate key compromise:

1. Market generates a new Ed25519 keypair.
2. Market publishes the new public key at `GET /api/v1/market/keys` alongside the old key.
3. Market signs all new bundles with the new key.
4. Panel instances fetch updated keys on each Market sync (daily, or on admin trigger).
5. Panel accepts signatures from any key in its trusted key list.
6. After a migration period (90 days), the old key is removed from the Market's published key list.
7. Panel admins can manually add/remove trusted keys via the Settings page.

**Key rotation API response:**

```json
{
  "keys": [
    {
      "id": "key-2026-03",
      "public_key": "base64-encoded-32-bytes",
      "created_at": "2026-03-01T00:00:00Z",
      "status": "active"
    },
    {
      "id": "key-2025-06",
      "public_key": "base64-encoded-32-bytes",
      "created_at": "2025-06-01T00:00:00Z",
      "status": "deprecated",
      "expires_at": "2026-06-01T00:00:00Z"
    }
  ]
}
```

### Sideloaded Plugins

Plugins installed from local disk (not from Market) bypass signature verification. This is allowed only when:

| Condition | Requirement |
|-----------|-------------|
| Panel setting | `ALLOW_SIDELOAD_PLUGINS=true` (default: `false` in production) |
| User role | `super_admin` only |
| Audit log | Sideload event logged with `severity: warning` |
| UI warning | Admin shown a prominent warning: "This plugin is not verified by the Market. Install at your own risk." |

---

## Content Integrity

### Hash Verification

| Property | Value |
|----------|-------|
| Algorithm | SHA-256 |
| Input | Raw bytes of the zip bundle |
| Output | 64-character hex string |
| Storage | Market DB `plugins.content_hash` column |
| Verification point | After download, before extraction |

### Verification Failures

| Failure | Action |
|---------|--------|
| Hash mismatch | Reject installation. Delete downloaded file. Log security event. Alert admin: "Bundle integrity check failed -- possible tampering or corrupted download." |
| Signature invalid | Reject installation. Delete downloaded file. Log security event with `severity: critical`. Alert admin: "Bundle signature verification failed -- possible supply chain attack." |
| Hash match but signature invalid | Reject. This indicates the bundle content is correct but wasn't signed by the Market (potential key compromise or unauthorized distribution). |
| Market unreachable for hash/signature | Reject. Never install without verification. Admin can retry when connectivity is restored. |

### Transport Security

| Layer | Protection |
|-------|------------|
| Market API | HTTPS (TLS 1.3) with certificate pinning |
| CDN download | HTTPS. Hash verification covers integrity regardless of transport. |
| Panel -> Market key sync | HTTPS with mutual TLS (optional) |

---

## Permission Enforcement

### CoreSDKBridge

The `CoreSDKBridge` is the sole gateway between plugin code and core Panel functionality. Every SDK method call passes through permission checks.

```python
class CoreSDKBridge:
    """Enforces manifest-declared permissions on every SDK call."""

    def __init__(self, plugin_id: str, manifest: PluginManifest):
        self._plugin_id = plugin_id
        self._allowed_scopes = set(manifest.permissions.core_api_scopes)
        self._allowed_events = set(manifest.permissions.bot_events)

    async def get_user(self, user_id: int) -> User:
        self._require_scope("users:read")
        return await self._core.users.get(user_id)

    async def send_message(self, bot_id: int, chat_id: int, text: str) -> Message:
        self._require_scope("messages:write")
        return await self._core.messages.send(bot_id, chat_id, text)

    async def subscribe_event(self, event: str, callback: Callable) -> None:
        self._require_event(event)
        await self._core.events.subscribe(
            event, callback, source_plugin=self._plugin_id
        )

    def _require_scope(self, scope: str) -> None:
        if scope not in self._allowed_scopes:
            raise PluginPermissionError(
                plugin_id=self._plugin_id,
                scope=scope,
                message=f"Plugin '{self._plugin_id}' lacks scope '{scope}'"
            )

    def _require_event(self, event: str) -> None:
        if event not in self._allowed_events:
            raise PluginPermissionError(
                plugin_id=self._plugin_id,
                event=event,
                message=f"Plugin '{self._plugin_id}' cannot subscribe to '{event}'"
            )
```

### Permission Check Matrix

| SDK Method | Required Scope | Enforcement Point |
|------------|---------------|-------------------|
| `sdk.users.list()` | `users:read` | CoreSDKBridge |
| `sdk.users.get(id)` | `users:read` | CoreSDKBridge |
| `sdk.users.block(id)` | `users:write` | CoreSDKBridge |
| `sdk.users.unblock(id)` | `users:write` | CoreSDKBridge |
| `sdk.users.update_metadata(id, data)` | `users:write` | CoreSDKBridge |
| `sdk.bots.list()` | `bots:read` | CoreSDKBridge |
| `sdk.bots.get(id)` | `bots:read` | CoreSDKBridge |
| `sdk.conversations.list()` | `conversations:read` | CoreSDKBridge |
| `sdk.conversations.get(id)` | `conversations:read` | CoreSDKBridge |
| `sdk.conversations.assign(id, agent_id)` | `conversations:write` | CoreSDKBridge |
| `sdk.conversations.resolve(id)` | `conversations:write` | CoreSDKBridge |
| `sdk.messages.list(conversation_id)` | `messages:read` | CoreSDKBridge |
| `sdk.messages.search(query)` | `messages:read` | CoreSDKBridge |
| `sdk.messages.send(bot_id, chat_id, text)` | `messages:write` | CoreSDKBridge |
| `sdk.messages.edit(message_id, text)` | `messages:write` | CoreSDKBridge |
| `sdk.faq.list()` | `faq:read` | CoreSDKBridge |
| `sdk.faq.search(query)` | `faq:read` | CoreSDKBridge |
| `sdk.settings.get(key)` | `settings:read` | CoreSDKBridge |
| `sdk.on(event, callback)` | `bot_events` list | CoreSDKBridge |

### Module Import Restriction

Plugins cannot import core Panel modules directly. The `PluginModuleLoader` enforces this:

```python
class PluginModuleLoader(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Custom module loader that restricts plugin imports."""

    BLOCKED_PREFIXES = [
        "app.models",       # Core SQLAlchemy models
        "app.services",     # Core business logic
        "app.api",          # Core API routes
        "app.core",         # Core configuration
        "app.bot",          # Core bot handlers
    ]

    ALLOWED_PREFIXES = [
        "plugin_sdk",       # The SDK package
        "plugin_sdk.types", # SDK type definitions
    ]

    def find_module(self, fullname, path=None):
        for prefix in self.BLOCKED_PREFIXES:
            if fullname.startswith(prefix):
                raise ImportError(
                    f"Plugin '{self._plugin_id}' cannot import '{fullname}'. "
                    f"Use the SDK API instead."
                )
        return None  # Fall through to normal import
```

### Database Access Fence

Plugin database operations are restricted to their namespaced tables:

| Rule | Enforcement |
|------|-------------|
| Table name prefix | All tables must be named `plg_{plugin_id}_*` |
| CREATE TABLE | Only via Alembic migrations managed by the Panel |
| SELECT/INSERT/UPDATE/DELETE | Only on `plg_{plugin_id}_*` tables via SDK |
| Raw SQL | Blocked. Plugins use SDK's query builder. |
| Cross-plugin queries | Blocked. A plugin cannot access another plugin's tables. |
| Core table access | Blocked. Use SDK methods instead. |

```python
class PluginDatabaseSession:
    """Wraps SQLAlchemy session with table prefix enforcement."""

    def __init__(self, session: AsyncSession, plugin_id: str):
        self._session = session
        self._prefix = f"plg_{plugin_id}_"

    async def execute(self, statement, *args, **kwargs):
        # Inspect the statement for table references
        tables = self._extract_tables(statement)
        for table in tables:
            if not table.startswith(self._prefix):
                raise PluginPermissionError(
                    f"Plugin '{self._plugin_id}' cannot access table '{table}'. "
                    f"Only tables with prefix '{self._prefix}' are allowed."
                )
        return await self._session.execute(statement, *args, **kwargs)
```

### API Route Namespacing

| Rule | Detail |
|------|--------|
| Route prefix | All plugin routes mounted under `/api/v1/p/{plugin_id}/` |
| Core route access | Plugins cannot register routes outside their namespace |
| Authentication | Plugin routes inherit the Panel's JWT authentication |
| Rate limiting | Plugin routes subject to per-plugin rate limits (configurable) |

**Default rate limits per plugin:**

| Endpoint Type | Limit |
|---------------|-------|
| Read endpoints (GET) | 100 req/min |
| Write endpoints (POST/PUT/DELETE) | 30 req/min |
| File upload endpoints | 10 req/min |

---

## Frontend Isolation

### PluginErrorBoundary

Every plugin React component is wrapped in a `PluginErrorBoundary` that prevents plugin errors from crashing the Panel:

```typescript
class PluginErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to Panel's plugin error tracking
    pluginErrorReporter.report({
      pluginId: this.props.pluginId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <PluginErrorFallback
          pluginId={this.props.pluginId}
          pluginName={this.props.pluginName}
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
```

### State Isolation

| Access Type | Allowed | Mechanism |
|-------------|---------|-----------|
| Zustand global store | No | Plugins do not receive store reference |
| TanStack Query client | No | Plugins use SDK's data fetching hooks |
| WebSocket connection | No (direct) | Plugins use `sdk.on()` for events |
| `usePluginSDK()` hook | Yes | Returns sandboxed SDK object |
| `usePluginConfig()` hook | Yes | Returns plugin's own config only |
| `usePluginTheme()` hook | Yes | Returns Panel theme tokens for consistent styling |
| `window` / `document` | Limited | CSP restricts inline scripts; DOM access is within plugin mount only |

### SDK Hooks Available to Plugins

```typescript
interface PluginSDK {
  // Data access (respects manifest permissions)
  useUsers(): UseQueryResult<User[]>;
  useUser(id: number): UseQueryResult<User>;
  useConversations(filters?): UseQueryResult<Conversation[]>;
  useMessages(conversationId: number): UseQueryResult<Message[]>;

  // Actions (respects manifest permissions)
  useSendMessage(): UseMutationResult;
  useAssignConversation(): UseMutationResult;

  // Plugin-specific
  usePluginAPI<T>(path: string, options?): UseQueryResult<T>;
  usePluginMutation<T>(path: string): UseMutationResult<T>;
  usePluginConfig(): PluginConfig;

  // Events
  usePluginEvent(event: string, callback: (data: any) => void): void;

  // UI
  usePluginTheme(): ThemeTokens;
  showToast(message: string, type: "success" | "error" | "info"): void;
  showConfirmDialog(options: ConfirmOptions): Promise<boolean>;

  // Navigation
  navigate(path: string): void;  // Only to /p/{plugin_id}/* paths
}
```

### CSS Isolation

Plugins MUST use one of the following CSS strategies to prevent style leakage:

| Strategy | Implementation | Recommended |
|----------|---------------|-------------|
| Tailwind prefix | Plugin's Tailwind config uses `prefix: 'plg-'` | Yes (primary) |
| CSS Modules | Scoped class names via `*.module.css` | Yes (alternative) |
| Shadow DOM | Plugin mounted inside a shadow root | No (breaks some UI libs) |
| Global CSS | Unrestricted global styles | **Blocked** -- rejected at review |

The Panel's Module Federation shared scope provides Tailwind CSS and the design system tokens. Plugins that use the shared Tailwind can apply Panel theme classes directly without prefixing.

---

## Runtime Security

### Blocked Python Constructs

The following Python constructs are blocked in plugin code. The Market automated review scans for these patterns, and the Panel's module loader provides additional runtime enforcement.

| Construct | Reason | Detection |
|-----------|--------|-----------|
| `eval()` | Arbitrary code execution | AST scan + runtime monkey-patch |
| `exec()` | Arbitrary code execution | AST scan + runtime monkey-patch |
| `compile()` | Code generation | AST scan |
| `__import__()` | Bypass import restrictions | AST scan + PluginModuleLoader |
| `importlib.import_module()` (direct) | Bypass import restrictions | AST scan |
| `os.system()` | Shell command execution | AST scan + module block |
| `subprocess.*` | Process spawning | Module block |
| `ctypes.*` | Native code execution | Module block |
| `pickle.loads()` | Deserialization attacks | AST scan |
| `marshal.loads()` | Code object injection | AST scan |
| `sys.modules` manipulation | Module cache poisoning | Runtime protection |

### Filesystem Restrictions

| Rule | Enforcement |
|------|-------------|
| Allowed read paths | `/data/plugins/{id}/` (own directory only) |
| Allowed write paths | `/data/plugins/{id}/media/` (media storage only) |
| Path traversal prevention | All paths normalized via `os.path.realpath()` and checked against allowed prefix |
| Symlink following | Disabled. Symlinks in plugin directories are rejected. |
| File size limits | Individual file: 50MB. Total media storage: configurable (default 500MB). |

```python
class PluginFileSystem:
    """Sandboxed filesystem access for plugins."""

    def __init__(self, plugin_id: str, base_path: Path):
        self._plugin_id = plugin_id
        self._base = base_path / plugin_id
        self._media = self._base / "media"

    def _validate_path(self, path: str, writable: bool = False) -> Path:
        resolved = (self._base / path).resolve()

        if writable:
            allowed = self._media.resolve()
        else:
            allowed = self._base.resolve()

        if not str(resolved).startswith(str(allowed)):
            raise PluginPermissionError(
                f"Path traversal attempt: '{path}' resolves outside "
                f"plugin directory for '{self._plugin_id}'"
            )

        if resolved.is_symlink():
            raise PluginPermissionError(
                f"Symlinks are not allowed in plugin directories"
            )

        return resolved

    async def read(self, path: str) -> bytes:
        validated = self._validate_path(path, writable=False)
        return await aiofiles.open(validated, 'rb').read()

    async def write(self, path: str, data: bytes) -> None:
        validated = self._validate_path(path, writable=True)
        if len(data) > 50 * 1024 * 1024:  # 50MB
            raise PluginPermissionError("File exceeds 50MB limit")
        async with aiofiles.open(validated, 'wb') as f:
            await f.write(data)
```

### Network Restrictions

| Rule | Detail |
|------|--------|
| Outbound HTTP | Allowed only to URLs declared in `config_schema` or explicitly whitelisted by admin |
| Outbound DNS | Standard resolution (no custom DNS) |
| Listening sockets | Blocked. Plugins cannot bind to ports. |
| WebSocket connections | Outbound allowed if declared. Inbound via Panel's WS only. |
| Internal network | Access to `localhost`, `127.0.0.1`, `10.*`, `172.16-31.*`, `192.168.*` blocked by default |

Network access is mediated through the SDK's HTTP client:

```python
class PluginHTTPClient:
    """Rate-limited, audited HTTP client for plugins."""

    BLOCKED_HOSTS = [
        "localhost", "127.0.0.1", "::1",
        # RFC 1918 ranges checked separately
    ]

    async def get(self, url: str, **kwargs) -> httpx.Response:
        self._validate_url(url)
        self._check_rate_limit()
        response = await self._client.get(url, **kwargs)
        self._log_request("GET", url, response.status_code)
        return response
```

### Resource Limits

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| Handler execution time | 30 seconds per invocation | `asyncio.wait_for()` timeout |
| Scheduled task execution time | 5 minutes per invocation | `asyncio.wait_for()` timeout |
| Memory per plugin | 256MB (configurable) | Monitored via `resource.getrusage()` |
| CPU time per handler | 10 seconds wall clock | Monitored, warning logged at 5s |
| Concurrent handler executions | 10 per plugin | `asyncio.Semaphore` |
| Database connections | 5 per plugin | Connection pool size limit |
| API response size | 10MB per response | Middleware check |

---

## Audit Trail

### Event Categories

| Category | Events | Retention |
|----------|--------|-----------|
| Lifecycle | install, activate, disable, update, uninstall | 90 days |
| Configuration | config changes, permission changes | 90 days |
| Security | permission denials, signature failures, blocked imports, path traversal attempts | 365 days |
| Runtime | errors, auto-disable, health check failures | 30 days |

### Audit Log Entry Schema

```json
{
  "id": "uuid-v4",
  "timestamp": "2026-03-24T10:15:30.123Z",
  "event_type": "plugin.permission_denied",
  "severity": "warning",
  "plugin_id": "movie-request",
  "plugin_version": "1.2.0",
  "actor": {
    "type": "plugin",
    "id": "movie-request"
  },
  "details": {
    "scope": "users:write",
    "method": "sdk.users.block",
    "args": { "user_id": 12345 }
  },
  "metadata": {
    "handler": "movie_request.handlers:on_message",
    "request_id": "req-uuid",
    "ip_address": null
  }
}
```

### Plugin API Call Logging

Every SDK call made by a plugin is logged with the `plugin_id` tag for traceability:

| Logged Fields | Description |
|---------------|-------------|
| `plugin_id` | Which plugin made the call |
| `method` | SDK method invoked (e.g. `users.get`) |
| `scope` | Permission scope used |
| `duration_ms` | Execution time |
| `success` | Whether the call succeeded |
| `error` | Error message if failed |

Log level for successful calls: `DEBUG`. Log level for failures: `WARNING`. Log level for permission denials: `WARNING` + audit log entry.

### Security Event Logging

Failed permission checks are logged as security events with elevated severity:

```python
async def _require_scope(self, scope: str) -> None:
    if scope not in self._allowed_scopes:
        # Log security event
        await self._audit.log(
            event_type="plugin.permission_denied",
            severity="warning",
            plugin_id=self._plugin_id,
            details={
                "scope": scope,
                "method": self._current_method,
                "stack_trace": traceback.format_stack(),
            }
        )
        raise PluginPermissionError(...)
```

---

## Market Review Security Checks

Every plugin submitted to the Market undergoes automated security scanning before publication. These checks run in a sandboxed CI environment.

### Automated Scan Pipeline

```
Submit Bundle
     |
     v
[1] Archive Analysis
     |
     v
[2] Manifest Validation
     |
     v
[3] Static Code Analysis (Python)
     |
     v
[4] Static Code Analysis (JavaScript)
     |
     v
[5] Dependency Audit
     |
     v
[6] Build Verification
     |
     v
[7] Runtime Smoke Test
     |
     v
[8] Size & Resource Check
     |
     v
Pass / Fail (with report)
```

### Check Details

#### [1] Archive Analysis

| Check | Description | Severity |
|-------|-------------|----------|
| Zip structure | Bundle is a valid zip with `manifest.json` at root | Blocking |
| Hidden files | No `.git/`, `.env`, `.ssh/`, `.aws/` directories | Blocking |
| Sensitive files | No `*.pem`, `*.key`, `*.p12`, `credentials.json`, `*.sqlite` | Blocking |
| File count | < 5000 files | Warning |
| Total size | < 100MB uncompressed | Blocking |
| Symlinks | No symbolic links | Blocking |
| File permissions | No executable bits on non-script files | Warning |

#### [2] Manifest Validation

| Check | Description | Severity |
|-------|-------------|----------|
| Schema compliance | Full JSON Schema validation (see PLUGIN_MANIFEST_SPEC.md) | Blocking |
| ID uniqueness | `id` not already taken by another publisher | Blocking |
| Version increment | `version` is newer than any published version for this `id` | Blocking |
| Scope minimality | Warning if plugin requests scopes it doesn't appear to use | Warning |
| Category relevance | Categories match plugin description (NLP check) | Advisory |

#### [3] Static Code Analysis (Python)

| Check | Pattern | Severity |
|-------|---------|----------|
| Forbidden builtins | `eval(`, `exec(`, `compile(`, `__import__(` | Blocking |
| Shell execution | `os.system(`, `os.popen(`, `subprocess.` | Blocking |
| Network listeners | `socket.bind(`, `socket.listen(` | Blocking |
| Pickle usage | `pickle.loads(`, `pickle.load(` | Blocking |
| Marshal usage | `marshal.loads(` | Blocking |
| Core imports | `from app.models`, `from app.services`, `from app.core` | Blocking |
| File operations outside sandbox | Absolute paths, `../` traversal in string literals | Warning |
| Obfuscated code | Base64-encoded strings > 500 chars, hex-encoded strings | Warning |
| Dynamic attribute access | Excessive use of `getattr()` on unknown objects | Advisory |
| Cryptomining indicators | Known mining pool hostnames, CPU-intensive loops | Blocking |
| Data exfiltration | Bulk user data collection patterns | Warning |

#### [4] Static Code Analysis (JavaScript/TypeScript)

| Check | Pattern | Severity |
|-------|---------|----------|
| `eval()` / `Function()` | Dynamic code execution | Blocking |
| `document.cookie` access | Cookie theft | Blocking |
| `localStorage` / `sessionStorage` direct access | Data exfiltration | Warning |
| External script loading | `<script src="...">` with external domains | Blocking |
| Inline event handlers | `onclick`, `onerror` in HTML strings | Warning |
| Global state mutation | Direct `window.*` assignments (except Module Federation) | Warning |
| Fetch to external domains | Non-plugin API calls | Warning |
| Prototype pollution | `__proto__`, `constructor.prototype` manipulation | Blocking |

#### [5] Dependency Audit

| Check | Description | Severity |
|-------|-------------|----------|
| Known vulnerabilities | All `python_dependencies` checked against OSV/CVE databases | Blocking (critical/high), Warning (medium/low) |
| Denied packages | Check against Panel's deny list (see PLUGIN_MANIFEST_SPEC.md) | Blocking |
| License compatibility | Dependencies checked for GPL-incompatible licenses | Warning |
| Pinned versions | Dependencies without version pins | Advisory |
| Typosquatting | Package names checked against known typosquatting patterns | Blocking |
| Dependency count | > 20 direct dependencies | Warning |

#### [6] Build Verification

| Check | Description | Severity |
|-------|-------------|----------|
| Reproducible build | Bundle can be rebuilt from source and produces matching hash | Advisory |
| Source maps | Frontend bundle includes source maps for debugging | Advisory |
| Module Federation | `remoteEntry.js` loads correctly in test harness | Blocking (if frontend declared) |
| Python import | Entry point module imports without error | Blocking (if backend declared) |

#### [7] Runtime Smoke Test

| Check | Description | Severity |
|-------|-------------|----------|
| `setup(sdk)` | Entry point's setup function completes without error | Blocking |
| `teardown(sdk)` | Teardown function completes without error | Warning |
| API routes | Declared routes respond (even with 401/403) | Blocking (if api_routes) |
| Migration | Alembic upgrade/downgrade cycle completes | Blocking (if database) |
| Frontend render | Exposed modules render without crash | Warning (if frontend) |

#### [8] Size and Resource Check

| Check | Threshold | Severity |
|-------|-----------|----------|
| Bundle size (compressed) | < 50MB | Blocking |
| Bundle size (uncompressed) | < 100MB | Blocking |
| Individual file size | < 20MB | Warning |
| Number of files | < 5000 | Warning |
| Frontend bundle size | < 5MB (JS) | Warning |
| Screenshot count | <= 8 | Blocking |
| Screenshot size | < 2MB each | Warning |

### Review Outcome

| Result | Action |
|--------|--------|
| All checks pass | Plugin published to Market |
| Blocking check fails | Rejected. Developer receives detailed report. |
| Warning checks fail | Published with warnings visible on Market page. |
| Advisory checks fail | Published. Feedback sent to developer. |

---

## Incident Response

### Scenario: Malicious Plugin Discovered Post-Publication

When a published plugin is found to contain malicious code (by user report, automated re-scan, or security audit), the following incident response procedure is executed.

#### Phase 1: Containment (0-1 hour)

| Step | Action | Actor |
|------|--------|-------|
| 1.1 | Market admin flags the plugin as `quarantined` in the Market database | Market Admin |
| 1.2 | Market API immediately stops serving the plugin bundle for new downloads | Automated |
| 1.3 | Market publishes a `security_advisory` record for the plugin ID | Market Admin |
| 1.4 | All Panel instances are notified on their next Market sync (or immediate push if WebSocket channel available) | Automated |

#### Phase 2: Mitigation (1-4 hours)

| Step | Action | Actor |
|------|--------|-------|
| 2.1 | Panel instances that have the plugin installed receive the `security_advisory` | Automated |
| 2.2 | Panel auto-disables the plugin (same as `active` -> `disabled` transition) | Automated |
| 2.3 | Panel displays a security banner: "Plugin '{name}' has been disabled due to a security advisory. Contact your administrator." | Automated |
| 2.4 | Panel sends Telegram notification to all super_admins | Automated |
| 2.5 | Audit log entry created with `severity: critical` and `event_type: plugin.security_quarantine` | Automated |

#### Phase 3: Investigation (4-48 hours)

| Step | Action | Actor |
|------|--------|-------|
| 3.1 | Market security team reviews the malicious code and determines the impact | Market Security |
| 3.2 | Impact assessment: data accessed, data exfiltrated, systems compromised | Market Security |
| 3.3 | Publish detailed advisory to all affected Panel operators | Market Security |
| 3.4 | Provide remediation steps (e.g., rotate API keys, audit logs) | Market Security |

#### Phase 4: Enforcement (24-72 hours)

| Step | Action | Actor |
|------|--------|-------|
| 4.1 | Developer account suspended | Market Admin |
| 4.2 | All other plugins by the same developer flagged for re-review | Automated |
| 4.3 | Plugin permanently removed from Market (not just quarantined) | Market Admin |
| 4.4 | Plugin's signing key revoked (if developer had their own key) | Market Security |

#### Phase 5: Recovery (48+ hours)

| Step | Action | Actor |
|------|--------|-------|
| 5.1 | Panel operators review audit logs for signs of exploitation | Panel Admins |
| 5.2 | If data exfiltration detected: credential rotation, user notification | Panel Admins |
| 5.3 | Panel operators uninstall the quarantined plugin (with `drop_tables` if compromised) | Panel Admins |
| 5.4 | Post-incident report published | Market Security |
| 5.5 | Review pipeline updated with new detection patterns | Market Security |

### Security Advisory Format

```json
{
  "advisory_id": "ACP-SA-2026-001",
  "published_at": "2026-03-24T12:00:00Z",
  "severity": "critical",
  "affected_plugin": {
    "id": "malicious-plugin",
    "affected_versions": ["1.0.0", "1.0.1", "1.1.0"],
    "fixed_version": null
  },
  "title": "Remote code execution via crafted message handler",
  "description": "The plugin's message handler contains obfuscated code that executes arbitrary commands when processing messages containing specific patterns.",
  "impact": "Full server compromise. Attacker can read/write all Panel data.",
  "action": "auto_disable",
  "remediation": [
    "Uninstall the plugin immediately",
    "Rotate all API keys and bot tokens",
    "Review audit logs from {first_install_date} to present",
    "Check for unauthorized admin accounts"
  ],
  "cve": "CVE-2026-XXXXX"
}
```

### Panel-Side Auto-Response Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SECURITY_ADVISORY_AUTO_DISABLE` | `true` | Automatically disable quarantined plugins |
| `SECURITY_ADVISORY_CHECK_INTERVAL` | `3600` (seconds) | How often to check for new advisories |
| `SECURITY_ADVISORY_NOTIFY_TELEGRAM` | `true` | Send Telegram notification to super_admins |
| `SECURITY_ADVISORY_NOTIFY_EMAIL` | `true` | Send email notification to super_admins |

---

## Security Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLUGIN_MARKET_PUBLIC_KEY` | Built-in | Base64-encoded Ed25519 public key for bundle verification |
| `ALLOW_SIDELOAD_PLUGINS` | `false` | Allow installing unsigned plugins from local disk |
| `PLUGIN_RATE_LIMIT_READ` | `100` | Per-plugin read endpoint rate limit (req/min) |
| `PLUGIN_RATE_LIMIT_WRITE` | `30` | Per-plugin write endpoint rate limit (req/min) |
| `PLUGIN_HANDLER_TIMEOUT` | `30` | Handler execution timeout (seconds) |
| `PLUGIN_TASK_TIMEOUT` | `300` | Scheduled task execution timeout (seconds) |
| `PLUGIN_MAX_MEMORY_MB` | `256` | Per-plugin memory limit |
| `PLUGIN_MAX_STORAGE_MB` | `500` | Per-plugin media storage limit |
| `PLUGIN_ERROR_THRESHOLD` | `5` | Consecutive errors before auto-disable |
| `PLUGIN_MAX_CONCURRENT_HANDLERS` | `10` | Max concurrent handler executions per plugin |
| `PLUGIN_MAX_DB_CONNECTIONS` | `5` | Max database connections per plugin |
| `SECURITY_ADVISORY_AUTO_DISABLE` | `true` | Auto-disable quarantined plugins |
| `SECURITY_ADVISORY_CHECK_INTERVAL` | `3600` | Advisory check interval (seconds) |

### Panel Admin Security Settings

Accessible via **Settings > Plugins > Security**:

| Setting | Description |
|---------|-------------|
| Trusted Market Keys | Manage the list of trusted Ed25519 public keys |
| Sideload Policy | Enable/disable sideloaded plugin installation |
| Default Rate Limits | Configure per-plugin API rate limits |
| Resource Limits | Configure memory, storage, and timeout limits |
| Error Threshold | Configure auto-disable threshold per plugin |
| Network Allowlist | Configure allowed outbound domains for plugins |
| Security Advisory | Configure auto-response behavior |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-24 | Initial specification |
