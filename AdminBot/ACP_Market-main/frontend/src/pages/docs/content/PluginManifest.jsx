import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function PluginManifest() {
  return (
    <div>
      <Heading level={1} id="plugin-manifest">Plugin Manifest Reference</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every ACP plugin must include a <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">manifest.json</span> file
        at the root of the project. The manifest declares the plugin's identity, capabilities,
        permissions, and runtime configuration. It is the single source of truth for the ACP
        build system, the marketplace review pipeline, and the ADMINCHAT Panel plugin runtime.
      </p>

      {/* ── Overview ───────────────────────────────────────────── */}
      <Heading level={2} id="overview">Overview</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The manifest follows three core design principles:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>
          <span className="font-medium text-text-primary">Declarative</span> — The manifest
          describes what the plugin is and what it needs, not how it works internally. The
          Panel runtime uses this declaration to wire up handlers, routes, and UI at load time.
        </li>
        <li>
          <span className="font-medium text-text-primary">Least Privilege</span> — Plugins
          must explicitly declare every capability and permission they require. The Panel
          enforces these declarations at runtime and refuses undeclared actions.
        </li>
        <li>
          <span className="font-medium text-text-primary">Immutable Identity</span> — The
          plugin <span className="font-mono">id</span> is permanent once published. It cannot
          be changed or reassigned, ensuring stable dependency resolution and update chains.
        </li>
      </ul>

      {/* ── Required Fields ────────────────────────────────────── */}
      <Heading level={2} id="required-fields">Required Fields</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        The following fields must be present in every manifest.json:
      </p>
      <PropsTable
        columns={['Field', 'Type', 'Description']}
        rows={[
          ['id', 'string', 'Unique plugin identifier. Must match pattern: ^[a-z][a-z0-9-]{2,49}$'],
          ['name', 'string', 'Human-readable display name (3-60 characters).'],
          ['version', 'string', 'Semantic version (e.g. "1.0.0"). Must follow semver spec.'],
          ['description', 'string', 'Short plugin summary (10-200 characters).'],
          ['min_panel_version', 'string', 'Minimum compatible ADMINCHAT Panel version (semver).'],
          ['capabilities', 'string[]', 'Array of capability identifiers the plugin uses.'],
          ['permissions', 'object', 'Permission scopes the plugin requires at runtime.'],
        ]}
      />

      {/* ── Identity Fields ────────────────────────────────────── */}
      <Heading level={2} id="identity">Identity Fields</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Identity fields uniquely identify and describe the plugin in the marketplace and
        within the Panel.
      </p>

      <Heading level={3} id="id-field">id</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        The plugin identifier is a permanent, globally unique string used as the primary key
        across the marketplace and Panel. It is used in URLs, API paths, filesystem locations,
        and dependency resolution.
      </p>
      <PropsTable
        columns={['Rule', 'Detail']}
        rows={[
          ['Pattern', '^[a-z][a-z0-9-]{2,49}$'],
          ['Length', '3 to 50 characters'],
          ['Allowed Characters', 'Lowercase letters (a-z), digits (0-9), hyphens (-)'],
          ['Must Start With', 'A lowercase letter'],
          ['Cannot End With', 'A hyphen'],
          ['Immutable', 'Cannot be changed after first publish'],
        ]}
      />
      <CodeBlock language="json" title="Valid IDs">
        {`"id": "hello-world"
"id": "auto-moderator"
"id": "analytics-dashboard-v2"
"id": "my-plugin-123"`}
      </CodeBlock>

      <Heading level={3} id="name-field">name</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The display name shown in the marketplace listing and the Panel sidebar. Must be between
        3 and 60 characters. Unlike the id, the name can be changed between versions.
      </p>

      <Heading level={3} id="version-field">version</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Must follow the <a href="https://semver.org" className="text-primary hover:underline">Semantic Versioning 2.0.0</a> specification.
        Each new marketplace submission must have a version strictly greater than all previously
        published versions. Pre-release suffixes (e.g. <span className="font-mono">1.0.0-beta.1</span>) are supported
        but will be flagged as pre-release in the marketplace.
      </p>

      <Heading level={3} id="description-field">description</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A concise summary displayed on marketplace cards and search results. Keep it between
        10 and 200 characters. For extended documentation, use
        the <span className="font-mono">long_description</span> field in the submission metadata.
      </p>

      <Heading level={3} id="min-panel-version">min_panel_version</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The minimum ADMINCHAT Panel version required to run this plugin. The marketplace uses
        this field to filter incompatible plugins, and the Panel runtime checks it before
        loading. Set this to the lowest Panel version you have tested against.
      </p>

      {/* ── Capabilities ───────────────────────────────────────── */}
      <Heading level={2} id="capabilities">Capabilities</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Capabilities declare which subsystems of the ADMINCHAT Panel your plugin integrates
        with. The Panel uses this list to determine how to load and wire up the plugin.
      </p>
      <PropsTable
        columns={['Capability', 'Description', 'Requires']}
        rows={[
          ['bot_handlers', 'Register command handlers and message processors for the chat bot engine.', 'backend/handlers.py'],
          ['api_routes', 'Expose custom REST API endpoints under /api/plugins/<id>/.', 'backend/routes.py'],
          ['frontend_pages', 'Render custom pages in the Panel web UI.', 'frontend/index.jsx'],
          ['settings_panel', 'Provide a settings UI accessible from the admin dashboard.', 'frontend/settings.jsx'],
          ['scheduled_tasks', 'Run periodic background tasks on a cron-like schedule.', 'backend/tasks.py'],
          ['event_listeners', 'Subscribe to Panel system events (user joins, message sent, etc.).', 'backend/handlers.py'],
        ]}
      />

      <CodeBlock language="json" title="Example capabilities">
        {`"capabilities": [
  "bot_handlers",
  "settings_panel",
  "event_listeners"
]`}
      </CodeBlock>

      <Callout type="info" title="Capability Validation">
        The build system verifies that the required files exist for each declared capability.
        Declaring <span className="font-mono">frontend_pages</span> without a{' '}
        <span className="font-mono">frontend/index.jsx</span> file will cause the build to fail.
      </Callout>

      {/* ── Permissions ────────────────────────────────────────── */}
      <Heading level={2} id="permissions">Permissions</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Permissions define the runtime access your plugin has to Panel APIs, the filesystem,
        and external network resources. The Panel enforces these permissions strictly — any
        undeclared access attempt will be blocked and logged.
      </p>

      <Heading level={3} id="core-api-scopes">core_api_scopes</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        An array of Panel API scopes the plugin is allowed to call. Scopes follow the
        pattern <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">resource:action</span>.
      </p>
      <PropsTable
        columns={['Scope', 'Description']}
        rows={[
          ['messages:read', 'Read message content and metadata from channels.'],
          ['messages:write', 'Send messages and reactions to channels.'],
          ['messages:delete', 'Delete messages in channels.'],
          ['users:read', 'Read user profiles, status, and presence.'],
          ['users:write', 'Modify user profiles and settings.'],
          ['channels:read', 'List and read channel metadata.'],
          ['channels:write', 'Create, modify, or archive channels.'],
          ['settings:read', 'Read Panel global settings.'],
          ['settings:write', 'Modify Panel global settings.'],
          ['files:read', 'Access uploaded files and attachments.'],
          ['files:write', 'Upload files and manage attachments.'],
          ['admin:read', 'Read admin-level data (audit logs, system info).'],
          ['admin:write', 'Perform admin actions (manage users, roles, etc.).'],
        ]}
      />

      <Heading level={3} id="filesystem-permissions">filesystem</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        An array of filesystem access declarations. Each entry specifies a virtual path
        and access mode.
      </p>
      <PropsTable
        columns={['Value', 'Description']}
        rows={[
          ['config:rw', 'Read/write access to the plugin\'s private configuration directory.'],
          ['config:r', 'Read-only access to the plugin\'s configuration directory.'],
          ['data:rw', 'Read/write access to the plugin\'s persistent data directory.'],
          ['data:r', 'Read-only access to the plugin\'s data directory.'],
          ['temp:rw', 'Read/write access to a temporary directory (cleared on restart).'],
          ['shared:r', 'Read-only access to the shared plugin data directory.'],
        ]}
      />

      <Heading level={3} id="network-permissions">network</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        An array of allowed external network hosts or patterns. If empty or omitted, the
        plugin has no outbound network access.
      </p>
      <PropsTable
        columns={['Pattern', 'Example', 'Description']}
        rows={[
          ['Exact host', '"api.openai.com"', 'Allow HTTPS connections to the specified host.'],
          ['Wildcard subdomain', '"*.github.com"', 'Allow connections to any subdomain.'],
          ['Host with port', '"redis.internal:6379"', 'Allow connections to a specific host and port.'],
          ['All (dangerous)', '"*"', 'Allow connections to any external host. Avoid if possible.'],
        ]}
      />

      <CodeBlock language="json" title="Example permissions">
        {`"permissions": {
  "core_api_scopes": [
    "messages:read",
    "messages:write",
    "users:read"
  ],
  "filesystem": [
    "config:rw",
    "data:rw"
  ],
  "network": [
    "api.openai.com",
    "*.githubusercontent.com"
  ]
}`}
      </CodeBlock>

      <Callout type="danger" title="Least Privilege Principle">
        Only request the permissions your plugin actually needs. Plugins with overly broad
        permissions are more likely to be rejected during marketplace review and may raise
        security warnings for users during installation.
      </Callout>

      {/* ── Backend / Frontend Config ──────────────────────────── */}
      <Heading level={2} id="backend-config">Backend Configuration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Optional backend-specific settings declared under the <span className="font-mono">backend</span> key:
      </p>
      <PropsTable
        columns={['Field', 'Type', 'Default', 'Description']}
        rows={[
          ['entry', 'string', '"backend/"', 'Path to the backend module directory.'],
          ['runtime', 'string', '"python3"', 'Runtime environment. Currently only "python3" is supported.'],
          ['install_deps', 'boolean', 'true', 'Whether to auto-install requirements.txt on plugin load.'],
          ['env', 'object', '{}', 'Static environment variables passed to the backend process.'],
        ]}
      />

      <Heading level={2} id="frontend-config">Frontend Configuration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Optional frontend-specific settings declared under the <span className="font-mono">frontend</span> key:
      </p>
      <PropsTable
        columns={['Field', 'Type', 'Default', 'Description']}
        rows={[
          ['entry', 'string', '"frontend/index.jsx"', 'Entry point for the main plugin page.'],
          ['settings_entry', 'string', '"frontend/settings.jsx"', 'Entry point for the settings panel.'],
          ['framework', 'string', '"react"', 'Frontend framework. Currently only "react" is supported.'],
          ['assets', 'string[]', '[]', 'Additional static assets to include in the bundle.'],
        ]}
      />

      {/* ── Complete Example ───────────────────────────────────── */}
      <Heading level={2} id="complete-example">Complete Example</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Below is a complete manifest.json for a moderator plugin that uses bot handlers,
        a settings panel, event listeners, and external API access:
      </p>
      <CodeBlock language="json" title="manifest.json">
        {`{
  "id": "auto-moderator",
  "name": "Auto Moderator",
  "version": "2.1.0",
  "description": "Automated chat moderation with customizable rules and filters.",
  "min_panel_version": "0.8.0",

  "capabilities": [
    "bot_handlers",
    "settings_panel",
    "event_listeners",
    "scheduled_tasks"
  ],

  "permissions": {
    "core_api_scopes": [
      "messages:read",
      "messages:write",
      "messages:delete",
      "users:read",
      "channels:read"
    ],
    "filesystem": [
      "config:rw",
      "data:rw"
    ],
    "network": [
      "api.openai.com"
    ]
  },

  "backend": {
    "entry": "backend/",
    "runtime": "python3",
    "install_deps": true,
    "env": {
      "LOG_LEVEL": "info"
    }
  },

  "frontend": {
    "entry": "frontend/index.jsx",
    "settings_entry": "frontend/settings.jsx",
    "framework": "react",
    "assets": [
      "assets/icon.png"
    ]
  },

  "metadata": {
    "author": "coredev",
    "license": "MIT",
    "homepage": "https://github.com/coredev/auto-moderator",
    "support": "https://github.com/coredev/auto-moderator/issues",
    "tags": ["moderation", "filter", "automation", "safety"]
  }
}`}
      </CodeBlock>

      {/* ── Validation Rules ──────────────────────────────────── */}
      <Heading level={2} id="validation">Validation Rules</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP build system and marketplace review pipeline enforce the following validation
        rules on every manifest.json. A plugin will fail to build or be rejected from the
        marketplace if any rule is violated.
      </p>

      <Heading level={3} id="identity-rules">Identity Validation</Heading>
      <PropsTable
        columns={['Rule', 'Enforced By']}
        rows={[
          ['id must match ^[a-z][a-z0-9-]{2,49}$ and not end with a hyphen', 'Build + Marketplace'],
          ['id must be unique across the entire marketplace', 'Marketplace'],
          ['id cannot be changed after first publish', 'Marketplace'],
          ['name must be 3-60 characters', 'Build + Marketplace'],
          ['version must be valid semver', 'Build + Marketplace'],
          ['version must be strictly greater than all published versions', 'Marketplace'],
          ['description must be 10-200 characters', 'Build + Marketplace'],
          ['min_panel_version must be valid semver', 'Build'],
        ]}
      />

      <Heading level={3} id="capability-rules">Capability Validation</Heading>
      <PropsTable
        columns={['Rule', 'Enforced By']}
        rows={[
          ['capabilities must be a non-empty array', 'Build'],
          ['Each capability must be a recognized identifier', 'Build'],
          ['Required files must exist for each declared capability', 'Build'],
          ['No duplicate entries in the capabilities array', 'Build'],
        ]}
      />

      <Heading level={3} id="permission-rules">Permission Validation</Heading>
      <PropsTable
        columns={['Rule', 'Enforced By']}
        rows={[
          ['core_api_scopes must use recognized resource:action patterns', 'Build + Marketplace'],
          ['filesystem entries must use recognized path:mode patterns', 'Build'],
          ['network patterns must be valid hostnames, optionally with wildcards or ports', 'Build + Marketplace'],
          ['Wildcard network ("*") triggers a manual security review', 'Marketplace'],
          ['admin:write scope triggers elevated review', 'Marketplace'],
        ]}
      />

      <Heading level={3} id="structural-rules">Structural Validation</Heading>
      <PropsTable
        columns={['Rule', 'Enforced By']}
        rows={[
          ['manifest.json must be valid JSON', 'Build'],
          ['All required fields must be present', 'Build'],
          ['No unknown top-level fields (warns but does not fail)', 'Build'],
          ['Backend entry path must point to an existing directory', 'Build'],
          ['Frontend entry paths must point to existing files', 'Build'],
          ['Bundle size must not exceed 50 MB', 'Build + Marketplace'],
          ['Icon file (assets/icon.png) must be exactly 256x256 pixels', 'Marketplace'],
        ]}
      />

      <Callout type="info" title="Validation CLI Command">
        You can validate your manifest at any time without building by running{' '}
        <span className="font-mono">acp validate</span>. This checks all build-time rules
        and reports any issues with line-level detail.
      </Callout>
    </div>
  );
}
