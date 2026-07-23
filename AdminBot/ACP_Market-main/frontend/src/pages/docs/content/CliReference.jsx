import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function CliReference() {
  return (
    <div>
      <Heading level={1} id="cli-reference">@acp/cli Reference</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">@acp/cli</span> command-line
        tool is the primary developer interface for creating, developing, building, validating,
        and publishing ACP plugins. It scaffolds new projects, runs a hot-reload dev server,
        produces optimized production bundles, and handles marketplace publishing.
      </p>

      {/* ── Installation ─────────────────────────────────────── */}
      <Heading level={2} id="installation">Installation</Heading>
      <CodeBlock language="bash" title="Install globally">
{`npm install -g @acp/cli

# Verify installation
acp --version`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        You can also use <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">npx @acp/cli</span> to
        run commands without installing globally.
      </p>

      <Callout type="info" title="Requirements">
        The CLI requires Node.js 18+ and npm 9+. Python 3.11+ is required if your plugin
        includes a backend component.
      </Callout>

      {/* ── acp create-plugin ─────────────────────────────────── */}
      <Heading level={2} id="create-plugin">acp create-plugin &lt;name&gt;</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Scaffold a new plugin project with a complete directory structure, manifest file,
        and starter code. The interactive wizard guides you through initial configuration,
        or use flags to skip prompts.
      </p>
      <CodeBlock language="bash" title="Create a new plugin">
{`# Interactive mode
acp create-plugin my-awesome-plugin

# Non-interactive with all options
acp create-plugin my-awesome-plugin \\
  --template full-stack \\
  --id my-awesome-plugin \\
  --author "John Doe <john@example.com>" \\
  --dir ./plugins/my-awesome-plugin \\
  --yes`}
      </CodeBlock>
      <PropsTable
        columns={['Option', 'Type', 'Default', 'Description']}
        rows={[
          ['--template', 'string', '"full-stack"', 'Project template. Options: "frontend-only", "backend-only", "full-stack", "minimal".'],
          ['--id', 'string', 'derived from name', 'Plugin ID. Must match ^[a-z][a-z0-9-]{2,49}$. If omitted, derived from the project name.'],
          ['--author', 'string', 'from git config', 'Author name and optional email in the format "Name <email>".'],
          ['--dir', 'string', './<name>', 'Target directory for the generated project.'],
          ['--yes, -y', 'boolean', 'false', 'Skip all interactive prompts and accept defaults.'],
        ]}
      />

      <Heading level={3} id="templates">Available Templates</Heading>
      <PropsTable
        columns={['Template', 'Includes', 'Best For']}
        rows={[
          ['full-stack', 'Frontend (React + Vite) + Backend (Python + FastAPI) + Bot handlers + DB models', 'Most plugins. Complete frontend UI with API endpoints and bot commands.'],
          ['frontend-only', 'Frontend (React + Vite) only', 'Plugins that only add UI pages and consume the core Panel API without custom backend logic.'],
          ['backend-only', 'Backend (Python + FastAPI) + Bot handlers', 'Headless plugins that add bot commands, scheduled tasks, or API endpoints without a custom UI.'],
          ['minimal', 'Bare manifest.json and entry files', 'Experienced developers who want to set up their own project structure.'],
        ]}
      />

      <Heading level={3} id="scaffolded-structure">Scaffolded Structure (full-stack)</Heading>
      <CodeBlock language="text" title="Generated project structure">
{`my-awesome-plugin/
├── manifest.json              # Plugin manifest
├── package.json               # Node.js dependencies
├── vite.config.ts             # Vite + Module Federation config
├── tsconfig.json              # TypeScript configuration
├── requirements.txt           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── entry.tsx          # Module Federation entry point
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # Main plugin page
│   │   │   └── Settings.tsx   # Settings page
│   │   └── components/        # Shared components
│   └── public/                # Static assets
├── backend/
│   ├── plugin.py              # PluginBase subclass
│   ├── routes.py              # FastAPI routes
│   ├── handlers.py            # Bot handlers
│   └── models.py              # SQLAlchemy models
└── tests/
    ├── test_routes.py         # API route tests
    └── test_handlers.py       # Bot handler tests`}
      </CodeBlock>

      {/* ── acp dev ───────────────────────────────────────────── */}
      <Heading level={2} id="dev">acp dev</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Start a hot-reload development server. The dev server compiles the frontend with
        Vite HMR, runs the backend with auto-restart on file changes, and proxies API
        requests to the target ADMINCHAT Panel instance.
      </p>
      <CodeBlock language="bash" title="Start the dev server">
{`# Default: http://localhost:3000, proxy to http://localhost:8080
acp dev

# Custom port and Panel URL
acp dev --port 3001 --panel-url https://panel.example.com

# Don't open browser automatically
acp dev --no-browser`}
      </CodeBlock>
      <PropsTable
        columns={['Option', 'Type', 'Default', 'Description']}
        rows={[
          ['--port, -p', 'number', '3000', 'Port for the local dev server.'],
          ['--panel-url', 'string', '"http://localhost:8080"', 'URL of the ADMINCHAT Panel instance to proxy API requests to.'],
          ['--no-browser', 'boolean', 'false', 'Do not automatically open the browser on startup.'],
        ]}
      />

      <Callout type="info" title="Backend hot reload">
        The dev server watches <span className="font-mono text-xs">backend/</span> for Python
        file changes and automatically restarts the backend process. Frontend changes are
        applied instantly via Vite HMR without a full page reload.
      </Callout>

      {/* ── acp build ─────────────────────────────────────────── */}
      <Heading level={2} id="build">acp build</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Create a production-optimized bundle. The build step compiles the frontend with
        tree-shaking and minification, copies the backend source, and packages everything
        into a <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">.acp</span> archive
        ready for publishing or manual installation.
      </p>
      <CodeBlock language="bash" title="Build for production">
{`# Default build
acp build

# Custom output directory
acp build --out-dir ./release

# Build without minification (for debugging)
acp build --no-minify

# Build with bundle analysis
acp build --analyze`}
      </CodeBlock>
      <PropsTable
        columns={['Option', 'Type', 'Default', 'Description']}
        rows={[
          ['--out-dir, -o', 'string', '"./dist"', 'Output directory for the built bundle.'],
          ['--minify', 'boolean', 'true', 'Minify the frontend bundle. Use --no-minify to disable.'],
          ['--analyze', 'boolean', 'false', 'Generate a bundle analysis report (opens in browser).'],
        ]}
      />

      <Heading level={3} id="build-output">Build Output</Heading>
      <CodeBlock language="text" title="Build output structure">
{`dist/
├── my-plugin.acp              # Distributable archive
├── frontend/
│   ├── remoteEntry.js         # Module Federation entry
│   ├── assets/                # Hashed JS/CSS chunks
│   └── index.html             # Dev fallback (not used in production)
├── backend/
│   ├── plugin.py
│   ├── routes.py
│   ├── handlers.py
│   └── models.py
└── manifest.json`}
      </CodeBlock>

      {/* ── acp validate ──────────────────────────────────────── */}
      <Heading level={2} id="validate">acp validate</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Validate the plugin's manifest and bundle structure against the ACP specification.
        This runs the same checks that the marketplace review pipeline performs, so you
        can catch issues before publishing.
      </p>
      <CodeBlock language="bash" title="Validate the plugin">
{`# Validate the current project
acp validate

# Validate a built archive
acp validate ./dist/my-plugin.acp`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The validator checks for:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>Valid <span className="font-mono text-xs">manifest.json</span> schema and required fields</li>
        <li>Plugin ID format compliance</li>
        <li>Version string is valid semver</li>
        <li>All declared capabilities have matching implementations</li>
        <li>Frontend bundle contains a valid <span className="font-mono text-xs">remoteEntry.js</span></li>
        <li>Backend entry point is importable</li>
        <li>No disallowed system imports or file access patterns</li>
        <li>Bundle size is within limits (frontend: 5 MB, backend: 10 MB, total: 20 MB)</li>
        <li>Required permissions are declared for used capabilities</li>
      </ul>

      <Callout type="warning" title="Run before every publish">
        Always run <span className="font-mono text-xs">acp validate</span> before publishing.
        The marketplace will reject submissions that fail validation, and each failed submission
        counts toward your daily rate limit.
      </Callout>

      {/* ── acp publish ───────────────────────────────────────── */}
      <Heading level={2} id="publish">acp publish</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Publish the plugin to ACP Market. Requires authentication via{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">acp login</span>.
        The command builds the project (if not already built), validates it, and uploads the
        archive to the marketplace.
      </p>
      <CodeBlock language="bash" title="Publish to the marketplace">
{`# Publish to the default (stable) channel
acp publish

# Publish to the beta channel
acp publish --channel beta

# Dry run — validate and show what would be uploaded
acp publish --dry-run`}
      </CodeBlock>
      <PropsTable
        columns={['Option', 'Type', 'Default', 'Description']}
        rows={[
          ['--channel', 'string', '"stable"', 'Release channel. Options: "stable", "beta", "alpha". Beta and alpha versions are only visible to users who opt in.'],
          ['--dry-run', 'boolean', 'false', 'Perform all checks and show the upload payload without actually publishing.'],
        ]}
      />

      <Heading level={3} id="publish-flow">Publishing Flow</Heading>
      <ol className="text-sm text-text-secondary leading-relaxed mb-4 list-decimal list-inside space-y-1.5 ml-2">
        <li>The CLI runs <span className="font-mono text-xs">acp build</span> if the dist directory is missing or stale.</li>
        <li>The CLI runs <span className="font-mono text-xs">acp validate</span> on the built archive.</li>
        <li>The archive is uploaded to ACP Market with your authentication token.</li>
        <li>The marketplace runs automated security and compatibility scans.</li>
        <li>If the plugin is new, it enters the review queue. Updates to existing plugins are published immediately unless flagged.</li>
        <li>You receive a confirmation with the marketplace URL for your plugin.</li>
      </ol>

      <Callout type="danger" title="Version uniqueness">
        Each version can only be published once. If you need to fix an issue with a published
        version, bump the patch version and publish again. The marketplace does not allow
        overwriting existing versions.
      </Callout>

      {/* ── acp login / logout ────────────────────────────────── */}
      <Heading level={2} id="login-logout">acp login / logout</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Authenticate with ACP Market to enable publishing and marketplace management commands.
      </p>
      <CodeBlock language="bash" title="Authentication">
{`# Login — opens browser for OAuth flow
acp login

# Login with a token directly (CI/CD)
acp login --token <your-api-token>

# Check current auth status
acp login --status

# Logout — removes stored credentials
acp logout`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Credentials are stored in{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">~/.acp/credentials.json</span> with
        restricted file permissions (0600). The token is also used for{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">acp publish</span> and
        marketplace management APIs.
      </p>

      {/* ── acp config ────────────────────────────────────────── */}
      <Heading level={2} id="config">acp config</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Get or set CLI configuration values. Configuration is stored in{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">~/.acp/config.json</span>.
      </p>
      <CodeBlock language="bash" title="Config commands">
{`# List all config values
acp config list

# Get a specific value
acp config get registry

# Set a value
acp config set registry https://market.adminchat.com/api

# Reset a value to default
acp config reset registry`}
      </CodeBlock>
      <PropsTable
        columns={['Key', 'Default', 'Description']}
        rows={[
          ['registry', '"https://market.adminchat.com/api"', 'ACP Market API endpoint for publishing and authentication.'],
          ['defaultTemplate', '"full-stack"', 'Default template used by acp create-plugin when --template is omitted.'],
          ['analytics', 'true', 'Whether to send anonymous usage analytics to help improve the CLI.'],
          ['editor', '"code"', 'Preferred editor for acp create-plugin to open after scaffolding. Options: "code", "cursor", "webstorm", "none".'],
        ]}
      />

      {/* ── Global Options ────────────────────────────────────── */}
      <Heading level={2} id="global-options">Global Options</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following options are available on every command:
      </p>
      <PropsTable
        columns={['Option', 'Short', 'Description']}
        rows={[
          ['--help', '-h', 'Show help text for the command.'],
          ['--version', '-V', 'Print the CLI version number.'],
          ['--verbose', '-v', 'Enable verbose output with debug-level logging. Useful for troubleshooting.'],
          ['--config', '-c', 'Path to a custom config file. Overrides the default ~/.acp/config.json location.'],
        ]}
      />

      {/* ── Configuration File ────────────────────────────────── */}
      <Heading level={2} id="config-file">Configuration File</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The CLI stores its configuration at{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">~/.acp/config.json</span>.
        You can edit this file directly or use the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">acp config</span> command.
      </p>
      <CodeBlock language="json" title="~/.acp/config.json">
{`{
  "registry": "https://market.adminchat.com/api",
  "defaultTemplate": "full-stack",
  "analytics": true,
  "editor": "code"
}`}
      </CodeBlock>

      <Callout type="info" title="Environment variables">
        All config values can also be set via environment variables with the{' '}
        <span className="font-mono text-xs">ACP_</span> prefix. For example:{' '}
        <span className="font-mono text-xs">ACP_REGISTRY=https://custom.registry.com</span>.
        Environment variables take precedence over the config file.
      </Callout>

      {/* ── CI/CD Integration ─────────────────────────────────── */}
      <Heading level={2} id="ci-cd">CI/CD Integration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The CLI is designed to work in headless CI/CD environments. Use token-based
        authentication and the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">--yes</span> flag
        to skip interactive prompts.
      </p>
      <CodeBlock language="yaml" title="GitHub Actions example">
{`name: Publish Plugin
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - run: npm install -g @acp/cli

      - run: acp login --token \${{ secrets.ACP_MARKET_TOKEN }}

      - run: acp build

      - run: acp validate

      - run: acp publish --channel stable`}
      </CodeBlock>
    </div>
  );
}