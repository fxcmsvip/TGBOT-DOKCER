# Shared Dependencies Contract

> Defines the exact shared dependency versions, compatibility rules, and Module Federation configuration between the ADMINCHAT Panel (host) and plugins (remotes).

---

## Table of Contents

1. [Shared Dependencies Table](#1-shared-dependencies-table)
2. [Version Compatibility Matrix](#2-version-compatibility-matrix)
3. [Upgrade Policy](#3-upgrade-policy)
4. [Module Federation Configuration](#4-module-federation-configuration)
5. [Plugin Bundle Rules](#5-plugin-bundle-rules)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Shared Dependencies Table

These packages are provided by the Panel host application. Plugins MUST NOT bundle their own copies of singleton packages. Non-singleton packages may be bundled by plugins if needed.

### Singleton Dependencies (provided by host)

| Package | Version (locked) | Singleton | Required | Notes |
|---------|-----------------|-----------|----------|-------|
| `react` | 18.x | **Yes** | Yes | Single React instance required. Multiple instances cause hooks to break. |
| `react-dom` | 18.x | **Yes** | Yes | Must match `react` version exactly. |
| `react-router-dom` | 6.x | **Yes** | Yes | Single router instance. Plugins use the host's router context. |
| `@tanstack/react-query` | 5.x | **Yes** | Yes | Shares the host's `QueryClient`. Plugin queries appear in the same devtools. |
| `@acp/plugin-sdk` | Matches panel | **Yes** | Yes | SDK version must match the Panel version. See compatibility matrix. |

### Non-Singleton Dependencies (plugin may bundle)

| Package | Host Version | Singleton | Notes |
|---------|-------------|-----------|-------|
| `zustand` | 4.x | No | Plugins create their own isolated stores. No state shared with host. |
| `lucide-react` | latest | No | Tree-shakeable. Plugin bundles only the icons it imports. |
| `clsx` | 2.x | No | Utility. Small enough to bundle per-plugin. |
| `date-fns` | 3.x | No | Date utility. Plugin bundles only used functions. |
| `zod` | 3.x | No | Validation. Plugin may bundle its own version. |

### Not Shared (plugin must bundle if used)

| Package | Notes |
|---------|-------|
| `axios` | Use `sdk.api` instead. If needed for external APIs, bundle it. |
| `lodash` | Use native JS or bundle only needed functions (e.g., `lodash-es`). |
| `framer-motion` | Animation library. Bundle if needed. |
| `recharts` / `chart.js` | Charting libraries. Bundle if needed. |
| Any CSS framework | Use Tailwind classes matching the design system. |

---

## 2. Version Compatibility Matrix

### SDK ↔ Panel Compatibility

The `@acp/plugin-sdk` package is versioned in lockstep with the Panel. Each Panel release publishes a matching SDK version.

| Panel Version | SDK Version | React | React Router | TanStack Query | Tailwind | Status |
|---------------|-------------|-------|-------------|----------------|----------|--------|
| 1.0.x | 1.0.x | 18.3.x | 6.28.x | 5.62.x | 3.4.x | Current |
| 1.1.x | 1.1.x | 18.3.x | 6.28.x | 5.62.x | 3.4.x | Planned |
| 1.2.x | 1.2.x | 18.3.x | 6.28.x | 5.62.x | 3.4.x | Planned |
| 2.0.x | 2.0.x | 19.x | 7.x | 6.x | 4.x | Future (breaking) |

### Plugin Manifest Version Constraints

Every plugin declares compatible Panel versions in `manifest.json`:

```json
{
  "min_panel_version": "1.0.0",
  "max_panel_version": "1.99.99"
}
```

| Field | Description |
|-------|-------------|
| `min_panel_version` | Minimum Panel version this plugin supports (inclusive) |
| `max_panel_version` | Maximum Panel version this plugin supports (inclusive). Omit for "no upper bound within the same major version". |

### Compatibility Rules

1. **Same major version** — Plugins built for Panel 1.x work with any Panel 1.x release (1.0 through 1.99). Shared dependency minor/patch versions may differ but major versions are locked within a Panel major version.

2. **Major version boundary** — Panel 2.0 is a breaking change. Plugins built for 1.x will NOT load on 2.x unless they publish a new version declaring `min_panel_version: "2.0.0"`.

3. **SDK version must match Panel major.minor** — A plugin built with `@acp/plugin-sdk@1.0.x` will work on Panel 1.0.x and 1.1.x (patch differences are tolerated), but the SDK's minor version should not exceed the Panel's minor version.

---

## 3. Upgrade Policy

### Scenario: Panel Upgrades Within Same Major (1.0 → 1.1)

| Step | What Happens |
|------|--------------|
| 1 | Panel is upgraded from 1.0.x to 1.1.x |
| 2 | Shared dependency versions remain compatible (same major versions) |
| 3 | All installed plugins continue working without changes |
| 4 | Plugins may optionally upgrade their SDK to 1.1.x for new features |
| 5 | No action required from plugin developers |

### Scenario: Panel Major Upgrade (1.x → 2.0)

| Step | What Happens |
|------|--------------|
| 1 | Panel announces 2.0 release with breaking changes (e.g., React 18 → 19) |
| 2 | Panel publishes a migration guide and `@acp/plugin-sdk@2.0.0-beta` |
| 3 | Plugin developers update their code and test against the beta |
| 4 | Plugin developers publish new versions with `min_panel_version: "2.0.0"` |
| 5 | Panel 2.0 is released |
| 6 | Plugins with `max_panel_version < "2.0.0"` are auto-disabled |
| 7 | Admin sees disabled plugins in the Plugin Management UI with upgrade prompts |
| 8 | Admin installs the updated plugin versions |

### Scenario: Shared Dependency Major Upgrade

**React 18 → 19:**

| Impact | Description |
|--------|-------------|
| Panel version | Requires Panel major version bump (1.x → 2.x) |
| Plugin SDK | New major version published (`@acp/plugin-sdk@2.0.0`) |
| Plugin code | Plugins must update to React 19 APIs, remove deprecated patterns |
| Timeline | Minimum 6 months notice before breaking changes |
| Deprecation | Old SDK version receives security patches for 12 months |

**Tailwind 3.x → 4.x:**

| Impact | Description |
|--------|-------------|
| Panel version | May be a minor or major bump depending on breaking changes |
| CSS variables | Design system CSS variables (`--acp-*`) remain stable across Tailwind versions |
| Plugin code | If plugins use Tailwind utility classes directly, they may need updates |
| Mitigation | Plugins using SDK components are shielded from Tailwind version changes |

**TanStack Query 5 → 6:**

| Impact | Description |
|--------|-------------|
| Panel version | Requires Panel major version bump |
| Plugin SDK | `usePluginQuery` / `usePluginMutation` hooks abstract TanStack Query internals |
| Plugin code | Plugins using SDK hooks may not need changes. Direct TanStack Query usage will. |

---

## 4. Module Federation Configuration

### Host Configuration (Panel)

The Panel's Vite config sets up Module Federation as the host:

```typescript
// panel/vite.config.ts
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'acp_panel',

      // Remotes are dynamically registered from the plugin registry.
      // This is populated at runtime, not build time.
      remotes: {},

      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.3.0',
          eager: true,        // Loaded immediately, not lazy
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.3.0',
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.28.0',
          eager: false,       // Lazy loaded
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.62.0',
          eager: false,
        },
        '@acp/plugin-sdk': {
          singleton: true,
          requiredVersion: '^1.0.0',
          eager: false,
        },
      },
    }),
  ],
})
```

### Remote Configuration (Plugin)

Generated automatically by `acpPlugin()` in the plugin's Vite config:

```typescript
// plugin/vite.config.ts (generated by acpPlugin())
federation({
  name: 'plugin_movie_request',    // Sanitized from pluginId

  filename: 'remoteEntry.js',

  exposes: {
    './pages/MovieRequests': './src/pages/MovieRequests.tsx',
    './pages/RequestDetail': './src/pages/RequestDetail.tsx',
    './settings/TmdbTab': './src/settings/TmdbTab.tsx',
  },

  shared: {
    react: {
      singleton: true,
      requiredVersion: '^18.3.0',
      import: false,          // Do NOT bundle; use host's copy
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.3.0',
      import: false,
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: '^6.28.0',
      import: false,
    },
    '@tanstack/react-query': {
      singleton: true,
      requiredVersion: '^5.62.0',
      import: false,
    },
    '@acp/plugin-sdk': {
      singleton: true,
      requiredVersion: '^1.0.0',
      import: false,
    },
  },
})
```

### How Shared Dependencies Work

#### Singleton Mode

When `singleton: true`:
1. The host loads its copy of the package.
2. When a remote (plugin) requests the package, Module Federation provides the host's copy.
3. Only ONE instance of the package exists in memory.
4. This is critical for React (multiple instances break hooks) and React Router (multiple routers break navigation).

#### Eager vs Lazy Loading

| Mode | Behavior | Use Case |
|------|----------|----------|
| `eager: true` | Package is loaded in the initial bundle, before any remotes | Required for React and React-DOM — they must be available before any component renders |
| `eager: false` (default) | Package is loaded on demand when first requested | Suitable for React Router, TanStack Query — loaded when the first plugin mounts |

#### `import: false` (Remote Side)

When `import: false` on the remote:
- The plugin does NOT include the package in its bundle.
- At runtime, the plugin asks the host for the package.
- If the host doesn't have it, Module Federation falls back to the remote's own copy (but since `import: false`, there is no fallback — a runtime error occurs).
- This ensures plugins never accidentally bundle singleton packages.

#### Fallback Behavior

| Scenario | Result |
|----------|--------|
| Host has `react@18.3.1`, plugin expects `^18.3.0` | Host's copy used (version satisfied) |
| Host has `react@18.2.0`, plugin expects `^18.3.0` | Host's copy used (singleton overrides version check) |
| Host has `react@19.0.0`, plugin expects `^18.3.0` | Host's copy used BUT may cause runtime errors (major mismatch) |
| Plugin loads before host initializes | Error: shared scope not initialized. Fixed by `eager: true` on host. |

### Dynamic Remote Loading

The Panel loads plugin remotes dynamically at runtime (not at build time):

```typescript
// Panel's plugin loader (internal)
async function loadPluginModule(pluginId: string, modulePath: string) {
  const registryEntry = await getPluginRegistryEntry(pluginId)
  const remoteUrl = registryEntry.remoteEntryUrl
  // e.g., "http://localhost:5174/assets/remoteEntry.js" (dev)
  // e.g., "/plugins/movie-request/assets/remoteEntry.js" (prod)

  const container = await loadRemoteEntry(remoteUrl)
  await container.init(__webpack_share_scopes__.default)
  const factory = await container.get(modulePath)
  const Module = factory()
  return Module.default || Module
}
```

This means:
- Plugins are NOT known at Panel build time.
- New plugins can be installed without rebuilding the Panel.
- Failed remote loads are caught by error boundaries (see `PLUGIN_FRONTEND_API.md`).

---

## 5. Plugin Bundle Rules

### What Plugins MUST NOT Bundle

These will cause runtime errors or subtle bugs if duplicated:

| Package | Why |
|---------|-----|
| `react` | Multiple React instances break hooks (`useState`, `useEffect`, etc.) |
| `react-dom` | Must be the same instance as `react` |
| `react-router-dom` | Multiple routers break navigation, `useNavigate`, `useParams` |
| `@tanstack/react-query` | `useQuery` won't find the `QueryClient` if using a different instance |
| `@acp/plugin-sdk` | SDK hooks depend on host-provided context (React context, QueryClient) |

### What Plugins SHOULD Bundle

| Package | Why |
|---------|-----|
| `zustand` | State is isolated per plugin. Sharing stores would be a security risk. |
| `lucide-react` | Tree-shakeable. Bundling avoids loading all 1000+ icons from the host. |
| Any plugin-specific library | Charts, date pickers, form libraries, etc. |

### Bundle Size Guidelines

| Metric | Limit | Notes |
|--------|-------|-------|
| `remoteEntry.js` | < 5 KB | Entry point should be minimal |
| Total plugin JS (gzipped) | < 500 KB | Recommended maximum |
| Total plugin JS (gzipped) | < 2 MB | Hard limit enforced by the marketplace |
| Individual chunks | < 200 KB (gzipped) | Use code splitting for large pages |

### Code Splitting

Plugins should code-split their pages:

```typescript
// Each exposed module is a natural split point
exposes: {
  './pages/MovieRequests': './src/pages/MovieRequests.tsx',  // Chunk 1
  './pages/RequestDetail': './src/pages/RequestDetail.tsx',  // Chunk 2
  './settings/TmdbTab': './src/settings/TmdbTab.tsx',       // Chunk 3
}
```

For additional splitting within a page:

```typescript
import { lazy, Suspense } from 'react'
import { Spinner } from '@acp/plugin-sdk'

const HeavyChart = lazy(() => import('./components/HeavyChart'))

function MovieRequests() {
  return (
    <div>
      {/* Light content loads immediately */}
      <StatsRow />

      {/* Heavy chart loads on demand */}
      <Suspense fallback={<Spinner />}>
        <HeavyChart />
      </Suspense>
    </div>
  )
}
```

---

## 6. Troubleshooting

### Common Errors

#### "Invalid hook call" / "Hooks can only be called inside a function component"

**Cause:** Multiple copies of React in the bundle.

**Fix:** Ensure the plugin's Vite config uses `acpPlugin()` which sets `import: false` for React. Check that `react` is not in the plugin's `dependencies` (only in `peerDependencies` and `devDependencies`).

```json
// plugin/package.json — CORRECT
{
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

#### "Shared module is not available for eager consumption"

**Cause:** A singleton shared module was requested before the host's share scope was initialized.

**Fix:** This is a host-side issue. Ensure `react` and `react-dom` have `eager: true` in the host's federation config. Plugin developers do not need to change anything.

#### "Loading script failed" / "Failed to fetch remoteEntry.js"

**Cause:** The plugin's remote entry URL is unreachable.

**Fix:**
- **Dev mode:** Ensure the plugin dev server is running (`pnpm dev`).
- **Production:** Verify the plugin's build artifacts are deployed to `/plugins/{plugin_id}/assets/`.
- Check CORS headers if the plugin is served from a different origin.

#### "Module './pages/MovieRequests' not found in remote"

**Cause:** The exposed module path doesn't match what the Panel expects.

**Fix:** Verify that the `exposes` map in `vite.config.ts` matches the `frontend.pages[].path` → module mapping in `manifest.json`. Module paths must start with `./`.

#### "Cannot read properties of null (reading 'useContext')"

**Cause:** SDK hooks called outside the plugin's provider tree.

**Fix:** Ensure your page component is the default export of the exposed module. The Panel wraps it in the necessary providers. Do not create a separate React root.

#### QueryClient Not Found

**Cause:** `useQuery` from `@tanstack/react-query` is not finding the host's `QueryClient`.

**Fix:** Use `usePluginQuery` from `@acp/plugin-sdk` instead of importing from `@tanstack/react-query` directly. If you must use TanStack Query directly, ensure it is NOT bundled in your plugin (check with `npx vite-bundle-analyzer`).

### Diagnostic Commands

```bash
# Analyze plugin bundle for duplicate dependencies
npx @acp/plugin-cli analyze

# Validate manifest and shared deps
npx @acp/plugin-cli validate

# Check which packages are bundled vs shared
npx @acp/plugin-cli deps

# Example output:
# SHARED (from host):
#   react@18.3.1 (singleton)
#   react-dom@18.3.1 (singleton)
#   react-router-dom@6.28.0 (singleton)
#   @tanstack/react-query@5.62.0 (singleton)
#   @acp/plugin-sdk@1.0.0 (singleton)
#
# BUNDLED (in plugin):
#   zustand@4.5.0 (42 KB)
#   lucide-react (12 icons, 8 KB)
#   date-fns/format (3 KB)
#
# TOTAL BUNDLE: 187 KB (gzipped: 62 KB) ✓
```

### Version Mismatch Detection

The Panel validates shared dependency compatibility at plugin load time:

```
[WARN] Plugin "movie-request" was built with @acp/plugin-sdk@1.0.2
       but the Panel is running @acp/plugin-sdk@1.1.0.
       This should be compatible, but update is recommended.

[ERROR] Plugin "old-plugin" was built with @acp/plugin-sdk@0.9.0
        but the Panel requires @acp/plugin-sdk@^1.0.0.
        Plugin will not be loaded. Please update the plugin.
```

The Panel displays these warnings/errors in the Plugin Management UI so admins can take action.
