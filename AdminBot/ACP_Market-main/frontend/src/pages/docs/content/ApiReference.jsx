import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function ApiReference() {
  return (
    <div>
      <Heading level={1} id="api-reference">API Reference</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The ACP Market REST API allows you to programmatically interact with the plugin marketplace.
        All endpoints return JSON responses and follow standard HTTP conventions. The base URL for
        all API requests is <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">/api/v1</span>.
      </p>

      <Callout type="info" title="Authentication">
        Most read endpoints are public. Endpoints that require authentication accept a Bearer
        token in the <span className="font-mono">Authorization</span> header. Obtain a token by
        authenticating through your ADMINCHAT Panel account. Endpoints marked with a lock icon
        require authentication.
      </Callout>

      {/* ── GET /plugins ───────────────────────────────────────── */}
      <Heading level={2} id="list-plugins">GET /plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        List and search plugins in the marketplace. Returns a paginated list of plugins matching
        the provided filters. All parameters are optional.
      </p>

      <Heading level={3} id="list-plugins-params">Query Parameters</Heading>
      <PropsTable
        columns={['Parameter', 'Type', 'Default', 'Description']}
        rows={[
          ['q', 'string', '""', 'Full-text search query. Matches against plugin name, description, and tags.'],
          ['category', 'string', '""', 'Filter by category slug (e.g. "bot-handlers", "api-extensions", "utilities").'],
          ['sort', 'string', '"newest"', 'Sort order. One of: newest, popular, updated, name.'],
          ['page', 'integer', '1', 'Page number for pagination (1-indexed).'],
          ['page_size', 'integer', '20', 'Number of results per page. Max 100.'],
          ['pricing', 'string', '""', 'Filter by pricing model. One of: free, paid, or empty for all.'],
          ['min_panel_version', 'string', '""', 'Only return plugins compatible with this Panel version (semver, e.g. "0.8.0").'],
          ['author_id', 'string', '""', 'Filter by author UUID to list all plugins by a specific developer.'],
        ]}
      />

      <Heading level={3} id="list-plugins-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl "https://market.adminchat.dev/api/v1/plugins?q=moderation&category=bot-handlers&sort=popular&page=1&page_size=10"`}
      </CodeBlock>

      <Heading level={3} id="list-plugins-response">Example Response</Heading>
      <CodeBlock language="json" title="200 OK">
        {`{
  "total": 42,
  "page": 1,
  "page_size": 10,
  "results": [
    {
      "id": "auto-moderator",
      "name": "Auto Moderator",
      "version": "2.1.0",
      "description": "Automated chat moderation with customizable rules and filters.",
      "author": {
        "id": "a1b2c3d4-...",
        "username": "coredev",
        "avatar_url": "https://..."
      },
      "category": "bot-handlers",
      "pricing": "free",
      "downloads": 12480,
      "rating": 4.7,
      "min_panel_version": "0.8.0",
      "created_at": "2025-09-15T10:30:00Z",
      "updated_at": "2026-02-20T14:15:00Z"
    }
  ]
}`}
      </CodeBlock>

      {/* ── GET /plugins/:id ───────────────────────────────────── */}
      <Heading level={2} id="get-plugin">GET /plugins/:plugin_id</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Retrieve full details for a single plugin, including its description, all published
        versions, permissions, capabilities, and author information.
      </p>

      <Heading level={3} id="get-plugin-params">Path Parameters</Heading>
      <PropsTable
        columns={['Parameter', 'Type', 'Description']}
        rows={[
          ['plugin_id', 'string', 'The unique plugin identifier (e.g. "auto-moderator").'],
        ]}
      />

      <Heading level={3} id="get-plugin-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl "https://market.adminchat.dev/api/v1/plugins/auto-moderator"`}
      </CodeBlock>

      <Heading level={3} id="get-plugin-response">Example Response</Heading>
      <CodeBlock language="json" title="200 OK">
        {`{
  "id": "auto-moderator",
  "name": "Auto Moderator",
  "version": "2.1.0",
  "description": "Automated chat moderation with customizable rules and filters.",
  "long_description": "Auto Moderator provides a comprehensive suite of tools...",
  "author": {
    "id": "a1b2c3d4-...",
    "username": "coredev",
    "avatar_url": "https://..."
  },
  "category": "bot-handlers",
  "pricing": "free",
  "downloads": 12480,
  "rating": 4.7,
  "min_panel_version": "0.8.0",
  "capabilities": ["bot_handlers", "settings_panel", "event_listeners"],
  "permissions": {
    "core_api_scopes": ["messages:read", "messages:write", "users:read"],
    "filesystem": ["config:rw"],
    "network": []
  },
  "versions": [
    { "version": "2.1.0", "released_at": "2026-02-20T14:15:00Z", "changelog": "Added regex filter support." },
    { "version": "2.0.0", "released_at": "2025-12-01T09:00:00Z", "changelog": "Major rewrite with new rule engine." }
  ],
  "created_at": "2025-09-15T10:30:00Z",
  "updated_at": "2026-02-20T14:15:00Z"
}`}
      </CodeBlock>

      {/* ── GET /plugins/:id/versions/:version ─────────────────── */}
      <Heading level={2} id="get-version">GET /plugins/:plugin_id/versions/:version</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Retrieve metadata for a specific version of a plugin, including the changelog, file
        hash, and compatibility information.
      </p>

      <Heading level={3} id="get-version-params">Path Parameters</Heading>
      <PropsTable
        columns={['Parameter', 'Type', 'Description']}
        rows={[
          ['plugin_id', 'string', 'The unique plugin identifier.'],
          ['version', 'string', 'Semver version string (e.g. "2.1.0").'],
        ]}
      />

      <Heading level={3} id="get-version-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl "https://market.adminchat.dev/api/v1/plugins/auto-moderator/versions/2.1.0"`}
      </CodeBlock>

      <Heading level={3} id="get-version-response">Example Response</Heading>
      <CodeBlock language="json" title="200 OK">
        {`{
  "plugin_id": "auto-moderator",
  "version": "2.1.0",
  "changelog": "Added regex filter support and improved performance for large channels.",
  "min_panel_version": "0.8.0",
  "file_hash": "sha256:a3f8c9d1e5b7...",
  "file_size": 245760,
  "released_at": "2026-02-20T14:15:00Z",
  "download_url": "/api/v1/plugins/auto-moderator/versions/2.1.0/download"
}`}
      </CodeBlock>

      {/* ── POST /plugins ──────────────────────────────────────── */}
      <Heading level={2} id="submit-plugin">POST /plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Submit a new plugin to the marketplace. This endpoint accepts a multipart form
        containing the plugin bundle and metadata. The plugin enters a review queue before
        being published.
      </p>

      <Callout type="warning" title="Authentication Required">
        This endpoint requires a valid Bearer token from an authenticated developer account.
      </Callout>

      <Heading level={3} id="submit-plugin-body">Request Body (multipart/form-data)</Heading>
      <PropsTable
        columns={['Field', 'Type', 'Required', 'Description']}
        rows={[
          ['bundle', 'file', 'Yes', 'The plugin bundle archive (.acp.zip). Max 50 MB.'],
          ['metadata', 'JSON string', 'Yes', 'JSON object containing plugin metadata: name, description, category, pricing, tags, etc.'],
        ]}
      />

      <Heading level={3} id="submit-plugin-metadata">Metadata Fields</Heading>
      <PropsTable
        columns={['Field', 'Type', 'Required', 'Description']}
        rows={[
          ['name', 'string', 'Yes', 'Human-readable plugin name (3-60 characters).'],
          ['description', 'string', 'Yes', 'Short description (10-200 characters).'],
          ['long_description', 'string', 'No', 'Extended description with markdown support (up to 10,000 characters).'],
          ['category', 'string', 'Yes', 'Plugin category slug.'],
          ['pricing', 'string', 'Yes', '"free" or "paid".'],
          ['price', 'number', 'If paid', 'Price in USD (e.g. 9.99). Required when pricing is "paid".'],
          ['tags', 'string[]', 'No', 'Array of search tags (max 10 tags, each 2-30 characters).'],
          ['homepage_url', 'string', 'No', 'URL to plugin homepage or repository.'],
          ['support_url', 'string', 'No', 'URL for support requests.'],
        ]}
      />

      <Heading level={3} id="submit-plugin-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl -X POST "https://market.adminchat.dev/api/v1/plugins" \\
  -H "Authorization: Bearer <token>" \\
  -F "bundle=@./dist/auto-moderator-2.1.0.acp.zip" \\
  -F 'metadata={
    "name": "Auto Moderator",
    "description": "Automated chat moderation with customizable rules.",
    "category": "bot-handlers",
    "pricing": "free",
    "tags": ["moderation", "filter", "automation"]
  }'`}
      </CodeBlock>

      <Heading level={3} id="submit-plugin-response">Example Response</Heading>
      <CodeBlock language="json" title="201 Created">
        {`{
  "id": "auto-moderator",
  "version": "2.1.0",
  "status": "pending_review",
  "message": "Plugin submitted successfully. It will be reviewed within 48 hours.",
  "review_url": "https://market.adminchat.dev/dashboard/submissions/auto-moderator"
}`}
      </CodeBlock>

      {/* ── POST /plugins/:id/versions ─────────────────────────── */}
      <Heading level={2} id="submit-version">POST /plugins/:plugin_id/versions</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Submit a new version for an existing plugin. The bundle must contain an updated
        manifest.json with a higher semver version. New versions also enter the review queue.
      </p>

      <Callout type="warning" title="Authentication Required">
        Only the original plugin author or designated maintainers can submit new versions.
      </Callout>

      <Heading level={3} id="submit-version-params">Path Parameters</Heading>
      <PropsTable
        columns={['Parameter', 'Type', 'Description']}
        rows={[
          ['plugin_id', 'string', 'The unique plugin identifier.'],
        ]}
      />

      <Heading level={3} id="submit-version-body">Request Body (multipart/form-data)</Heading>
      <PropsTable
        columns={['Field', 'Type', 'Required', 'Description']}
        rows={[
          ['bundle', 'file', 'Yes', 'The updated plugin bundle archive (.acp.zip). Max 50 MB.'],
          ['changelog', 'string', 'Yes', 'Description of changes in this version (10-2000 characters).'],
        ]}
      />

      <Heading level={3} id="submit-version-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl -X POST "https://market.adminchat.dev/api/v1/plugins/auto-moderator/versions" \\
  -H "Authorization: Bearer <token>" \\
  -F "bundle=@./dist/auto-moderator-2.2.0.acp.zip" \\
  -F "changelog=Added support for custom word lists and improved regex performance."`}
      </CodeBlock>

      <Heading level={3} id="submit-version-response">Example Response</Heading>
      <CodeBlock language="json" title="201 Created">
        {`{
  "plugin_id": "auto-moderator",
  "version": "2.2.0",
  "status": "pending_review",
  "message": "Version submitted successfully."
}`}
      </CodeBlock>

      {/* ── GET /plugins/:id/versions/:v/download ──────────────── */}
      <Heading level={2} id="download-plugin">GET /plugins/:plugin_id/versions/:version/download</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Download the plugin bundle for a specific version. Returns the binary .acp.zip file.
        For paid plugins, this endpoint verifies that the authenticated user holds a valid license.
      </p>

      <Callout type="danger" title="Authentication &amp; License Required">
        This endpoint requires authentication. For paid plugins, the requesting user must
        have an active license. Requests without a valid license will receive a 403 Forbidden
        response.
      </Callout>

      <Heading level={3} id="download-params">Path Parameters</Heading>
      <PropsTable
        columns={['Parameter', 'Type', 'Description']}
        rows={[
          ['plugin_id', 'string', 'The unique plugin identifier.'],
          ['version', 'string', 'Semver version string (e.g. "2.1.0").'],
        ]}
      />

      <Heading level={3} id="download-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl -O -J "https://market.adminchat.dev/api/v1/plugins/auto-moderator/versions/2.1.0/download" \\
  -H "Authorization: Bearer <token>"`}
      </CodeBlock>

      <Heading level={3} id="download-response">Response</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        On success, returns the binary file with <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Content-Type: application/zip</span> and
        a <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Content-Disposition</span> header
        containing the filename. On failure:
      </p>
      <PropsTable
        columns={['Status', 'Reason']}
        rows={[
          ['401 Unauthorized', 'Missing or invalid authentication token.'],
          ['403 Forbidden', 'Valid auth but no active license for this paid plugin.'],
          ['404 Not Found', 'Plugin or version does not exist.'],
        ]}
      />

      {/* ── POST /plugins/check-updates ────────────────────────── */}
      <Heading level={2} id="check-updates">POST /plugins/check-updates</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        Check for available updates for a batch of installed plugins. Send the currently
        installed versions and receive information about any newer versions available.
      </p>

      <Heading level={3} id="check-updates-body">Request Body (JSON)</Heading>
      <PropsTable
        columns={['Field', 'Type', 'Required', 'Description']}
        rows={[
          ['plugins', 'object[]', 'Yes', 'Array of objects, each with "id" (string) and "version" (string) of the installed plugin.'],
          ['panel_version', 'string', 'No', 'Current ADMINCHAT Panel version. If provided, only compatible updates are returned.'],
        ]}
      />

      <Heading level={3} id="check-updates-example">Example Request</Heading>
      <CodeBlock language="bash" title="cURL">
        {`curl -X POST "https://market.adminchat.dev/api/v1/plugins/check-updates" \\
  -H "Content-Type: application/json" \\
  -d '{
    "plugins": [
      { "id": "auto-moderator", "version": "2.0.0" },
      { "id": "welcome-bot", "version": "1.3.1" },
      { "id": "analytics-dashboard", "version": "3.0.0" }
    ],
    "panel_version": "0.9.2"
  }'`}
      </CodeBlock>

      <Heading level={3} id="check-updates-response">Example Response</Heading>
      <CodeBlock language="json" title="200 OK">
        {`{
  "updates": [
    {
      "id": "auto-moderator",
      "installed_version": "2.0.0",
      "latest_version": "2.1.0",
      "changelog": "Added regex filter support and improved performance.",
      "download_url": "/api/v1/plugins/auto-moderator/versions/2.1.0/download"
    },
    {
      "id": "welcome-bot",
      "installed_version": "1.3.1",
      "latest_version": "1.3.1",
      "changelog": null,
      "download_url": null
    }
  ]
}`}
      </CodeBlock>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Plugins that are already up to date are included in the response
        with <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">latest_version</span> equal
        to <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">installed_version</span> and
        null changelog/download_url. Plugins not found in the marketplace are omitted from the response.
      </p>

      {/* ── Error Responses ─────────────────────────────────────── */}
      <Heading level={2} id="errors">Error Responses</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-2">
        All error responses follow a consistent format:
      </p>
      <CodeBlock language="json" title="Error Format">
        {`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A human-readable description of the error.",
    "details": {}
  }
}`}
      </CodeBlock>

      <Heading level={3} id="error-codes">Common Error Codes</Heading>
      <PropsTable
        columns={['Code', 'HTTP Status', 'Description']}
        rows={[
          ['VALIDATION_ERROR', '400', 'Request parameters or body failed validation.'],
          ['UNAUTHORIZED', '401', 'Missing or invalid authentication token.'],
          ['FORBIDDEN', '403', 'Authenticated but lacking required permissions or license.'],
          ['NOT_FOUND', '404', 'The requested resource does not exist.'],
          ['CONFLICT', '409', 'A resource with the same identifier already exists.'],
          ['RATE_LIMITED', '429', 'Too many requests. Retry after the duration in the Retry-After header.'],
          ['INTERNAL_ERROR', '500', 'An unexpected server error occurred. Contact support if it persists.'],
        ]}
      />

      {/* ── Rate Limiting ───────────────────────────────────────── */}
      <Heading level={2} id="rate-limiting">Rate Limiting</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The API enforces rate limits to ensure fair usage. Public endpoints allow 60 requests
        per minute per IP. Authenticated endpoints allow 120 requests per minute per token.
        Rate limit information is included in response headers:
      </p>
      <PropsTable
        columns={['Header', 'Description']}
        rows={[
          ['X-RateLimit-Limit', 'Maximum number of requests allowed in the current window.'],
          ['X-RateLimit-Remaining', 'Number of requests remaining in the current window.'],
          ['X-RateLimit-Reset', 'Unix timestamp when the rate limit window resets.'],
          ['Retry-After', 'Seconds to wait before retrying (only present on 429 responses).'],
        ]}
      />
    </div>
  );
}
