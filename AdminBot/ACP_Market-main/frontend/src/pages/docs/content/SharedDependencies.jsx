import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function SharedDependencies() {
  return (
    <div>
      <Heading level={1} id="shared-dependencies">Shared Dependencies Contract</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins run inside the ADMINCHAT Panel and share a set of core dependencies with the
        host application. This document specifies exactly which packages are shared (singleton),
        which are available but independently bundled (non-singleton), and which must never be
        included because the Panel already provides their functionality. Following these rules
        ensures plugins are lightweight, compatible, and free of version conflicts.
      </p>

      {/* ── Singleton Dependencies ────────────────────────────── */}
      <Heading level={2} id="singleton-deps">Singleton Dependencies</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Singleton dependencies are packages that <strong className="text-text-primary">must have exactly one instance</strong> in
        the runtime. They are provided by the Panel and shared with all plugins via Module
        Federation. Plugins must <strong className="text-text-primary">never</strong> bundle their own copy of these packages — doing
        so will cause runtime errors (e.g., multiple React instances, broken context).
      </p>

      <PropsTable
        columns={['Package', 'Shared Version', 'Why Singleton', 'What Breaks If Duplicated']}
        rows={[
          ['react', '18.x', 'Single virtual DOM reconciler required', 'Hooks throw "Invalid hook call", context breaks, state lost'],
          ['react-dom', '18.x', 'Must match React instance, single root', 'Hydration mismatches, event system conflicts'],
          ['react-router-dom', '6.x', 'Shared routing context for Panel navigation', 'Plugin links break, navigation state lost, URL sync fails'],
          ['@tanstack/react-query', '5.x', 'Shared query cache, deduplication, devtools', 'Cache fragmentation, duplicate network requests, memory leaks'],
          ['@acp/plugin-sdk', 'Matches Panel version', 'Bridge to Panel internals, permission enforcement', 'SDK hooks fail, permission checks bypassed, undefined behavior'],
        ]}
      />

      <CodeBlock language="json" title="Plugin package.json — Singleton packages as peerDependencies">
{`{
  "name": "@acp/my-plugin",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@acp/plugin-sdk": "*"
  },
  "devDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.17.0",
    "@acp/plugin-sdk": "^1.0.0"
  }
}`}
      </CodeBlock>

      <Callout type="danger" title="Never Bundle Singletons">
        If a singleton package appears in your <code>dependencies</code> (not
        <code> peerDependencies</code>), the build pipeline will reject your bundle. Move
        them to <code>peerDependencies</code> and <code>devDependencies</code> only.
      </Callout>

      {/* ── Non-Singleton Dependencies ────────────────────────── */}
      <Heading level={2} id="non-singleton-deps">Non-Singleton Dependencies</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Non-singleton dependencies are packages that the Panel uses internally but can
        safely coexist with different versions in plugin bundles. The Panel exposes these
        via Module Federation as optional shares — if the plugin's version is compatible,
        the shared instance is reused; otherwise, the plugin's own copy loads.
      </p>

      <PropsTable
        columns={['Package', 'Panel Version', 'Plugin Can Bundle Own?', 'Recommended Strategy']}
        rows={[
          ['zustand', '4.x', 'Yes', 'Use Panel\'s version (lighter bundle). Each plugin gets its own store scope anyway.'],
          ['lucide-react', '0.300+', 'Yes', 'Use Panel\'s version. Tree-shaking ensures only used icons are loaded.'],
          ['clsx', '2.x', 'Yes', 'Use Panel\'s version (tiny package, no benefit to bundling separately).'],
          ['date-fns', '3.x', 'Yes', 'Use Panel\'s version. Tree-shakeable, no singleton concerns.'],
          ['zod', '3.x', 'Yes', 'Use Panel\'s version. Schema validation is stateless, safe to share.'],
        ]}
      />

      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        To use the Panel's shared version, list these as <code>peerDependencies</code> with
        the compatible range. To use your own version, list them in regular
        <code> dependencies</code>. The Module Federation runtime handles the resolution.
      </p>

      {/* ── Not Shared Packages ───────────────────────────────── */}
      <Heading level={2} id="not-shared">Not Shared Packages</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following packages are <strong className="text-text-primary">not shared</strong> by the Panel. If your plugin needs
        them, you must bundle them yourself. They count toward your bundle size budget.
      </p>

      <PropsTable
        columns={['Package', 'Why Not Shared', 'Bundle Impact', 'Alternative']}
        rows={[
          ['axios', 'Panel uses native fetch; axios adds 30 KB', '~30 KB gzipped', 'Use native fetch or the SDK\'s built-in HTTP helper'],
          ['lodash', 'Large footprint, tree-shaking is unreliable', '~70 KB gzipped (full)', 'Use lodash-es with specific imports, or native JS alternatives'],
          ['framer-motion', 'Heavy animation library, not universally needed', '~120 KB gzipped', 'Use CSS transitions/animations or the Panel\'s built-in motion tokens'],
          ['recharts', 'Complex charting library, not universally needed', '~150 KB gzipped', 'Bundle if needed; consider lightweight alternatives like chart.css'],
          ['chart.js', 'Canvas-based charting, not universally needed', '~80 KB gzipped', 'Bundle if needed; recharts and chart.js cannot both be shared'],
          ['moment / moment-timezone', 'Deprecated in favor of date-fns; very large', '~230 KB gzipped', 'Use date-fns (shared) or Temporal API'],
          ['styled-components', 'Runtime CSS-in-JS conflicts with Panel\'s approach', '~35 KB gzipped', 'Use CSS Modules or Tailwind utility classes'],
        ]}
      />

      <Callout type="warning" title="Bundle Size Budget">
        Each plugin's frontend bundle must stay under <strong>2 MB</strong> (gzipped). Not-shared
        packages count toward this limit. Run <code>acp plugin analyze</code> to check your
        bundle composition before submitting.
      </Callout>

      {/* ── Version Compatibility Matrix ──────────────────────── */}
      <Heading level={2} id="compatibility-matrix">Version Compatibility Matrix</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following matrix shows which versions of the core shared dependencies are
        compatible with each Panel release. Plugin developers must ensure their
        <code> peerDependencies</code> ranges align with the Panel version they target.
      </p>

      <PropsTable
        columns={['Panel Version', 'SDK Version', 'React', 'React Router', 'TanStack Query', 'Node.js']}
        rows={[
          ['0.1.x', '1.0.x', '18.2.x', '6.20+', '5.17+', '20.x LTS'],
          ['0.2.x', '1.1.x', '18.3.x', '6.22+', '5.28+', '20.x LTS'],
          ['0.3.x (planned)', '1.2.x', '18.3.x or 19.x', '6.24+ or 7.x', '5.40+', '22.x LTS'],
          ['1.0.x (future)', '2.0.x', '19.x', '7.x', '6.x', '22.x LTS'],
        ]}
      />

      {/* ── Plugin Manifest Version Constraints ───────────────── */}
      <Heading level={2} id="manifest-constraints">Plugin Manifest Version Constraints</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins declare their Panel compatibility in <code>manifest.json</code> using the
        <code> min_panel_version</code> and <code>max_panel_version</code> fields. The Panel
        checks these constraints before installation and refuses to install incompatible
        plugins.
      </p>

      <CodeBlock language="json" title="manifest.json — Version Constraints">
{`{
  "id": "my-weather-widget",
  "version": "2.1.0",
  "compatibility": {
    "min_panel_version": "0.1.0",
    "max_panel_version": "0.3.x",
    "sdk_version": "^1.0.0",
    "node_version": ">=20.0.0"
  }
}`}
      </CodeBlock>

      <PropsTable
        columns={['Field', 'Format', 'Required', 'Description']}
        rows={[
          ['min_panel_version', 'Semver (e.g., "0.1.0")', 'Yes', 'Oldest Panel version the plugin supports. Installation blocked if Panel is older.'],
          ['max_panel_version', 'Semver with wildcard (e.g., "0.3.x")', 'Yes', 'Newest Panel version the plugin supports. Installation blocked if Panel is newer.'],
          ['sdk_version', 'Semver range (e.g., "^1.0.0")', 'Yes', 'Compatible @acp/plugin-sdk version range.'],
          ['node_version', 'Semver range (e.g., ">=20.0.0")', 'No', 'Required Node.js version for backend features.'],
        ]}
      />

      <Callout type="info" title="Wildcard in max_panel_version">
        Using <code>"0.3.x"</code> as max_panel_version means the plugin is compatible with
        any <code>0.3.*</code> patch release. This is recommended so that Panel patch updates
        (which never contain breaking changes) do not block your plugin.
      </Callout>

      {/* ── Compatibility Rules ───────────────────────────────── */}
      <Heading level={2} id="compatibility-rules">Compatibility Rules</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following rules govern how the Panel resolves dependency compatibility between
        itself, the SDK, and plugins.
      </p>

      <Heading level={3} id="same-major">Same Major Version Rule</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Within the same major version of a shared dependency, the Panel provides the
        highest compatible version. Plugins specifying a range within the same major
        are guaranteed to work.
      </p>
      <CodeBlock language="text" title="Same Major Version Resolution">
{`Panel provides:    react@18.3.1
Plugin requests:   react@^18.0.0     ✅ Resolved to 18.3.1 (Panel's copy)
Plugin requests:   react@^18.2.0     ✅ Resolved to 18.3.1 (Panel's copy)
Plugin requests:   react@~18.2.0     ✅ Resolved to 18.3.1 (compatible)
Plugin requests:   react@18.2.0      ⚠️  Warning: exact version, resolved to 18.3.1`}
      </CodeBlock>

      <Heading level={3} id="major-boundary">Major Boundary Rule</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins cannot request a different major version of a singleton dependency than what
        the Panel provides. This is a hard installation blocker.
      </p>
      <CodeBlock language="text" title="Major Boundary Resolution">
{`Panel provides:    react@18.3.1
Plugin requests:   react@^17.0.0     ❌ BLOCKED — major version mismatch
Plugin requests:   react@^19.0.0     ❌ BLOCKED — major version mismatch
Plugin requests:   react@>=17.0.0    ✅ Range includes 18.x, resolved to 18.3.1`}
      </CodeBlock>

      <Heading level={3} id="sdk-version-match">SDK Version Match Rule</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The <code>@acp/plugin-sdk</code> version must be compatible with the Panel version.
        Each Panel release specifies which SDK versions it supports. Using an incompatible
        SDK version will cause installation failure.
      </p>
      <CodeBlock language="text" title="SDK Version Match">
{`Panel 0.1.x → SDK 1.0.x required
Panel 0.2.x → SDK 1.0.x or 1.1.x accepted
Panel 1.0.x → SDK 2.0.x required (breaking SDK changes)`}
      </CodeBlock>

      {/* ── Upgrade Policy ────────────────────────────────────── */}
      <Heading level={2} id="upgrade-policy">Upgrade Policy</Heading>

      <Heading level={3} id="within-major">Within Same Major (Non-Breaking)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Minor and patch updates to shared dependencies are deployed by the Panel team and
        are transparent to plugins. No plugin changes are required.
      </p>
      <PropsTable
        columns={['Action', 'Who', 'Plugin Impact', 'Example']}
        rows={[
          ['Patch update (18.2.0 -> 18.2.1)', 'Panel team', 'None — plugins unaffected', 'React bug fix, no API changes'],
          ['Minor update (18.2.x -> 18.3.x)', 'Panel team', 'None — new features available', 'React adds new hooks, existing API stable'],
          ['SDK patch (1.0.0 -> 1.0.1)', 'Panel team', 'None — bug fixes only', 'SDK fixes edge case in usePluginConfig'],
          ['SDK minor (1.0.x -> 1.1.x)', 'Panel team', 'Optional — new SDK features available', 'SDK adds usePluginTheme hook'],
        ]}
      />

      <Heading level={3} id="cross-major">Cross-Major (Breaking)</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Major version upgrades to shared dependencies require a coordinated migration.
        The Panel provides a compatibility window where both old and new versions are
        supported simultaneously.
      </p>
      <PropsTable
        columns={['Phase', 'Duration', 'What Happens']}
        rows={[
          ['Announcement', '3 months before', 'Panel team publishes migration guide, new SDK version released'],
          ['Dual Support', '6 months', 'Panel supports both old and new major versions simultaneously'],
          ['Deprecation Warning', 'Month 4 of dual support', 'Plugins using old version show warning in Market listing'],
          ['Hard Cutoff', 'End of dual support', 'Plugins using old version cannot be installed on new Panel versions'],
          ['Archive', 'After cutoff', 'Old plugin versions remain available for download on old Panel versions'],
        ]}
      />

      <Callout type="info" title="Migration Tooling">
        The ACP CLI provides automated migration codemods for major version upgrades.
        Run <code>acp plugin migrate --target-panel 1.0</code> to auto-update imports,
        API calls, and manifest fields.
      </Callout>

      {/* ── Module Federation Configuration ───────────────────── */}
      <Heading level={2} id="module-federation">Module Federation Configuration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The Panel uses <code>vite-plugin-federation</code> to expose shared dependencies to
        plugins at runtime. Plugins use the same plugin to declare what they consume from the
        Panel host.
      </p>

      <Heading level={3} id="host-config">Panel Host Configuration</Heading>
      <CodeBlock language="javascript" title="vite.config.js — Panel (Host)">
{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'acp_panel',
      filename: 'remoteEntry.js',

      // Expose shared modules to plugins
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
          eager: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
          eager: true,
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: true,
        },
        '@acp/plugin-sdk': {
          singleton: true,
          requiredVersion: '^1.0.0',
          eager: true,
        },

        // Non-singleton shared (optional reuse)
        zustand: {
          singleton: false,
          requiredVersion: '^4.0.0',
        },
        'lucide-react': {
          singleton: false,
          requiredVersion: '^0.300.0',
        },
        clsx: {
          singleton: false,
          requiredVersion: '^2.0.0',
        },
        'date-fns': {
          singleton: false,
          requiredVersion: '^3.0.0',
        },
        zod: {
          singleton: false,
          requiredVersion: '^3.0.0',
        },
      },
    }),
  ],
});`}
      </CodeBlock>

      <Heading level={3} id="plugin-config">Plugin Remote Configuration</Heading>
      <CodeBlock language="javascript" title="vite.config.js — Plugin (Remote)">
{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'plg_my_weather_widget',
      filename: 'remoteEntry.js',

      // Expose the plugin's main component
      exposes: {
        './Plugin': './src/Plugin.jsx',
        './Settings': './src/Settings.jsx',  // Optional settings panel
      },

      // Consume shared modules from the Panel host
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
          import: false,  // Do NOT bundle — use Panel's copy
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
          import: false,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
          import: false,
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
          import: false,
        },
        '@acp/plugin-sdk': {
          singleton: true,
          requiredVersion: '^1.0.0',
          import: false,
        },

        // Non-singleton: use Panel's if compatible, else bundle own
        zustand: { singleton: false, requiredVersion: '^4.0.0' },
        clsx:    { singleton: false, requiredVersion: '^2.0.0' },
      },
    }),
  ],

  build: {
    target: 'esnext',
    minify: true,
    cssCodeSplit: true,
  },
});`}
      </CodeBlock>

      {/* ── Plugin Bundle Rules ───────────────────────────────── */}
      <Heading level={2} id="bundle-rules">Plugin Bundle Rules</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        To keep the Panel fast and predictable, plugin bundles must follow strict rules
        about what they include, how they import shared modules, and their maximum size.
      </p>

      <Heading level={3} id="externals">Externals (Must Not Bundle)</Heading>
      <PropsTable
        columns={['Package', 'Reason', 'Build Check']}
        rows={[
          ['react', 'Singleton — provided by Panel', 'Bundle analyzer rejects if found'],
          ['react-dom', 'Singleton — provided by Panel', 'Bundle analyzer rejects if found'],
          ['react-router-dom', 'Singleton — provided by Panel', 'Bundle analyzer rejects if found'],
          ['@tanstack/react-query', 'Singleton — provided by Panel', 'Bundle analyzer rejects if found'],
          ['@acp/plugin-sdk', 'Singleton — provided by Panel', 'Bundle analyzer rejects if found'],
        ]}
      />

      <Heading level={3} id="import-rules">Import Rules</Heading>
      <CodeBlock language="javascript" title="Valid and Invalid Imports">
{`// ✅ Valid: import from shared singleton
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePluginConfig, usePluginSDK } from '@acp/plugin-sdk';

// ✅ Valid: import from bundled dependency
import { motion } from 'framer-motion';  // Not shared, bundled by plugin
import axios from 'axios';               // Not shared, bundled by plugin

// ✅ Valid: import from non-singleton shared
import { create } from 'zustand';
import { format } from 'date-fns';
import { z } from 'zod';

// ❌ Invalid: import Panel internals
import { AdminLayout } from '@core/layouts';     // BLOCKED
import { useAuth } from '@core/hooks';           // BLOCKED
import { db } from '@core/database';             // BLOCKED

// ❌ Invalid: dynamic import of singleton
const React = await import('react');             // BLOCKED at runtime
const sdk = require('@acp/plugin-sdk');          // BLOCKED (no CJS)`}
      </CodeBlock>

      <Heading level={3} id="size-budget">Size Budget</Heading>
      <PropsTable
        columns={['Metric', 'Limit', 'Enforcement', 'Recommendation']}
        rows={[
          ['Frontend bundle (gzipped)', '2 MB', 'Market rejects on upload', 'Target < 500 KB for fast loading'],
          ['Backend package', '10 MB', 'Market rejects on upload', 'Target < 2 MB; large assets should use CDN'],
          ['Total plugin package', '15 MB', 'Market rejects on upload', 'Frontend + backend + assets combined'],
          ['Individual JS chunk', '500 KB (gzipped)', 'Warning on build', 'Use code splitting for large plugins'],
          ['CSS total', '200 KB (gzipped)', 'Warning on build', 'Use Tailwind tree-shaking or CSS Modules'],
          ['Number of JS chunks', '20 max', 'Warning on build', 'Minimize chunk count for faster loading'],
        ]}
      />

      {/* ── Troubleshooting ───────────────────────────────────── */}
      <Heading level={2} id="troubleshooting">Troubleshooting Common Issues</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following are the most common dependency-related issues plugin developers
        encounter, along with their causes and solutions.
      </p>

      <Heading level={3} id="ts-multiple-react">Multiple React Instances</Heading>
      <CodeBlock language="text" title="Error">
{`Error: Invalid hook call. Hooks can only be called inside of the body of a
function component. This could happen because:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> Your plugin is bundling its own copy of React instead of using the
        Panel's shared instance. This happens when <code>react</code> is in
        <code> dependencies</code> instead of <code>peerDependencies</code>.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Move <code>react</code> and <code>react-dom</code> to
        <code> peerDependencies</code>. Ensure your Module Federation config sets
        <code> import: false</code> for both packages. Run <code>acp plugin analyze</code> to
        verify they are not in your bundle.
      </p>

      <Heading level={3} id="ts-query-cache">TanStack Query Cache Fragmentation</Heading>
      <CodeBlock language="text" title="Symptom">
{`Plugin's useQuery calls return stale data even after mutations.
Plugin cannot see query data from other plugins or the Panel.
QueryDevtools shows a separate QueryClient for the plugin.`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> The plugin is creating its own <code>QueryClient</code> or bundling
        its own <code>@tanstack/react-query</code>. Multiple QueryClients mean separate
        caches.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Never create a <code>QueryClient</code> in your plugin. Use the SDK's
        <code> usePluginQuery</code> hook which automatically uses the Panel's shared
        QueryClient. Ensure <code>@tanstack/react-query</code> is in <code>peerDependencies</code>.
      </p>

      <Heading level={3} id="ts-router-context">Router Context Lost</Heading>
      <CodeBlock language="text" title="Error">
{`Error: useNavigate() may be used only in the context of a <Router> component.`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> The plugin is bundling its own <code>react-router-dom</code>, creating
        a separate router context that is outside the Panel's <code>&lt;BrowserRouter&gt;</code>.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Move <code>react-router-dom</code> to <code>peerDependencies</code> and
        set <code>import: false</code> in Module Federation config. Use
        <code> useNavigate</code> and <code>useLocation</code> from the shared instance.
      </p>

      <Heading level={3} id="ts-bundle-size">Bundle Size Exceeded</Heading>
      <CodeBlock language="text" title="Error">
{`ACP Market Upload Error:
  Frontend bundle size: 3.2 MB (gzipped)
  Maximum allowed: 2 MB (gzipped)
  Largest chunks:
    - vendor-lodash.js: 72 KB
    - vendor-framer-motion.js: 118 KB
    - vendor-recharts.js: 154 KB`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> Plugin is bundling large not-shared dependencies. Common culprits
        are <code>lodash</code> (use <code>lodash-es</code> with tree-shaking),
        <code> framer-motion</code>, and charting libraries.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Run <code>acp plugin analyze</code> to identify the largest chunks.
        Replace <code>lodash</code> with native JS or <code>lodash-es</code> with named imports.
        Use code splitting to lazy-load heavy components. Consider lighter alternatives
        for charting and animation.
      </p>

      <Heading level={3} id="ts-sdk-mismatch">SDK Version Mismatch</Heading>
      <CodeBlock language="text" title="Error">
{`Plugin "my-plugin" requires @acp/plugin-sdk ^2.0.0
but Panel provides @acp/plugin-sdk 1.1.3.
Installation blocked: SDK major version mismatch.`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> Plugin was built for a newer Panel version that ships SDK 2.x, but
        is being installed on an older Panel that ships SDK 1.x.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Update your <code>manifest.json</code> <code>min_panel_version</code> to
        match the Panel version that ships the required SDK. If you need to support older
        Panels, downgrade your SDK usage to 1.x APIs. Publish separate plugin versions
        for different Panel generations.
      </p>

      <Heading level={3} id="ts-css-leak">CSS Styles Leaking</Heading>
      <CodeBlock language="text" title="Symptom">
{`Plugin styles override Panel UI elements.
Panel buttons change color when plugin is active.
Other plugins' layouts break when this plugin loads.`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Cause:</strong> Plugin uses global CSS selectors (e.g., <code>button</code>,
        <code> .card</code>, <code>h1</code>) instead of scoped selectors.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        <strong className="text-text-primary">Fix:</strong> Use CSS Modules (<code>*.module.css</code>) which auto-scope selectors.
        Alternatively, prefix all class names with <code>.plg-{'<id>'}--</code>. Never
        use element selectors or generic class names in global scope. Run
        <code> acp plugin lint</code> to detect global CSS.
      </p>
    </div>
  );
}
