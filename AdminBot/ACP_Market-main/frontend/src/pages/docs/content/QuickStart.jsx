import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function QuickStart() {
  return (
    <div>
      <Heading level={1} id="quick-start">Developer Quick Start</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        This guide walks you through building and publishing your first ADMINCHAT Panel plugin
        using the ACP Plugin SDK. By the end, you will have a working plugin running on a local
        dev server and know how to publish it to ACP Market.
      </p>

      {/* ── Prerequisites ──────────────────────────────────────── */}
      <Heading level={2} id="prerequisites">Prerequisites</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Before you begin, make sure you have the following installed and configured on your
        development machine:
      </p>
      <PropsTable
        columns={['Requirement', 'Minimum Version', 'Notes']}
        rows={[
          ['Node.js', '18.0+', 'LTS recommended. Used for the CLI and build toolchain.'],
          ['Python', '3.12+', 'Required for backend plugin development and the dev server.'],
          ['ADMINCHAT Panel', '0.8.0+', 'A running instance for testing. Local dev mode is supported.'],
          ['npm or pnpm', 'Latest', 'Package manager for installing the ACP CLI.'],
          ['Git', '2.30+', 'Version control for your plugin project.'],
        ]}
      />

      <Callout type="info" title="Panel Dev Mode">
        If you do not have a full ADMINCHAT Panel installation, you can run the Panel in
        development mode with <span className="font-mono">acp panel --dev</span> which starts
        a lightweight local instance for plugin testing.
      </Callout>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
      <Heading level={2} id="step-1">Step 1: Install the ACP CLI</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP CLI is the primary tool for creating, developing, building, and publishing
        plugins. Install it globally using npm:
      </p>
      <CodeBlock language="bash" title="Install globally">
        {`npm install -g @acp/cli`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Verify the installation by checking the version:
      </p>
      <CodeBlock language="bash" title="Verify installation">
        {`acp --version\n# Expected output: @acp/cli v1.x.x`}
      </CodeBlock>

      <Callout type="warning" title="Permissions">
        On macOS and Linux, you may need to use <span className="font-mono">sudo</span> for
        global installs, or configure npm to use a user-level directory. See the{' '}
        <a href="https://docs.npmjs.com/resolving-eacces-permissions-errors" className="text-primary hover:underline">npm docs</a> for details.
      </Callout>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
      <Heading level={2} id="step-2">Step 2: Create a New Plugin</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Use the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">acp create-plugin</span> command
        to scaffold a new plugin project. The CLI will walk you through an interactive setup:
      </p>
      <CodeBlock language="bash" title="Scaffold a plugin">
        {`acp create-plugin hello-world`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The interactive prompt will ask you to configure the following:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li><span className="font-medium text-text-primary">Plugin Name</span> — Human-readable display name (e.g. "Hello World")</li>
        <li><span className="font-medium text-text-primary">Description</span> — A short summary of what the plugin does</li>
        <li><span className="font-medium text-text-primary">Category</span> — Select from available categories (bot-handlers, utilities, etc.)</li>
        <li><span className="font-medium text-text-primary">Capabilities</span> — Choose which capabilities your plugin needs (bot_handlers, api_routes, frontend_pages, etc.)</li>
        <li><span className="font-medium text-text-primary">Template</span> — Start from a blank template or choose a starter (e.g. "bot-command", "settings-page", "full-stack")</li>
      </ul>
      <CodeBlock language="text" title="CLI output">
        {`✔ Plugin ID: hello-world
✔ Plugin Name: Hello World
✔ Description: A simple hello world plugin for ADMINCHAT Panel.
✔ Category: utilities
✔ Capabilities: bot_handlers, settings_panel
✔ Template: bot-command

⏳ Scaffolding plugin...
✅ Plugin created at ./hello-world

Next steps:
  cd hello-world
  acp dev`}
      </CodeBlock>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
      <Heading level={2} id="step-3">Step 3: Project Structure</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The scaffolded project follows a standardized structure that the ACP build system
        and Panel runtime both understand:
      </p>
      <CodeBlock language="text" title="Project layout">
        {`hello-world/
├── manifest.json          # Plugin metadata and configuration (see Manifest Reference)
├── package.json           # Node.js dependencies and scripts
├── requirements.txt       # Python dependencies (if using backend handlers)
│
├── backend/
│   ├── __init__.py
│   ├── handlers.py        # Bot command and event handlers
│   ├── routes.py          # Custom API route definitions
│   └── tasks.py           # Scheduled task definitions
│
├── frontend/
│   ├── index.jsx          # Frontend page entry point
│   ├── settings.jsx       # Settings panel UI
│   └── components/        # Shared React components
│       └── ...
│
├── assets/
│   ├── icon.png           # Plugin icon (256x256, displayed in marketplace)
│   └── screenshots/       # Marketplace listing screenshots
│       └── ...
│
└── tests/
    ├── test_handlers.py   # Backend unit tests
    └── test_routes.py     # API route tests`}
      </CodeBlock>

      <Heading level={3} id="key-files">Key Files</Heading>
      <PropsTable
        columns={['File', 'Purpose']}
        rows={[
          ['manifest.json', 'Declares plugin identity, capabilities, permissions, and configuration. This is the most important file in your plugin.'],
          ['backend/handlers.py', 'Define bot command handlers and event listeners. Each handler is a decorated async function.'],
          ['backend/routes.py', 'Define custom API routes exposed by your plugin under /api/plugins/<id>/.'],
          ['frontend/index.jsx', 'Main React component rendered as a page in the Panel UI.'],
          ['frontend/settings.jsx', 'React component for the plugin settings panel accessible from the admin dashboard.'],
          ['assets/icon.png', 'Plugin icon shown on marketplace cards and in the Panel sidebar. Must be 256x256 PNG.'],
        ]}
      />

      {/* ── Step 4 ─────────────────────────────────────────────── */}
      <Heading level={2} id="step-4">Step 4: Start the Dev Server</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP dev server provides hot-reloading for both backend and frontend code, letting
        you iterate quickly without rebuilding.
      </p>
      <CodeBlock language="bash" title="Start development server">
        {`cd hello-world\nacp dev`}
      </CodeBlock>
      <CodeBlock language="text" title="Dev server output">
        {`🚀 ACP Dev Server v1.2.0
   Plugin:    hello-world (v0.1.0)
   Panel:     http://localhost:8080 (connected)
   Backend:   http://localhost:9100/api/plugins/hello-world
   Frontend:  http://localhost:9100/plugins/hello-world
   Hot Reload: enabled

   Watching for changes...`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The dev server connects to your local ADMINCHAT Panel instance and registers the
        plugin in development mode. You can now:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>Edit backend handlers and see changes reflected immediately</li>
        <li>Modify frontend components with instant hot-module replacement</li>
        <li>Test bot commands by sending messages in the Panel chat interface</li>
        <li>Access the plugin settings panel from the admin dashboard</li>
        <li>View real-time logs in the terminal for debugging</li>
      </ul>

      <Callout type="info" title="Dev Server Options">
        Use <span className="font-mono">acp dev --port 9200</span> to change the dev server
        port, or <span className="font-mono">acp dev --panel http://remote:8080</span> to
        connect to a remote Panel instance.
      </Callout>

      {/* ── Step 5 ─────────────────────────────────────────────── */}
      <Heading level={2} id="step-5">Step 5: Build &amp; Publish</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        When your plugin is ready for distribution, build the production bundle and publish
        it to ACP Market.
      </p>

      <Heading level={3} id="building">Building the Bundle</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The build command validates your manifest, compiles frontend assets, packages backend
        code, and creates a distributable .acp.zip archive:
      </p>
      <CodeBlock language="bash" title="Build the plugin">
        {`acp build`}
      </CodeBlock>
      <CodeBlock language="text" title="Build output">
        {`📦 Building hello-world v0.1.0...
   ✔ Manifest validated
   ✔ Backend packaged (2 handlers, 1 route, 0 tasks)
   ✔ Frontend compiled (index: 45KB, settings: 12KB)
   ✔ Assets included (icon.png, 2 screenshots)
   ✔ Bundle created: dist/hello-world-0.1.0.acp.zip (128 KB)

Build complete!`}
      </CodeBlock>

      <Callout type="warning" title="Pre-publish Checklist">
        Before publishing, make sure you have updated the version in manifest.json, written
        a meaningful description, included at least one screenshot, and tested the plugin
        on a clean Panel installation.
      </Callout>

      <Heading level={3} id="publishing">Publishing to ACP Market</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Authenticate with your ACP Market developer account, then publish:
      </p>
      <CodeBlock language="bash" title="Authenticate and publish">
        {`# First-time setup: authenticate with ACP Market\nacp auth login\n\n# Publish the built bundle\nacp publish`}
      </CodeBlock>
      <CodeBlock language="text" title="Publish output">
        {`🔐 Authenticated as coredev (developer account)
📤 Uploading hello-world v0.1.0...
   ✔ Bundle uploaded (128 KB)
   ✔ Metadata validated
   ✔ Submitted for review

🎉 Plugin submitted! Expected review time: 24-48 hours.
   Track status: https://market.adminchat.dev/dashboard/submissions/hello-world`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Your plugin will be reviewed by the ACP Market team to ensure it meets quality and
        security guidelines. You will receive an email notification when it is approved or if
        changes are requested.
      </p>

      {/* ── Next Steps ─────────────────────────────────────────── */}
      <Heading level={2} id="next-steps">Next Steps</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Now that you have built your first plugin, explore these resources to go further:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>
          <a href="#/docs/plugin-manifest" className="text-primary hover:underline font-medium">Plugin Manifest Reference</a>
          {' '}&mdash; Deep dive into all manifest.json fields, capabilities, and permission scopes.
        </li>
        <li>
          <a href="#/docs/api-reference" className="text-primary hover:underline font-medium">API Reference</a>
          {' '}&mdash; Interact with ACP Market programmatically for automation and CI/CD.
        </li>
        <li>
          <a href="#/docs/getting-started" className="text-primary hover:underline font-medium">Getting Started Guide</a>
          {' '}&mdash; Learn about plugin discovery, installation, and management from the user perspective.
        </li>
      </ul>

      <Callout type="info" title="Version Updates">
        To publish an update, increment the version in manifest.json, run{' '}
        <span className="font-mono">acp build</span> and <span className="font-mono">acp publish</span> again.
        The CLI detects existing plugins and submits a new version automatically.
      </Callout>
    </div>
  );
}
