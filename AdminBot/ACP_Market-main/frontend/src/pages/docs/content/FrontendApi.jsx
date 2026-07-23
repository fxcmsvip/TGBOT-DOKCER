import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function FrontendApi() {
  return (
    <div>
      <Heading level={1} id="frontend-sdk">React/TypeScript Frontend SDK Reference</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP Frontend SDK provides a React + TypeScript library for building plugin user
        interfaces that integrate seamlessly into the ADMINCHAT Panel. The SDK handles
        authentication, configuration, API communication, and module federation so you can
        focus on building features.
      </p>

      {/* ── Installation ─────────────────────────────────────── */}
      <Heading level={2} id="installation">Package Installation</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Install the SDK and its peer dependencies from the ACP npm registry:
      </p>
      <CodeBlock language="bash" title="Install the SDK">
{`npm install @acp/plugin-sdk

# or with yarn
yarn add @acp/plugin-sdk

# or with pnpm
pnpm add @acp/plugin-sdk`}
      </CodeBlock>

      <Callout type="info" title="Peer dependencies">
        The SDK requires <span className="font-mono text-xs">react &gt;= 18.0.0</span>,{' '}
        <span className="font-mono text-xs">react-dom &gt;= 18.0.0</span>, and{' '}
        <span className="font-mono text-xs">react-router-dom &gt;= 6.0.0</span> as peer
        dependencies. These are provided by the host Panel application at runtime through
        module federation shared dependencies.
      </Callout>

      {/* ── Hooks ─────────────────────────────────────────────── */}
      <Heading level={2} id="hooks">Hooks</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK exposes a set of React hooks that provide access to the plugin runtime,
        configuration, user context, and API clients.
      </p>

      <Heading level={3} id="use-plugin-sdk">usePluginSDK()</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The primary hook for accessing the full SDK context. Returns the initialized SDK
        instance with access to all sub-clients.
      </p>
      <CodeBlock language="typescript" title="usePluginSDK usage">
{`import { usePluginSDK } from '@acp/plugin-sdk';

function Dashboard() {
  const sdk = usePluginSDK();

  // Access plugin metadata
  console.log(sdk.pluginId);   // "my-plugin"
  console.log(sdk.version);    // "1.0.0"

  // Access sub-clients
  const api = sdk.api;         // PluginApiClient
  const core = sdk.core;       // CoreApiClient
  const config = sdk.config;   // PluginConfigClient

  // Check capabilities
  if (sdk.hasCapability('payments')) {
    // render payment UI
  }

  return <div>Plugin loaded: {sdk.pluginId}</div>;
}`}
      </CodeBlock>
      <PropsTable
        columns={['Property', 'Type', 'Description']}
        rows={[
          ['pluginId', 'string', 'The plugin identifier from the manifest.'],
          ['version', 'string', 'The current plugin version.'],
          ['api', 'PluginApiClient', 'HTTP client scoped to the plugin\'s API prefix (/api/v1/p/{plugin_id}/).'],
          ['core', 'CoreApiClient', 'HTTP client for core Panel APIs (users, groups, notifications).'],
          ['config', 'PluginConfigClient', 'Read/write access to plugin configuration values.'],
          ['hasCapability(name)', '(name: string) => boolean', 'Check whether the plugin has a specific declared capability.'],
          ['panelVersion', 'string', 'The version of the host ADMINCHAT Panel.'],
        ]}
      />

      <Heading level={3} id="use-plugin-config">usePluginConfig()</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A convenience hook for reading and updating plugin configuration values. Returns
        the current config state and a setter function. Automatically re-renders when
        config values change.
      </p>
      <CodeBlock language="typescript" title="usePluginConfig usage">
{`import { usePluginConfig } from '@acp/plugin-sdk';

function SettingsPanel() {
  const { config, updateConfig, isLoading, error } = usePluginConfig();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <label>Welcome Message</label>
      <input
        value={config.welcome_message ?? ''}
        onChange={(e) =>
          updateConfig('welcome_message', e.target.value)
        }
      />

      <label>Max Retries</label>
      <input
        type="number"
        value={config.max_retries ?? 3}
        onChange={(e) =>
          updateConfig('max_retries', parseInt(e.target.value, 10))
        }
      />
    </div>
  );
}`}
      </CodeBlock>
      <PropsTable
        columns={['Property', 'Type', 'Description']}
        rows={[
          ['config', 'Record<string, unknown>', 'The current config key-value map with defaults applied.'],
          ['updateConfig', '(key: string, value: unknown) => Promise<void>', 'Update a single config value. Persists immediately and triggers re-render.'],
          ['resetConfig', '(key: string) => Promise<void>', 'Reset a config key to its manifest default.'],
          ['isLoading', 'boolean', 'True while the initial config is being fetched.'],
          ['error', 'Error | null', 'The most recent error, if any.'],
        ]}
      />

      <Heading level={3} id="use-current-user">useCurrentUser()</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Returns the currently authenticated ADMINCHAT Panel administrator. This is always
        available inside plugin pages since they require authentication.
      </p>
      <CodeBlock language="typescript" title="useCurrentUser usage">
{`import { useCurrentUser } from '@acp/plugin-sdk';

function Header() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) return null;

  return (
    <div>
      <span>Logged in as: {user.displayName}</span>
      <span>Role: {user.role}</span>
      <span>Telegram ID: {user.telegramId}</span>
    </div>
  );
}`}
      </CodeBlock>
      <PropsTable
        columns={['Property', 'Type', 'Description']}
        rows={[
          ['user.id', 'number', 'Internal Panel user ID.'],
          ['user.telegramId', 'number', 'The user\'s Telegram numeric ID.'],
          ['user.displayName', 'string', 'Full display name.'],
          ['user.username', 'string | null', 'Telegram username (without @), if set.'],
          ['user.role', '"owner" | "admin" | "moderator"', 'The user\'s Panel role.'],
          ['user.avatarUrl', 'string | null', 'URL to the user\'s avatar image.'],
          ['user.permissions', 'string[]', 'List of granted permission scopes.'],
        ]}
      />

      <Heading level={3} id="use-plugin-api">usePluginApi()</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A hook that returns a pre-configured HTTP client scoped to the plugin's API prefix.
        All requests are automatically authenticated and include the correct base URL.
      </p>
      <CodeBlock language="typescript" title="usePluginApi usage">
{`import { usePluginApi } from '@acp/plugin-sdk';

interface Order {
  id: number;
  product: string;
  status: string;
}

function OrdersList() {
  const api = usePluginApi();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // GET /api/v1/p/my-plugin/orders
    api.get<Order[]>('/orders').then(setOrders);
  }, []);

  const createOrder = async (product: string) => {
    // POST /api/v1/p/my-plugin/orders
    const order = await api.post<Order>('/orders', {
      body: { product, quantity: 1 },
    });
    setOrders((prev) => [...prev, order]);
  };

  const deleteOrder = async (id: number) => {
    // DELETE /api/v1/p/my-plugin/orders/42
    await api.delete(\`/orders/\${id}\`);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>{o.product} — {o.status}</li>
      ))}
    </ul>
  );
}`}
      </CodeBlock>
      <PropsTable
        columns={['Method', 'Signature', 'Description']}
        rows={[
          ['get', 'api.get<T>(path, options?)', 'Send a GET request. Returns the parsed JSON response body.'],
          ['post', 'api.post<T>(path, options?)', 'Send a POST request with a JSON body.'],
          ['put', 'api.put<T>(path, options?)', 'Send a PUT request with a JSON body.'],
          ['patch', 'api.patch<T>(path, options?)', 'Send a PATCH request with a partial JSON body.'],
          ['delete', 'api.delete<T>(path, options?)', 'Send a DELETE request.'],
        ]}
      />

      <Callout type="info" title="Error handling in API calls">
        All API methods throw a typed <span className="font-mono text-xs">PluginApiError</span> on
        non-2xx responses. The error includes <span className="font-mono text-xs">status</span>,{' '}
        <span className="font-mono text-xs">message</span>, and the original{' '}
        <span className="font-mono text-xs">response</span> object.
      </Callout>

      {/* ── Components ────────────────────────────────────────── */}
      <Heading level={2} id="components">Components</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK ships with several layout components that wrap your plugin UI and provide
        consistent styling, error boundaries, and Panel integration.
      </p>

      <Heading level={3} id="plugin-page">PluginPage</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The top-level wrapper for plugin pages. Provides the SDK context, applies Panel
        theme tokens, and handles loading and error states.
      </p>
      <CodeBlock language="tsx" title="PluginPage component">
{`import { PluginPage } from '@acp/plugin-sdk';

export default function App() {
  return (
    <PluginPage
      title="My Plugin"
      description="Manage your orders and inventory"
      breadcrumbs={[
        { label: 'Plugins', href: '/plugins' },
        { label: 'My Plugin' },
      ]}
    >
      <Dashboard />
    </PluginPage>
  );
}`}
      </CodeBlock>
      <PropsTable
        columns={['Prop', 'Type', 'Default', 'Description']}
        rows={[
          ['title', 'string', '—', 'Page title shown in the header area.'],
          ['description', 'string', '""', 'Optional subtitle below the title.'],
          ['breadcrumbs', 'Array<{ label, href? }>', '[]', 'Breadcrumb trail. The last item is rendered as plain text (current page).'],
          ['actions', 'ReactNode', 'null', 'Action buttons rendered in the top-right corner of the header.'],
          ['maxWidth', '"sm" | "md" | "lg" | "xl" | "full"', '"lg"', 'Maximum content width.'],
          ['children', 'ReactNode', '—', 'Page content.'],
        ]}
      />

      <Heading level={3} id="plugin-settings-page">PluginSettingsPage</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A specialized page component for the plugin settings UI. It auto-generates a form
        from the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">settings</span> field
        in the manifest, or you can provide a custom form.
      </p>
      <CodeBlock language="tsx" title="PluginSettingsPage usage">
{`import { PluginSettingsPage } from '@acp/plugin-sdk';

// Auto-generated form from manifest settings
export function Settings() {
  return <PluginSettingsPage />;
}

// Custom form with additional UI
export function SettingsCustom() {
  return (
    <PluginSettingsPage
      renderHeader={() => (
        <div className="mb-4 p-3 rounded bg-blue-500/10">
          <p>Configure your plugin settings below.</p>
        </div>
      )}
      renderFooter={({ save, reset, isDirty }) => (
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={!isDirty}>Save</button>
          <button onClick={reset}>Reset All</button>
        </div>
      )}
    />
  );
}`}
      </CodeBlock>

      <Heading level={3} id="plugin-error-boundary">PluginErrorBoundary</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A React error boundary that catches rendering errors in plugin components and
        displays a friendly fallback UI instead of breaking the entire Panel.
      </p>
      <CodeBlock language="tsx" title="PluginErrorBoundary usage">
{`import { PluginErrorBoundary } from '@acp/plugin-sdk';

function App() {
  return (
    <PluginErrorBoundary
      fallback={({ error, reset }) => (
        <div className="p-4 text-center">
          <p className="text-red-400">Something went wrong:</p>
          <pre className="text-xs mt-2">{error.message}</pre>
          <button onClick={reset} className="mt-4">
            Try Again
          </button>
        </div>
      )}
      onError={(error, errorInfo) => {
        // Report to your error tracking service
        console.error('Plugin crash:', error, errorInfo);
      }}
    >
      <Dashboard />
    </PluginErrorBoundary>
  );
}`}
      </CodeBlock>

      {/* ── Vite Plugin ───────────────────────────────────────── */}
      <Heading level={2} id="vite-plugin">Vite Plugin Configuration</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK includes a Vite plugin that configures module federation, sets up the
        development proxy, and handles production bundling. Add it to your{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">vite.config.ts</span>.
      </p>
      <CodeBlock language="typescript" title="vite.config.ts">
{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vitePluginACP } from '@acp/plugin-sdk/vite';

export default defineConfig({
  plugins: [
    react(),
    vitePluginACP({
      // Required: must match manifest.json "id"
      pluginId: 'my-plugin',

      // Optional overrides
      exposes: {
        // Default: './Plugin' -> './src/entry.tsx'
        './Plugin': './src/entry.tsx',
      },

      // Shared dependencies (auto-configured, rarely need to override)
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
      },

      // Dev server proxy target
      panelUrl: 'http://localhost:8080',
    }),
  ],
});`}
      </CodeBlock>
      <PropsTable
        columns={['Option', 'Type', 'Default', 'Description']}
        rows={[
          ['pluginId', 'string', '—', 'Required. Must match the id in manifest.json.'],
          ['exposes', 'Record<string, string>', '{ "./Plugin": "./src/entry.tsx" }', 'Module federation expose map. The key must be "./Plugin".'],
          ['shared', 'Record<string, SharedConfig>', 'Auto-configured', 'Shared dependency configuration. Override only if you need extra shared packages.'],
          ['panelUrl', 'string', '"http://localhost:8080"', 'The URL of the ADMINCHAT Panel dev server for API proxying.'],
        ]}
      />

      {/* ── Type Exports ──────────────────────────────────────── */}
      <Heading level={2} id="types">Type Exports</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK exports full TypeScript type definitions for all public interfaces. Import
        them for type-safe development.
      </p>
      <CodeBlock language="typescript" title="Type imports">
{`import type {
  // Core SDK instance type
  PluginSDK,

  // User types
  AdminUser,
  UserRole,

  // API client types
  PluginApiClient,
  CoreApiClient,
  ApiRequestOptions,
  PluginApiError,

  // Config types
  PluginConfigClient,
  PluginConfigSchema,
  ConfigFieldType,

  // Component prop types
  PluginPageProps,
  PluginSettingsPageProps,
  PluginErrorBoundaryProps,
  BreadcrumbItem,

  // Event types
  PluginEvent,
  EventHandler,
} from '@acp/plugin-sdk';`}
      </CodeBlock>

      <PropsTable
        columns={['Type', 'Description']}
        rows={[
          ['PluginSDK', 'The main SDK instance returned by usePluginSDK(). Contains api, core, config, and utility methods.'],
          ['AdminUser', 'Represents an authenticated Panel administrator with id, telegramId, displayName, role, and permissions.'],
          ['PluginApiClient', 'HTTP client for plugin-scoped API calls. Methods: get, post, put, patch, delete.'],
          ['CoreApiClient', 'HTTP client for core Panel API calls (users, groups, notifications, payments).'],
          ['PluginConfigClient', 'Client for reading and writing plugin configuration values.'],
          ['PluginApiError', 'Typed error thrown on non-2xx API responses. Includes status, message, and response.'],
          ['PluginPageProps', 'Props accepted by the PluginPage component.'],
          ['PluginSettingsPageProps', 'Props accepted by the PluginSettingsPage component.'],
        ]}
      />

      {/* ── Module Federation ─────────────────────────────────── */}
      <Heading level={2} id="module-federation">Module Federation Contract</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        ACP plugins use Webpack Module Federation (via the Vite plugin) to load into the
        host Panel at runtime. Understanding the contract is important for debugging and
        advanced use cases.
      </p>

      <Heading level={3} id="exposed-entry">Exposed Entry Point</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every plugin must expose a single entry point at{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">./Plugin</span>. This
        module must default-export a React component that serves as the root of the plugin UI.
      </p>
      <CodeBlock language="tsx" title="src/entry.tsx — the exposed entry point">
{`import { PluginPage, PluginErrorBoundary } from '@acp/plugin-sdk';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Settings from './pages/Settings';

export default function Plugin() {
  return (
    <PluginErrorBoundary>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orders/*" element={<Orders />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </PluginErrorBoundary>
  );
}`}
      </CodeBlock>

      <Heading level={3} id="shared-deps">Shared Dependencies</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following packages are shared as singletons between the host Panel and all
        loaded plugins. They are provided by the Panel and should not be bundled by plugins.
      </p>
      <PropsTable
        columns={['Package', 'Version Range', 'Singleton']}
        rows={[
          ['react', '>= 18.0.0', 'Yes'],
          ['react-dom', '>= 18.0.0', 'Yes'],
          ['react-router-dom', '>= 6.0.0', 'Yes'],
          ['@acp/plugin-sdk', '>= 1.0.0', 'Yes'],
        ]}
      />

      <Callout type="warning" title="Do not bundle shared deps">
        Bundling shared dependencies (especially React) will cause runtime errors such as
        "Invalid hook call" due to multiple React instances. The Vite plugin handles this
        automatically, but if you customize the build, verify shared deps are externalized.
      </Callout>

      {/* ── Routing ───────────────────────────────────────────── */}
      <Heading level={2} id="routing">Routing</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugin pages are registered at{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">/p/{'{plugin_id}'}/*</span>{' '}
        within the Panel's client-side router. The plugin's root component receives a{' '}
        <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">basename</span> that
        is already set, so routes defined inside the plugin are relative.
      </p>
      <CodeBlock language="tsx" title="Plugin-internal routing">
{`import { Routes, Route, Link, useNavigate } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      {/* These resolve to /p/my-plugin/ and /p/my-plugin/orders */}
      <Link to="/">Dashboard</Link>
      <Link to="/orders">Orders</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  );
}

function OrderDetail() {
  const navigate = useNavigate();

  const goBack = () => {
    // Navigates to /p/my-plugin/orders
    navigate('/orders');
  };

  return (
    <div>
      <button onClick={goBack}>Back to Orders</button>
    </div>
  );
}`}
      </CodeBlock>

      <Callout type="info" title="Cross-plugin navigation">
        To navigate to a different plugin or a core Panel page, use an absolute path:{' '}
        <span className="font-mono text-xs">navigate('/p/other-plugin/page')</span> or{' '}
        <span className="font-mono text-xs">navigate('/admin/users')</span>. Absolute paths
        break out of the plugin basename.
      </Callout>

      {/* ── Error Handling ────────────────────────────────────── */}
      <Heading level={2} id="error-handling">Error Handling</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The SDK provides structured error handling at multiple levels. Combine error
        boundaries with API error handling for comprehensive coverage.
      </p>
      <CodeBlock language="typescript" title="Handling API errors">
{`import { usePluginApi, PluginApiError } from '@acp/plugin-sdk';

function OrderActions({ orderId }: { orderId: number }) {
  const api = usePluginApi();
  const [error, setError] = useState<string | null>(null);

  const deleteOrder = async () => {
    try {
      await api.delete(\`/orders/\${orderId}\`);
    } catch (err) {
      if (err instanceof PluginApiError) {
        switch (err.status) {
          case 404:
            setError('Order not found. It may have been deleted.');
            break;
          case 403:
            setError('You do not have permission to delete this order.');
            break;
          default:
            setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={deleteOrder}>Delete Order</button>
    </div>
  );
}`}
      </CodeBlock>
      <PropsTable
        columns={['Error Type', 'When Thrown', 'Properties']}
        rows={[
          ['PluginApiError', 'Any non-2xx HTTP response from the plugin or core API.', 'status: number, message: string, response: Response, data?: unknown'],
          ['PluginSDKNotInitialized', 'A hook is used outside of a PluginPage context.', 'message: string'],
          ['ConfigValidationError', 'An invalid value is passed to updateConfig.', 'key: string, expected: string, received: string'],
        ]}
      />
    </div>
  );
}