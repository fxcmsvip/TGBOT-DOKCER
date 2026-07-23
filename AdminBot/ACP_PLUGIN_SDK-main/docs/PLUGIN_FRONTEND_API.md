# Plugin Frontend API Reference

> **Package:** `@acp/plugin-sdk`
> **Runtime:** React 18 + TypeScript + Vite
> **Module Federation:** webpack 5 compatible (via vite-plugin-federation)

This document defines the complete React/TypeScript SDK surface available to ADMINCHAT Panel plugins. Plugins are loaded as Module Federation remotes into the Panel host application.

---

## Table of Contents

1. [Package Installation](#1-package-installation)
2. [Hooks](#2-hooks)
3. [Components](#3-components)
4. [Vite Plugin Configuration](#4-vite-plugin-configuration)
5. [Type Exports](#5-type-exports)
6. [Module Federation Contract](#6-module-federation-contract)
7. [Routing](#7-routing)
8. [Error Handling](#8-error-handling)
9. [Development Workflow](#9-development-workflow)

---

## 1. Package Installation

```bash
npm install @acp/plugin-sdk
# or
pnpm add @acp/plugin-sdk
```

The SDK is published alongside each Panel release. Plugin SDK version must match the Panel version (see `SHARED_DEPS_CONTRACT.md` for the compatibility matrix).

---

## 2. Hooks

### 2.1 usePluginSDK()

The primary hook for accessing the SDK bridge. Returns the full SDK interface for API calls, config, and context.

```typescript
import { usePluginSDK } from '@acp/plugin-sdk'

function MyComponent() {
  const sdk = usePluginSDK()

  // Plugin API calls (calls /api/v1/p/{pluginId}/...)
  const fetchStats = async () => {
    const data = await sdk.api.get<StatsResponse>('/stats')
    return data
  }

  // Core API access (respects manifest scopes)
  const fetchUser = async (tgUid: number) => {
    const user = await sdk.coreApi.users.getByTgUid(tgUid)
    return user
  }

  // Plugin config
  const autoApprove = sdk.config.get('auto_approve')

  // Context
  console.log(sdk.pluginId)     // "movie-request"
  console.log(sdk.currentUser)  // { id: 5, username: "admin1", role: "admin" }
}
```

#### Return Type: `PluginSDK`

```typescript
interface PluginSDK {
  /** Plugin's own API client — routes relative to /api/v1/p/{pluginId}/ */
  api: PluginApiClient

  /** Core platform API client — respects manifest scopes */
  coreApi: CoreApiClient

  /** Plugin configuration from manifest.config_schema */
  config: PluginConfigClient

  /** Current authenticated admin user */
  currentUser: AdminUser

  /** This plugin's unique identifier */
  pluginId: string
}
```

#### sdk.api — Plugin API Client

All paths are relative to `/api/v1/p/{pluginId}/`.

```typescript
interface PluginApiClient {
  get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T>
  post<T = unknown>(path: string, body?: unknown): Promise<T>
  patch<T = unknown>(path: string, body?: unknown): Promise<T>
  put<T = unknown>(path: string, body?: unknown): Promise<T>
  delete<T = unknown>(path: string): Promise<T>
}
```

**Usage:**

```typescript
const sdk = usePluginSDK()

// GET /api/v1/p/movie-request/requests?status=pending&page=1
const requests = await sdk.api.get<RequestList>('/requests', {
  status: 'pending',
  page: 1,
})

// POST /api/v1/p/movie-request/requests
const newReq = await sdk.api.post<MovieRequest>('/requests', {
  tmdb_id: 550,
  title: 'Fight Club',
  year: 1999,
})

// PATCH /api/v1/p/movie-request/requests/42
await sdk.api.patch('/requests/42', { status: 'approved' })

// DELETE /api/v1/p/movie-request/requests/42
await sdk.api.delete('/requests/42')
```

#### sdk.coreApi — Core API Client

Access to core platform data. Each method requires the corresponding scope in `manifest.json`.

```typescript
interface CoreApiClient {
  users: {
    /** Requires scope: "users:read" */
    getById(id: number): Promise<User | null>
    getByTgUid(tgUid: number): Promise<User | null>
    search(params: { username?: string; limit?: number }): Promise<User[]>
  }
  bots: {
    /** Requires scope: "bots:read" */
    getActive(): Promise<Bot[]>
    getById(id: number): Promise<Bot | null>
  }
  conversations: {
    /** Requires scope: "conversations:read" */
    getByUser(tgUserId: number): Promise<Conversation[]>
  }
  messages: {
    /** Requires scope: "messages:read" */
    getRecent(conversationId: number, limit?: number): Promise<Message[]>
  }
}
```

#### sdk.config — Plugin Config Client

```typescript
interface PluginConfigClient {
  /** Get a config value. Returns the schema default if not explicitly set. */
  get<T = unknown>(key: string): T

  /** Update a config value. Validates against the manifest config_schema. */
  set(key: string, value: unknown): Promise<void>

  /** Get all config key-value pairs. */
  getAll(): Record<string, unknown>
}
```

---

### 2.2 usePluginConfig()

Convenience hook for reactive config access. Re-renders when config changes.

```typescript
import { usePluginConfig } from '@acp/plugin-sdk'

function SettingsPanel() {
  const { config, setConfig, isLoading } = usePluginConfig()

  if (isLoading) return <Spinner />

  return (
    <div>
      <Toggle
        checked={config.auto_approve as boolean}
        onChange={(v) => setConfig('auto_approve', v)}
      />
    </div>
  )
}
```

#### Return Type

```typescript
interface UsePluginConfigReturn {
  /** Current config values (reactive) */
  config: Record<string, unknown>

  /** Update a single config value */
  setConfig: (key: string, value: unknown) => Promise<void>

  /** Loading state during initial fetch */
  isLoading: boolean

  /** Error during config fetch/update */
  error: Error | null
}
```

---

### 2.3 useCurrentUser()

Returns the currently authenticated admin user.

```typescript
import { useCurrentUser } from '@acp/plugin-sdk'

function UserInfo() {
  const user = useCurrentUser()

  return (
    <span>
      Logged in as {user.username} ({user.role})
    </span>
  )
}
```

#### Return Type: `AdminUser`

```typescript
interface AdminUser {
  id: number
  username: string
  role: 'superadmin' | 'admin' | 'agent'
}
```

---

### 2.4 usePluginTranslation()

Internationalization hook for plugin-provided translation files.

```typescript
import { usePluginTranslation } from '@acp/plugin-sdk'

function MyComponent() {
  const { t, locale, setLocale } = usePluginTranslation()

  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('page.description', { count: 5 })}</p>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="ja">Japanese</option>
      </select>
    </div>
  )
}
```

#### Translation File Structure

```
my-plugin/
  locales/
    en.json   { "page.title": "Movie Requests", "page.description": "{{count}} requests" }
    ja.json   { "page.title": "映画リクエスト", "page.description": "{{count}} 件のリクエスト" }
```

#### Return Type

```typescript
interface UsePluginTranslationReturn {
  /** Translate a key, with optional interpolation */
  t: (key: string, params?: Record<string, string | number>) => string

  /** Current locale code */
  locale: string

  /** Switch locale */
  setLocale: (locale: string) => void
}
```

---

### 2.5 usePluginQuery()

TanStack Query wrapper pre-configured for plugin API calls with proper query key scoping.

```typescript
import { usePluginQuery, usePluginMutation } from '@acp/plugin-sdk'

function RequestsList() {
  // GET /api/v1/p/{pluginId}/requests?status=pending
  const { data, isLoading, error } = usePluginQuery<MovieRequest[]>({
    path: '/requests',
    params: { status: 'pending' },
    queryKey: ['requests', 'pending'],  // Scoped under [pluginId, ...]
  })

  // POST mutation
  const createMutation = usePluginMutation<MovieRequest, CreateRequestBody>({
    method: 'post',
    path: '/requests',
    invalidateKeys: [['requests']],  // Auto-invalidate after success
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorState message={error.message} />

  return (
    <div>
      {data?.map((req) => (
        <div key={req.id}>{req.title}</div>
      ))}
      <button onClick={() => createMutation.mutate({ tmdb_id: 550, title: 'Fight Club' })}>
        Add
      </button>
    </div>
  )
}
```

#### usePluginQuery Options

```typescript
interface UsePluginQueryOptions<T> {
  /** API path relative to /api/v1/p/{pluginId}/ */
  path: string

  /** Query parameters */
  params?: Record<string, unknown>

  /** TanStack Query key (auto-prefixed with pluginId) */
  queryKey: unknown[]

  /** Standard TanStack Query options */
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
}
```

#### usePluginMutation Options

```typescript
interface UsePluginMutationOptions<TData, TBody> {
  /** HTTP method */
  method: 'post' | 'patch' | 'put' | 'delete'

  /** API path relative to /api/v1/p/{pluginId}/ */
  path: string | ((variables: TBody) => string)

  /** Query keys to invalidate on success */
  invalidateKeys?: unknown[][]

  /** Standard TanStack Query mutation callbacks */
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}
```

---

### 2.6 usePluginWebSocket()

Subscribe to real-time events from the plugin's WebSocket channel.

```typescript
import { usePluginWebSocket } from '@acp/plugin-sdk'

function LiveUpdates() {
  const { lastMessage, isConnected, sendMessage } = usePluginWebSocket({
    onMessage: (event: PluginWSEvent) => {
      if (event.type === 'request.updated') {
        // Handle real-time update
      }
    },
  })

  return <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
}
```

---

## 3. Components

Pre-built React components that match the ADMINCHAT Panel design system. Using these components ensures visual consistency between plugins and the core Panel.

### 3.1 PluginPage

Page wrapper that provides the standard header layout.

```typescript
import { PluginPage } from '@acp/plugin-sdk'
import { Film } from 'lucide-react'

function MovieRequests() {
  return (
    <PluginPage
      title="Movie Requests"
      subtitle="Manage user movie requests"
      icon={<Film size={20} />}
      actions={
        <button className="bg-[#00D9FF] text-black px-4 py-2 rounded-lg text-sm font-medium">
          New Request
        </button>
      }
    >
      {/* Page content */}
    </PluginPage>
  )
}
```

#### Props

```typescript
interface PluginPageProps {
  /** Page title displayed in the header */
  title: string

  /** Optional subtitle below the title */
  subtitle?: string

  /** Icon displayed next to the title (lucide-react recommended, size 20) */
  icon?: React.ReactNode

  /** Action buttons rendered in the header right side */
  actions?: React.ReactNode

  /** Page content */
  children: React.ReactNode
}
```

---

### 3.2 StatCard

Stats display card for dashboard-style summaries.

```typescript
import { StatCard } from '@acp/plugin-sdk'
import { Film, Clock, CheckCircle, XCircle } from 'lucide-react'

function StatsRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Total Requests"
        value={142}
        icon={<Film size={16} />}
        iconBg="#00D9FF"
      />
      <StatCard
        label="Pending"
        value={23}
        icon={<Clock size={16} />}
        iconBg="#FF8800"
      />
      <StatCard
        label="Approved"
        value={98}
        icon={<CheckCircle size={16} />}
        iconBg="#059669"
      />
      <StatCard
        label="Rejected"
        value={21}
        icon={<XCircle size={16} />}
        iconBg="#FF4444"
      />
    </div>
  )
}
```

#### Props

```typescript
interface StatCardProps {
  /** Descriptive label */
  label: string

  /** Numeric or string value displayed prominently */
  value: string | number

  /** Icon element (lucide-react, size 16) */
  icon: React.ReactNode

  /** Background color for the icon container */
  iconBg: string

  /** Optional trend indicator: "+12%" */
  trend?: string

  /** Trend direction for color coding */
  trendDirection?: 'up' | 'down' | 'neutral'
}
```

---

### 3.3 DataTable

Full-featured data table with sorting, pagination, and row actions.

```typescript
import { DataTable, type Column } from '@acp/plugin-sdk'

const columns: Column<MovieRequest>[] = [
  {
    key: 'id',
    header: 'ID',
    width: 80,
    render: (row) => (
      <span className="font-mono text-xs text-[#8a8a8a]">#{row.id}</span>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'created_at',
    header: 'Date',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
]

function RequestsTable({ data, pagination }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      pagination={{
        page: pagination.page,
        totalPages: pagination.totalPages,
        onPageChange: pagination.setPage,
      }}
      onRowClick={(row) => console.log('Clicked:', row.id)}
      emptyState={<EmptyState icon="film" message="No requests yet" />}
    />
  )
}
```

#### Props

```typescript
interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[]

  /** Row data array */
  data: T[]

  /** Pagination config */
  pagination?: {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
  }

  /** Row click handler */
  onRowClick?: (row: T) => void

  /** Rendered when data is empty */
  emptyState?: React.ReactNode

  /** Show loading skeleton */
  isLoading?: boolean

  /** Number of skeleton rows when loading */
  skeletonRows?: number
}

interface Column<T> {
  /** Unique key matching a field on T */
  key: string

  /** Header text */
  header: string

  /** Column width in pixels */
  width?: number

  /** Enable column sorting */
  sortable?: boolean

  /** Custom cell renderer */
  render?: (row: T) => React.ReactNode
}
```

---

### 3.4 StatusBadge

Status pill with color coding.

```typescript
import { StatusBadge } from '@acp/plugin-sdk'

<StatusBadge status="pending" />   // Orange background
<StatusBadge status="active" />    // Green background
<StatusBadge status="approved" />  // Green background
<StatusBadge status="error" />     // Red background
<StatusBadge status="rejected" />  // Red background
<StatusBadge status="disabled" />  // Gray background
<StatusBadge status="info" />      // Cyan background
```

#### Props

```typescript
interface StatusBadgeProps {
  /** Status string — mapped to preset colors, or use variant for explicit color */
  status: string

  /** Override the display text (defaults to status with first letter capitalized) */
  label?: string

  /** Explicit color variant instead of auto-mapping */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple'
}
```

#### Auto Color Mapping

| Status values | Color | Hex |
|---------------|-------|-----|
| `active`, `approved`, `success`, `online`, `running` | Green | `#059669` |
| `pending`, `warning`, `waiting`, `queued` | Orange | `#FF8800` |
| `error`, `rejected`, `failed`, `blocked`, `offline` | Red | `#FF4444` |
| `info`, `new`, `open` | Cyan | `#00D9FF` |
| `disabled`, `inactive`, `closed`, `archived` | Gray | `#6a6a6a` |
| `role`, `premium`, `vip` | Purple | `#8B5CF6` |

---

### 3.5 CardContainer

Standard card wrapper matching Panel's visual style.

```typescript
import { CardContainer } from '@acp/plugin-sdk'

<CardContainer>
  <h3 className="text-white font-medium mb-4">Section Title</h3>
  <p className="text-[#8a8a8a] text-sm">Card content goes here.</p>
</CardContainer>

// With custom padding
<CardContainer padding="p-8">
  <p>More spacious card</p>
</CardContainer>
```

#### Props

```typescript
interface CardContainerProps {
  children: React.ReactNode

  /** Override default padding (default: "p-5") */
  padding?: string

  /** Additional CSS classes */
  className?: string
}
```

---

### 3.6 TabNav

Tab navigation component.

```typescript
import { TabNav } from '@acp/plugin-sdk'
import { useState } from 'react'

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div>
      <TabNav
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'api', label: 'API Settings' },
          { id: 'advanced', label: 'Advanced' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'api' && <ApiSettings />}
      {activeTab === 'advanced' && <AdvancedSettings />}
    </div>
  )
}
```

#### Props

```typescript
interface TabNavProps {
  tabs: Array<{
    id: string
    label: string
    icon?: React.ReactNode
    badge?: string | number
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
}
```

---

### 3.7 ConfirmDialog

Modal confirmation dialog.

```typescript
import { ConfirmDialog } from '@acp/plugin-sdk'

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Delete</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Request"
        description="Are you sure you want to delete this request? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={onConfirm}
      />
    </>
  )
}
```

#### Props

```typescript
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string        // Default: "Confirm"
  cancelLabel?: string         // Default: "Cancel"
  confirmVariant?: 'primary' | 'danger'  // Default: "primary"
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}
```

---

### 3.8 EmptyState

Placeholder for empty data views.

```typescript
import { EmptyState } from '@acp/plugin-sdk'
import { Film } from 'lucide-react'

<EmptyState
  icon={<Film size={48} className="text-[#4a4a4a]" />}
  message="No movie requests yet"
  description="Requests will appear here when users submit them via the bot."
  action={
    <button className="bg-[#00D9FF] text-black px-4 py-2 rounded-lg text-sm">
      Import Requests
    </button>
  }
/>
```

#### Props

```typescript
interface EmptyStateProps {
  icon: React.ReactNode
  message: string
  description?: string
  action?: React.ReactNode
}
```

---

### 3.9 Spinner

Loading spinner matching Panel's style.

```typescript
import { Spinner } from '@acp/plugin-sdk'

<Spinner />                    // Default size (20px), cyan color
<Spinner size={16} />          // Smaller
<Spinner color="#FF8800" />    // Custom color
```

#### Props

```typescript
interface SpinnerProps {
  size?: number       // Default: 20
  color?: string      // Default: "#00D9FF"
  className?: string
}
```

---

### 3.10 FormField

Styled form input wrapper with label and error state.

```typescript
import { FormField } from '@acp/plugin-sdk'

<FormField label="API Key" error={errors.apiKey}>
  <input
    type="text"
    value={apiKey}
    onChange={(e) => setApiKey(e.target.value)}
    className="w-full bg-[#141414] border border-[#2f2f2f] rounded-lg px-3 py-2 text-white text-sm
               placeholder-[#4a4a4a] focus:border-[#00D9FF] focus:outline-none"
    placeholder="Enter your API key"
  />
</FormField>
```

#### Props

```typescript
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}
```

---

## 4. Vite Plugin Configuration

The `@acp/plugin-sdk/vite` package provides a Vite plugin that configures Module Federation for plugin development.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { acpPlugin } from '@acp/plugin-sdk/vite'

export default defineConfig({
  plugins: [
    react(),
    acpPlugin({
      // Must match manifest.json plugin_id
      pluginId: 'movie-request',

      // Modules exposed to the Panel host
      exposes: {
        // Main plugin pages (rendered at /p/movie-request/*)
        './pages/MovieRequests': './src/pages/MovieRequests.tsx',
        './pages/RequestDetail': './src/pages/RequestDetail.tsx',

        // Settings tabs (rendered in Plugin Settings UI)
        './settings/TmdbTab': './src/settings/TmdbTab.tsx',
        './settings/GeneralTab': './src/settings/GeneralTab.tsx',
      },

      // Plugin's frontend port for dev mode
      devPort: 5174,
    }),
  ],
})
```

### acpPlugin Options

```typescript
interface ACPPluginOptions {
  /** Must match manifest.json plugin_id */
  pluginId: string

  /** Module Federation exposes map */
  exposes: Record<string, string>

  /** Dev server port (default: 5174) */
  devPort?: number
}
```

### What acpPlugin() Does

1. Configures `@originjs/vite-plugin-federation` with the correct remote entry name
2. Sets up shared dependencies (React, React-DOM, etc.) as singletons
3. Configures the build output for production deployment
4. Sets up HMR proxy for development mode

### Build Output

```
dist/
  assets/
    remoteEntry.js        # Module Federation remote entry
    *.js                  # Chunked modules
    *.css                 # Extracted styles
```

---

## 5. Type Exports

All TypeScript types are exported from `@acp/plugin-sdk`.

```typescript
import type {
  // Core data types
  User,
  Bot,
  Conversation,
  Message,
  AdminUser,

  // SDK interfaces
  PluginSDK,
  PluginApiClient,
  CoreApiClient,
  PluginConfigClient,

  // Component props
  PluginPageProps,
  StatCardProps,
  DataTableProps,
  Column,
  StatusBadgeProps,
  CardContainerProps,
  TabNavProps,
  ConfirmDialogProps,
  EmptyStateProps,
  SpinnerProps,
  FormFieldProps,

  // Hook return types
  UsePluginConfigReturn,
  UsePluginTranslationReturn,
  UsePluginQueryOptions,
  UsePluginMutationOptions,

  // Manifest types
  PluginManifest,
  ConfigFieldSchema,

  // Event types
  PluginWSEvent,
} from '@acp/plugin-sdk'
```

### Core Data Types

```typescript
interface User {
  id: number
  tg_uid: number
  username: string | null
  first_name: string
  last_name: string | null
  is_blocked: boolean
  is_premium: boolean
  created_at: string  // ISO 8601
}

interface Bot {
  id: number
  bot_username: string
  display_name: string
  status: 'running' | 'stopped' | 'error'
  created_at: string
}

interface Conversation {
  id: number
  bot_id: number
  tg_user_id: number
  status: 'open' | 'closed' | 'archived'
  assigned_admin_id: number | null
  created_at: string
  updated_at: string
}

interface Message {
  id: number
  conversation_id: number
  tg_message_id: number
  direction: 'incoming' | 'outgoing'
  content_type: 'text' | 'photo' | 'document' | 'sticker' | 'voice' | 'video' | 'animation'
  text: string | null
  media_file_id: string | null
  sender_admin_id: number | null
  created_at: string
}

interface AdminUser {
  id: number
  username: string
  role: 'superadmin' | 'admin' | 'agent'
}
```

### Plugin Manifest Type

```typescript
interface PluginManifest {
  plugin_id: string
  name: string
  version: string
  description: string
  author: string
  license: string
  min_panel_version: string
  max_panel_version?: string

  core_api_scopes: string[]

  config_schema?: Record<string, ConfigFieldSchema>

  frontend?: {
    pages: Array<{
      path: string
      title: string
      icon: string          // lucide-react icon name
      nav_section: string   // "main" | "settings" | "tools"
    }>
    settings_tabs?: Array<{
      id: string
      title: string
      module: string        // e.g., "./settings/TmdbTab"
    }>
  }

  bot_commands?: Array<{
    command: string
    description: string
  }>
}

interface ConfigFieldSchema {
  type: 'string' | 'integer' | 'float' | 'boolean' | 'select'
  default: unknown
  label: string
  description?: string
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  pattern?: string
  options?: Array<{ value: string; label: string }>
}
```

### WebSocket Event Type

```typescript
interface PluginWSEvent {
  type: string               // Event type, e.g., "request.updated"
  plugin_id: string          // Source plugin
  data: Record<string, unknown>
  timestamp: string          // ISO 8601
}
```

---

## 6. Module Federation Contract

Plugins are loaded into the Panel host via Module Federation. This section explains the integration mechanism.

### How It Works

1. The Panel (host) maintains a registry of active plugins and their remote entry URLs.
2. When a user navigates to `/p/{plugin_id}/...`, the Panel dynamically loads the plugin's `remoteEntry.js`.
3. The exposed page component is rendered inside the Panel's layout (sidebar + header remain visible).
4. Shared dependencies (React, React-DOM, etc.) are provided by the host — not bundled in the plugin.

### Shared Dependencies from Host

The Panel host provides these packages. Plugins MUST NOT bundle them:

| Package | Singleton | Notes |
|---------|-----------|-------|
| `react` | Yes | Provided by host, single instance |
| `react-dom` | Yes | Provided by host, single instance |
| `react-router-dom` | Yes | Provided by host, single instance |
| `@tanstack/react-query` | Yes | Shares the host's QueryClient |
| `@acp/plugin-sdk` | Yes | SDK version must match host |

Plugins CAN bundle their own copies of:

| Package | Singleton | Notes |
|---------|-----------|-------|
| `zustand` | No | Plugins get their own stores |
| `lucide-react` | No | Tree-shakeable, bundle only used icons |
| Other libraries | No | Any library not in the shared list |

### Remote Entry Configuration

The Panel configures each plugin remote as:

```javascript
// Panel's vite.config.ts (host)
federation({
  name: 'acp-panel',
  remotes: {
    // Dynamically generated from plugin registry
    'plugin-movie-request': 'http://localhost:5174/assets/remoteEntry.js',
  },
  shared: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@acp/plugin-sdk'],
})
```

### Error Handling for Failed Remote Loads

The Panel wraps all remote module loads in an error boundary:

```typescript
// What the Panel does internally — plugins don't need to implement this
<PluginErrorBoundary pluginId="movie-request">
  <Suspense fallback={<PluginLoadingSkeleton />}>
    <RemotePluginPage />
  </Suspense>
</PluginErrorBoundary>
```

If a plugin's `remoteEntry.js` fails to load (network error, 404, etc.):
- The error boundary catches it and shows an error UI with the plugin name
- The Panel logs the error
- Other plugins and core Panel functionality are unaffected
- The admin can retry loading from the error UI

### Production Deployment

In production, plugin remote entries are served from:
```
/plugins/{plugin_id}/assets/remoteEntry.js
```

The Panel's Nginx/reverse proxy routes these to the appropriate plugin build artifacts.

---

## 7. Routing

### Plugin Pages

Plugin pages are mounted at `/p/{plugin_id}/{path}` in the Panel's router.

```typescript
// manifest.json
{
  "frontend": {
    "pages": [
      {
        "path": "requests",           // Mounted at /p/movie-request/requests
        "title": "Movie Requests",
        "icon": "Film",               // lucide-react icon name
        "nav_section": "main"
      },
      {
        "path": "settings",
        "title": "Settings",
        "icon": "Settings",
        "nav_section": "settings"
      }
    ]
  }
}
```

### Internal Navigation

Use `react-router-dom` for navigation within the plugin. Paths are relative to the plugin root.

```typescript
import { useNavigate, Link } from 'react-router-dom'

function RequestRow({ id }: { id: number }) {
  const navigate = useNavigate()

  return (
    <div onClick={() => navigate(`/p/movie-request/detail/${id}`)}>
      <Link to={`/p/movie-request/detail/${id}`}>View Detail</Link>
    </div>
  )
}
```

### Settings Tabs

Plugin settings tabs are rendered inside the Panel's Plugin Settings page:

```typescript
// manifest.json
{
  "frontend": {
    "settings_tabs": [
      {
        "id": "tmdb",
        "title": "TMDB API",
        "module": "./settings/TmdbTab"   // Exposed module name
      },
      {
        "id": "general",
        "title": "General",
        "module": "./settings/GeneralTab"
      }
    ]
  }
}
```

---

## 8. Error Handling

### SDK Errors

```typescript
import { PluginSDKError, PermissionDeniedError, NotFoundError } from '@acp/plugin-sdk'

try {
  const user = await sdk.coreApi.users.getByTgUid(123)
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    // Plugin lacks "users:read" scope
    console.error('Missing scope:', error.requiredScope)
  } else if (error instanceof NotFoundError) {
    // Resource not found
  } else if (error instanceof PluginSDKError) {
    // General SDK error
    console.error(error.message, error.statusCode)
  }
}
```

### Error Types

```typescript
class PluginSDKError extends Error {
  statusCode: number
  message: string
}

class PermissionDeniedError extends PluginSDKError {
  requiredScope: string
}

class NotFoundError extends PluginSDKError {}

class ValidationError extends PluginSDKError {
  fieldErrors: Record<string, string>
}

class RateLimitError extends PluginSDKError {
  retryAfterMs: number
}
```

---

## 9. Development Workflow

### Local Development

```bash
# 1. Start the Panel in dev mode
cd panel/
pnpm dev   # Runs on http://localhost:5173

# 2. In another terminal, start the plugin dev server
cd my-plugin/
pnpm dev   # Runs on http://localhost:5174 (configured in vite.config.ts)

# 3. Register the plugin in the Panel dev config
# Panel auto-discovers plugins with dev servers running on configured ports
```

### Dev Mode Features

- Hot Module Replacement (HMR) works across the federation boundary
- Plugin changes are reflected instantly in the Panel
- SDK hooks connect to the real Panel backend
- Console logging includes `[plugin:movie-request]` prefix

### Building for Production

```bash
pnpm build
# Output: dist/assets/remoteEntry.js + chunks
```

### Plugin CLI

```bash
npx @acp/plugin-cli create my-plugin     # Scaffold a new plugin
npx @acp/plugin-cli dev                  # Start dev server
npx @acp/plugin-cli build                # Production build
npx @acp/plugin-cli package              # Create .acp-plugin archive
npx @acp/plugin-cli validate             # Validate manifest and structure
```
