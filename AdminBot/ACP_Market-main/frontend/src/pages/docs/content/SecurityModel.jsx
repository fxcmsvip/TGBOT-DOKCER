import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function SecurityModel() {
  return (
    <div>
      <Heading level={1} id="security-model">Plugin Security Model</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP Market and ADMINCHAT Panel implement a <strong className="text-text-primary">defense-in-depth</strong> security
        architecture. Every plugin operates within multiple overlapping security boundaries so that a
        compromise in one layer does not automatically grant access to the entire system. This document
        describes every layer, the contracts plugins must satisfy, and the procedures the platform
        follows when a security incident is detected.
      </p>

      {/* ── Security Architecture Overview ────────────────────── */}
      <Heading level={2} id="architecture-overview">Security Architecture Overview</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The platform follows the <em>defense-in-depth</em> principle: no single security control is
        considered sufficient on its own. Instead, multiple independent layers stack to create
        redundant protection. If one layer is bypassed, the next layer prevents escalation.
      </p>

      <CodeBlock language="text" title="Defense-in-Depth Layer Diagram">
{`┌─────────────────────────────────────────────────────────────────┐
│                     ACP Market (Review Gate)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Bundle Signing & Integrity Layer              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │            Permission Enforcement Layer              │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │          Frontend Isolation (Browser)          │  │  │  │
│  │  │  │  ┌───────────────────────────────────────┐    │  │  │  │
│  │  │  │  │   ErrorBoundary + SDK Hooks Only      │    │  │  │  │
│  │  │  │  │   CSS Scoped / Shadow DOM             │    │  │  │  │
│  │  │  │  └───────────────────────────────────────┘    │  │  │  │
│  │  │  ├───────────────────────────────────────────────┤  │  │  │
│  │  │  │          Backend Isolation (Server)            │  │  │  │
│  │  │  │  ┌───────────────────────────────────────┐    │  │  │  │
│  │  │  │  │   Module Loader Import Whitelist      │    │  │  │  │
│  │  │  │  │   Sandboxed sys.path                  │    │  │  │  │
│  │  │  │  │   Database Fence (plg_{id}_ prefix)   │    │  │  │  │
│  │  │  │  │   Filesystem Fence (/data/plugins/)   │    │  │  │  │
│  │  │  │  └───────────────────────────────────────┘    │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                      Audit Trail (all layers)                    │
└─────────────────────────────────────────────────────────────────┘`}
      </CodeBlock>

      <Callout type="info" title="Zero-Trust Principle">
        Every plugin is treated as untrusted code regardless of its author or review status.
        All access to core resources passes through SDK bridge functions that enforce
        permissions, validate inputs, and log every operation.
      </Callout>

      {/* ── Trust Boundaries ─────────────────────────────────── */}
      <Heading level={2} id="trust-boundaries">Trust Boundaries</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A trust boundary is any point where data or control crosses between components with
        different privilege levels. Each boundary enforces its own validation and
        authentication rules.
      </p>

      <PropsTable
        columns={['Boundary', 'From', 'To', 'Enforcement Mechanism']}
        rows={[
          ['Market -> Panel', 'ACP Market CDN', 'ADMINCHAT Panel', 'Ed25519 bundle signature verification, SHA-256 content hash check'],
          ['Plugin Frontend -> Core SDK', 'Plugin React component', 'CoreSDKBridge', 'Scoped hook API only, permission check per call, rate limiting'],
          ['Plugin Backend -> Core APIs', 'Plugin Python module', 'Core REST endpoints', 'JWT scoped to plugin ID, permission bitfield validation'],
          ['Plugin Backend -> Database', 'Plugin Python module', 'PostgreSQL / SQLite', 'Prefixed table names (plg_{id}_*), parameterized queries only'],
          ['Plugin Backend -> Filesystem', 'Plugin Python module', 'OS filesystem', 'Chroot to /data/plugins/{id}/, path traversal detection'],
          ['Plugin Backend -> Network', 'Plugin Python module', 'External services', 'Allowlisted domains only (if network permission granted)'],
          ['Panel -> Market API', 'ADMINCHAT Panel', 'ACP Market REST API', 'Panel instance API key, TLS 1.3 enforced'],
          ['User -> Panel', 'Browser', 'ADMINCHAT Panel', 'Session auth, CSRF token, role-based access control'],
        ]}
      />

      {/* ── Bundle Signing ────────────────────────────────────── */}
      <Heading level={2} id="bundle-signing">Bundle Signing</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every plugin bundle distributed through the ACP Market is cryptographically signed.
        The Panel verifies this signature before installing or updating any plugin. This
        ensures that the code running on the Panel is exactly the code reviewed and approved
        by the Market.
      </p>

      <Heading level={3} id="signing-algorithm">Signing Algorithm</Heading>
      <PropsTable
        columns={['Parameter', 'Value', 'Notes']}
        rows={[
          ['Signature Algorithm', 'Ed25519 (RFC 8032)', 'Fast, deterministic, small signatures (64 bytes)'],
          ['Hash Algorithm', 'SHA-256', 'Applied to the bundle tarball before signing'],
          ['Key Size', '256-bit private / 256-bit public', 'Ed25519 uses compressed Edwards curve points'],
          ['Signature Format', 'Base64-encoded 64-byte Ed25519 signature', 'Stored in bundle metadata manifest.sig'],
          ['Public Key Distribution', 'Embedded in Panel configuration', 'Rotated via Panel update, pinned per Market instance'],
        ]}
      />

      <Heading level={3} id="signing-process">Signing Process (Market Side)</Heading>
      <CodeBlock language="text" title="Bundle Signing Flow">
{`1. Developer uploads plugin source to ACP Market
2. Market CI builds the plugin bundle (frontend + backend)
3. Market computes SHA-256 hash of the final .tar.gz bundle
4. Market signs the hash with its Ed25519 private key
5. Signature + hash are stored in the bundle metadata:
   {
     "bundle_hash": "sha256:a1b2c3d4e5f6...",
     "signature": "base64:MEUCIQD...",
     "signed_at": "2025-01-15T12:00:00Z",
     "market_key_id": "market-prod-key-2025"
   }
6. Signed bundle is uploaded to the CDN for distribution`}
      </CodeBlock>

      <Heading level={3} id="verification-process">Verification Process (Panel Side)</Heading>
      <CodeBlock language="python" title="Signature Verification (simplified)">
{`import hashlib
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

def verify_bundle(bundle_path: str, metadata: dict, market_pubkey: bytes) -> bool:
    """Verify the integrity and authenticity of a plugin bundle."""

    # Step 1: Compute hash of the downloaded bundle
    sha256 = hashlib.sha256()
    with open(bundle_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    computed_hash = sha256.hexdigest()

    # Step 2: Compare with declared hash
    declared_hash = metadata["bundle_hash"].removeprefix("sha256:")
    if computed_hash != declared_hash:
        raise IntegrityError(f"Hash mismatch: {computed_hash} != {declared_hash}")

    # Step 3: Verify Ed25519 signature over the hash
    verify_key = VerifyKey(market_pubkey)
    try:
        verify_key.verify(
            computed_hash.encode("utf-8"),
            base64.b64decode(metadata["signature"].removeprefix("base64:"))
        )
    except BadSignatureError:
        raise AuthenticityError("Bundle signature verification failed")

    return True`}
      </CodeBlock>

      <Callout type="danger" title="Signature Failure">
        If bundle verification fails at any step, the Panel immediately aborts installation,
        quarantines the downloaded file, logs the incident with full details, and notifies
        the Panel administrator. The plugin transitions to the <code>error</code> state.
      </Callout>

      {/* ── Content Integrity ─────────────────────────────────── */}
      <Heading level={2} id="content-integrity">Content Integrity</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Beyond the top-level bundle signature, individual files within the bundle carry
        their own SHA-256 hashes in the bundle manifest. This enables detection of partial
        corruption and targeted tampering of individual files.
      </p>

      <CodeBlock language="json" title="Bundle File Manifest (files.json)">
{`{
  "files": [
    {
      "path": "frontend/index.js",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "size": 142857
    },
    {
      "path": "backend/main.py",
      "sha256": "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
      "size": 8421
    },
    {
      "path": "manifest.json",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "size": 1024
    }
  ],
  "total_files": 3,
  "manifest_version": 1
}`}
      </CodeBlock>

      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        During installation, the Panel verifies every file hash against the manifest. If any
        file fails its hash check, the entire installation is rolled back and the bundle is
        quarantined.
      </p>

      {/* ── Permission Enforcement ────────────────────────────── */}
      <Heading level={2} id="permission-enforcement">Permission Enforcement</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins declare their required permissions in <code>manifest.json</code>. The Panel
        enforces these permissions at runtime through the <strong>CoreSDKBridge</strong> on
        the frontend and through scoped JWT tokens on the backend. A plugin can never exceed
        the permissions granted to it during installation.
      </p>

      <Heading level={3} id="permission-scopes">Available Permission Scopes</Heading>
      <PropsTable
        columns={['Scope', 'Grants Access To', 'Risk Level']}
        rows={[
          ['panel:read', 'Read Panel configuration, theme, locale', 'Low'],
          ['panel:navigate', 'Programmatic page navigation within Panel', 'Low'],
          ['users:read', 'Read user list and profile information', 'Medium'],
          ['users:write', 'Modify user profiles, roles', 'High'],
          ['messages:read', 'Read message history across channels', 'Medium'],
          ['messages:write', 'Send messages, edit/delete own messages', 'Medium'],
          ['messages:delete', 'Delete any message in accessible channels', 'High'],
          ['bots:manage', 'Register/unregister bot command handlers', 'High'],
          ['storage:read', 'Read from plugin-scoped key-value store', 'Low'],
          ['storage:write', 'Write to plugin-scoped key-value store', 'Low'],
          ['database:own', 'Create/read/write plugin-prefixed tables', 'Medium'],
          ['filesystem:own', 'Read/write files in plugin sandbox directory', 'Medium'],
          ['network:outbound', 'Make HTTP requests to allowlisted domains', 'High'],
          ['cron:schedule', 'Register periodic background tasks', 'Medium'],
          ['notifications:send', 'Send push/in-app notifications to users', 'Medium'],
        ]}
      />

      <Heading level={3} id="sdk-bridge-enforcement">CoreSDKBridge Enforcement</Heading>
      <CodeBlock language="javascript" title="Frontend Permission Check (CoreSDKBridge)">
{`// Internal SDK bridge — plugins never call this directly.
// Every SDK hook (useUsers, useMessages, etc.) routes through this.

class CoreSDKBridge {
  #pluginId;
  #grantedScopes;
  #callCounts = new Map();  // scope -> count in current window

  checkPermission(scope) {
    // 1. Scope check
    if (!this.#grantedScopes.has(scope)) {
      throw new PluginPermissionError(
        \`Plugin "\${this.#pluginId}" lacks scope "\${scope}"\`
      );
    }

    // 2. Rate limiting (per scope, sliding window)
    const key = scope;
    const count = this.#callCounts.get(key) ?? 0;
    const limit = RATE_LIMITS[scope] ?? 100; // calls per minute
    if (count >= limit) {
      throw new PluginRateLimitError(
        \`Plugin "\${this.#pluginId}" exceeded rate limit for "\${scope}"\`
      );
    }
    this.#callCounts.set(key, count + 1);

    // 3. Audit log
    auditLog.record({
      plugin_id: this.#pluginId,
      scope,
      timestamp: Date.now(),
      action: 'permission_check_passed',
    });
  }
}`}
      </CodeBlock>

      <Heading level={3} id="rate-limits">Rate Limits by Scope</Heading>
      <PropsTable
        columns={['Scope', 'Rate Limit', 'Window', 'Burst Allowed']}
        rows={[
          ['panel:read', '200 calls', '1 minute', 'Yes (up to 50 burst)'],
          ['users:read', '100 calls', '1 minute', 'No'],
          ['users:write', '20 calls', '1 minute', 'No'],
          ['messages:read', '100 calls', '1 minute', 'Yes (up to 30 burst)'],
          ['messages:write', '30 calls', '1 minute', 'No'],
          ['messages:delete', '10 calls', '1 minute', 'No'],
          ['storage:read', '200 calls', '1 minute', 'Yes (up to 50 burst)'],
          ['storage:write', '50 calls', '1 minute', 'No'],
          ['network:outbound', '30 calls', '1 minute', 'No'],
          ['notifications:send', '10 calls', '1 minute', 'No'],
        ]}
      />

      {/* ── Frontend Isolation ────────────────────────────────── */}
      <Heading level={2} id="frontend-isolation">Frontend Isolation</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugin frontend code runs within the Panel's React tree but is isolated through
        several mechanisms to prevent interference with the core UI or other plugins.
      </p>

      <Heading level={3} id="error-boundary">ErrorBoundary Wrapping</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every plugin component is wrapped in a dedicated <code>ErrorBoundary</code>. If a
        plugin throws an unhandled exception during rendering, only that plugin's UI is
        replaced with a fallback error screen. The rest of the Panel continues to function
        normally.
      </p>

      <CodeBlock language="jsx" title="Plugin ErrorBoundary Wrapper">
{`// Panel core — wraps every loaded plugin component
<PluginErrorBoundary
  pluginId={plugin.id}
  fallback={<PluginCrashScreen pluginId={plugin.id} error={error} />}
  onError={(error, errorInfo) => {
    auditLog.record({
      type: 'plugin_frontend_crash',
      plugin_id: plugin.id,
      error: error.message,
      stack: errorInfo.componentStack,
    });
    // Auto-disable after 3 crashes in 5 minutes
    pluginHealthMonitor.recordCrash(plugin.id);
  }}
>
  <PluginSDKProvider pluginId={plugin.id} permissions={plugin.permissions}>
    <plugin.Component />
  </PluginSDKProvider>
</PluginErrorBoundary>`}
      </CodeBlock>

      <Heading level={3} id="sdk-hooks-only">SDK Hooks Only</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins cannot import Panel internals or access the DOM outside their own subtree.
        All interaction with the Panel happens through SDK hooks provided by the
        <code> @acp/plugin-sdk</code> package. Direct DOM manipulation, <code>window</code> property
        access beyond standard Web APIs, and importing from <code>@core/*</code> paths are
        blocked by the module loader.
      </p>

      <Heading level={3} id="css-isolation">CSS Isolation</Heading>
      <PropsTable
        columns={['Mechanism', 'How It Works', 'What It Prevents']}
        rows={[
          ['Scoped class prefix', 'All plugin CSS classes are prefixed with .plg-{id}--', 'Prevents style collisions between plugins and core'],
          ['CSS Modules enforcement', 'Plugin build pipeline forces CSS Modules or scoped styles', 'Prevents global style leaks'],
          ['Custom property namespace', 'Plugins may define --plg-{id}-* variables only', 'Prevents overriding core theme tokens'],
          ['Shadow DOM (optional)', 'Plugins may opt into Shadow DOM for full encapsulation', 'Prevents all style inheritance and leakage'],
        ]}
      />

      {/* ── Runtime Security ──────────────────────────────────── */}
      <Heading level={2} id="runtime-security">Runtime Security (Backend)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugin backend code runs as Python modules loaded by the Panel's plugin runtime
        engine. The runtime imposes strict controls on what modules a plugin can import and
        what system resources it can access.
      </p>

      <Heading level={3} id="module-loader">Module Loader Import Whitelist</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The custom module loader intercepts all <code>import</code> statements from plugin code.
        Only modules on the whitelist are allowed. Attempting to import a blocked module
        raises a <code>PluginImportError</code> and logs the attempt.
      </p>

      <CodeBlock language="python" title="Module Import Whitelist">
{`# Allowed standard library modules
STDLIB_WHITELIST = {
    "json", "datetime", "re", "math", "hashlib", "hmac",
    "base64", "urllib.parse", "collections", "dataclasses",
    "enum", "functools", "itertools", "typing", "uuid",
    "logging", "io", "csv", "pathlib", "textwrap",
    "decimal", "fractions", "statistics", "copy",
}

# Allowed third-party packages
THIRDPARTY_WHITELIST = {
    "pydantic", "httpx", "aiohttp",
    "sqlalchemy",          # ORM only — raw engine blocked
    "acp_plugin_sdk",      # Official SDK
    "jinja2",              # Templating
    "pillow",              # Image processing
    "dateutil",            # Date parsing
}

# Always blocked (even if in stdlib)
BLOCKED_MODULES = {
    "os", "sys", "subprocess", "shutil", "ctypes",
    "importlib", "code", "codeop", "compile", "exec",
    "socket", "asyncio.subprocess", "multiprocessing",
    "signal", "resource", "pty", "fcntl", "termios",
    "pickle", "shelve", "marshal",  # deserialization attacks
}`}
      </CodeBlock>

      <Heading level={3} id="sandboxed-syspath">Sandboxed sys.path</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Each plugin's <code>sys.path</code> is restricted to its own installation directory
        and the shared dependencies directory. A plugin cannot import code from other
        plugins or from the Panel core.
      </p>

      <CodeBlock language="python" title="sys.path Sandboxing">
{`# For plugin "my-weather-widget" with id "abc123":
# sys.path is set to exactly:
[
    "/data/plugins/abc123/backend/",       # Plugin's own code
    "/opt/acp/shared-deps/",              # Shared whitelisted packages
    "/opt/acp/plugin-sdk/",               # ACP Plugin SDK
]
# All other paths are removed before plugin code executes`}
      </CodeBlock>

      {/* ── Database Fence ────────────────────────────────────── */}
      <Heading level={2} id="database-fence">Database Fence</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins that declare the <code>database:own</code> permission can create and manage
        their own database tables. However, all table names must be prefixed with
        <code> plg_{'{id}'}_</code> where <code>{'{id}'}</code> is the plugin's unique
        identifier. The database proxy enforces this at the query level.
      </p>

      <PropsTable
        columns={['Rule', 'Enforcement', 'Example']}
        rows={[
          ['Table name prefix', 'CREATE TABLE must start with plg_{id}_', 'plg_abc123_settings OK, user_settings BLOCKED'],
          ['No raw SQL on core tables', 'Query parser rejects references to core_*, auth_*, panel_*', 'SELECT * FROM core_users -> DENIED'],
          ['Parameterized queries only', 'Query proxy rejects string-interpolated values', 'f"...WHERE id={val}" -> DENIED'],
          ['Row-level isolation', 'Plugin can only access rows in its own tables', 'Cross-plugin table reference -> DENIED'],
          ['Schema migration tracking', 'All DDL changes are versioned and reversible', 'Tracked in plg_{id}_migrations table'],
          ['Max table count', '50 tables per plugin', 'CREATE TABLE #51 -> DENIED'],
          ['Max total size', '500 MB per plugin', 'INSERT exceeding quota -> DENIED'],
        ]}
      />

      <CodeBlock language="python" title="Database Fence Enforcement">
{`from acp_plugin_sdk import Database

# Plugin SDK provides a safe database interface
db = Database()  # Automatically scoped to current plugin

# This works — table name is auto-prefixed:
await db.execute(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"
)
# Actual SQL executed: CREATE TABLE IF NOT EXISTS plg_abc123_settings (...)

# This is BLOCKED — attempting to access a core table:
await db.execute("SELECT * FROM core_users")
# Raises: DatabaseFenceError("Access to table 'core_users' is denied")

# This is BLOCKED — raw string interpolation:
await db.execute(f"SELECT * FROM settings WHERE key = '{user_input}'")
# Raises: DatabaseFenceError("Parameterized queries required")`}
      </CodeBlock>

      {/* ── Filesystem Fence ──────────────────────────────────── */}
      <Heading level={2} id="filesystem-fence">Filesystem Fence</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins with the <code>filesystem:own</code> permission can read and write files,
        but only within their dedicated sandbox directory. All file operations are routed
        through the SDK's filesystem API, which enforces path restrictions.
      </p>

      <PropsTable
        columns={['Rule', 'Enforcement', 'Example']}
        rows={[
          ['Sandbox root', '/data/plugins/{id}/', 'plg_abc123 -> /data/plugins/abc123/'],
          ['Path traversal blocked', 'Resolved path must start with sandbox root', '"../../etc/passwd" -> DENIED'],
          ['Symlink following blocked', 'Symlinks pointing outside sandbox are rejected', 'symlink to /etc -> DENIED'],
          ['Max file size', '50 MB per file', 'Write > 50 MB -> DENIED'],
          ['Max total storage', '500 MB per plugin', 'Cumulative write > 500 MB -> DENIED'],
          ['Allowed extensions', 'Configurable whitelist (.json, .txt, .csv, .png, ...)', '.exe, .sh, .py -> DENIED by default'],
          ['No executable permissions', 'chmod +x is blocked', 'Attempt to set exec bit -> DENIED'],
        ]}
      />

      <CodeBlock language="python" title="Filesystem Fence Enforcement">
{`from acp_plugin_sdk import FileSystem

fs = FileSystem()  # Scoped to /data/plugins/{plugin_id}/

# This works:
await fs.write("config/settings.json", '{"theme": "dark"}')
# Actual path: /data/plugins/abc123/config/settings.json

# This is BLOCKED — path traversal:
await fs.read("../../etc/passwd")
# Raises: FilesystemFenceError("Path traversal detected")

# This is BLOCKED — absolute path outside sandbox:
await fs.read("/etc/shadow")
# Raises: FilesystemFenceError("Absolute paths outside sandbox are denied")

# This is BLOCKED — symlink escape:
# Even if /data/plugins/abc123/escape -> /etc/
await fs.read("escape/passwd")
# Raises: FilesystemFenceError("Symlink target outside sandbox")`}
      </CodeBlock>

      <Callout type="warning" title="Filesystem Cleanup on Uninstall">
        When a plugin is uninstalled, its entire sandbox directory
        (<code>/data/plugins/{'{id}'}/</code>) is recursively deleted after a configurable
        grace period (default: 7 days). Admins can trigger immediate deletion from the
        Panel settings.
      </Callout>

      {/* ── Audit Trail ───────────────────────────────────────── */}
      <Heading level={2} id="audit-trail">Audit Trail</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every security-relevant action is recorded in a tamper-evident audit log. Logs are
        append-only and each entry includes a chained hash linking it to the previous entry,
        creating a verifiable chain of custody.
      </p>

      <Heading level={3} id="audit-log-structure">Audit Log Entry Structure</Heading>
      <CodeBlock language="json" title="Audit Log Entry">
{`{
  "id": "evt_20250115_000042_abc123",
  "timestamp": "2025-01-15T12:34:56.789Z",
  "plugin_id": "abc123",
  "plugin_version": "1.2.3",
  "event_type": "permission_check",
  "scope": "messages:read",
  "action": "allowed",
  "actor": {
    "type": "plugin_frontend",
    "user_id": "user_789",
    "session_id": "sess_456"
  },
  "details": {
    "endpoint": "/api/messages/channel/general",
    "method": "GET"
  },
  "prev_hash": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b...",
  "entry_hash": "sha256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e..."
}`}
      </CodeBlock>

      <Heading level={3} id="logged-events">Events That Are Logged</Heading>
      <PropsTable
        columns={['Event Category', 'Events', 'Severity']}
        rows={[
          ['Permission', 'permission_check (pass/fail), scope_escalation_attempt', 'Info / Critical'],
          ['Lifecycle', 'install, activate, disable, uninstall, update, error', 'Info'],
          ['Database', 'table_create, table_drop, query_execute, query_blocked', 'Info / Warning'],
          ['Filesystem', 'file_read, file_write, file_delete, path_traversal_blocked', 'Info / Critical'],
          ['Network', 'outbound_request, domain_blocked', 'Info / Warning'],
          ['Frontend', 'component_crash, sdk_call, rate_limit_exceeded', 'Warning / Critical'],
          ['Security', 'signature_verification_fail, hash_mismatch, import_blocked', 'Critical'],
          ['Admin', 'plugin_force_disabled, plugin_quarantined, audit_export', 'Warning'],
        ]}
      />

      <Heading level={3} id="tamper-evident-chain">Tamper-Evident Hash Chain</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Each log entry's <code>entry_hash</code> is computed as
        <code> SHA-256(prev_hash + timestamp + event_type + plugin_id + details_json)</code>.
        The <code>prev_hash</code> field points to the previous entry's hash, creating an
        unbreakable chain. If any entry is modified or deleted, the chain breaks and the
        tampering is immediately detectable. The chain root hash is periodically checkpointed
        to an external, immutable store.
      </p>

      {/* ── Market Review Security Checks ─────────────────────── */}
      <Heading level={2} id="market-review-checks">Market Review Security Checks</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Before a plugin is published on the ACP Market, it undergoes automated and manual
        security review. The following checks must all pass.
      </p>

      <PropsTable
        columns={['Check', 'Type', 'What It Verifies']}
        rows={[
          ['Static Analysis', 'Automated', 'No eval(), no dynamic imports, no blocked API usage, no hardcoded secrets'],
          ['Dependency Audit', 'Automated', 'All npm/pip dependencies scanned for known CVEs (via npm audit + safety)'],
          ['Permission Justification', 'Manual', 'Every requested scope has a documented reason in manifest.json'],
          ['Bundle Size Check', 'Automated', 'Frontend bundle under 2 MB, backend under 10 MB'],
          ['Import Whitelist Compliance', 'Automated', 'No imports outside the allowed module list'],
          ['Database Schema Review', 'Manual', 'All table schemas use proper types, indexes, and constraints'],
          ['Network Access Review', 'Manual', 'Outbound domains are justified, no data exfiltration patterns'],
          ['Content Security', 'Automated', 'No inline scripts, no data: URLs in HTML, CSP-compatible output'],
          ['License Compliance', 'Automated', 'All dependencies use compatible open-source licenses'],
          ['Reproducible Build', 'Automated', 'Bundle can be rebuilt from source with identical hash'],
        ]}
      />

      <Callout type="info" title="Review SLA">
        Automated checks complete within 5 minutes of submission. Manual review is targeted
        for completion within 48 hours. Plugins that fail automated checks are immediately
        rejected with detailed error reports.
      </Callout>

      {/* ── Incident Response ─────────────────────────────────── */}
      <Heading level={2} id="incident-response">Incident Response</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        When a security incident involving a plugin is detected, the platform follows a
        structured response process to contain and remediate the threat.
      </p>

      <Heading level={3} id="severity-levels">Severity Levels</Heading>
      <PropsTable
        columns={['Level', 'Description', 'Response Time', 'Example']}
        rows={[
          ['P0 — Critical', 'Active exploitation, data breach, or system compromise', '< 15 minutes', 'Plugin exfiltrating user data via network'],
          ['P1 — High', 'Exploitable vulnerability discovered, no active exploitation', '< 1 hour', 'Path traversal bypass in filesystem fence'],
          ['P2 — Medium', 'Security control bypass possible under specific conditions', '< 24 hours', 'Rate limiting bypass via concurrent requests'],
          ['P3 — Low', 'Minor security improvement, defense-in-depth enhancement', '< 1 week', 'Audit log missing a non-critical event type'],
        ]}
      />

      <Heading level={3} id="response-process">Response Process</Heading>
      <CodeBlock language="text" title="Incident Response Workflow">
{`1. DETECT
   - Automated: Audit log anomaly detection, health monitor alerts
   - Manual: User report, security researcher disclosure

2. CONTAIN
   - Immediately disable affected plugin on all connected Panels
   - Revoke plugin's Market signing key (if compromised)
   - Block plugin downloads from CDN
   - Preserve all audit logs for forensic analysis

3. INVESTIGATE
   - Analyze audit trail for scope of compromise
   - Review all actions taken by the plugin since last known-good state
   - Identify affected users and data
   - Determine root cause

4. REMEDIATE
   - Patch the vulnerability in the security layer
   - Issue security advisory to Panel administrators
   - If plugin is malicious: permanently ban developer account
   - If plugin is vulnerable: work with developer on fix

5. RECOVER
   - Publish patched plugin version (if remediated)
   - Re-enable on Panels after admin acknowledgment
   - Update security checks to detect similar issues
   - Publish post-mortem (for P0/P1 incidents)`}
      </CodeBlock>

      <Callout type="danger" title="Emergency Kill Switch">
        The ACP Market maintains an emergency kill switch that can remotely disable any
        plugin across all connected Panels within seconds. This is reserved for P0 incidents
        where immediate containment is critical. The kill switch requires two-person
        authorization from the Market security team.
      </Callout>
    </div>
  );
}
