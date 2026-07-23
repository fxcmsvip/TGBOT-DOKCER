import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function PluginLifecycle() {
  return (
    <div>
      <Heading level={1} id="plugin-lifecycle">Plugin Lifecycle Specification</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every plugin in the ADMINCHAT ecosystem follows a well-defined state machine that
        governs its entire lifecycle — from first appearing in the Market catalog through
        installation, activation, updates, and eventual uninstallation. This document
        specifies every state, transition, health monitoring rule, and data retention
        policy.
      </p>

      {/* ── State Machine Overview ────────────────────────────── */}
      <Heading level={2} id="state-machine">State Machine Overview</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin lifecycle is modeled as a finite state machine with 8 states and 13
        transitions. Each state represents a distinct operational configuration of the
        plugin.
      </p>

      <CodeBlock language="text" title="Plugin State Machine Diagram">
{`                          ┌──────────────────┐
                          │    available      │
                          │  (in Market only) │
                          └────────┬─────────┘
                                   │ install
                                   ▼
                          ┌──────────────────┐
              ┌───────────│   downloading     │───────────┐
              │           └──────────────────┘            │
              │ verify_fail         │ verify_success      │
              ▼                     ▼                     │
     ┌──────────────┐    ┌──────────────────┐            │
     │    error      │◄───│    installed      │            │
     │               │    │  (on disk, idle)  │            │
     └──────┬───────┘    └────────┬─────────┘            │
            │                     │ activate              │
            │ acknowledge_error   ▼                       │
            │            ┌──────────────────┐             │
            │            │     active        │◄────┐      │
            │            │ (fully running)   │     │      │
            │            └───┬──────┬───┬───┘     │      │
            │                │      │   │          │      │
            │       disable  │      │   │ update_  │      │
            │                │      │   │ start    │      │
            │                ▼      │   ▼          │      │
            │     ┌──────────┐  │  ┌──────────┐   │      │
            │     │ disabled  │  │  │ updating  │───┘      │
            │     └──────────┘  │  └─────┬────┘           │
            │                   │        │ update_fail     │
            │                   │        ▼                 │
            │                   │  ┌──────────┐           │
            │                   │  │  error    │           │
            │                   │  └──────────┘           │
            │                   │                         │
            │                   │ uninstall               │
            │                   ▼                         │
            │          ┌──────────────────┐               │
            └─────────►│   uninstalling    │◄──────────────┘
                       │ (cleanup phase)  │
                       └────────┬─────────┘
                                │ cleanup
                                ▼
                       ┌──────────────────┐
                       │    (removed)      │
                       └──────────────────┘`}
      </CodeBlock>

      {/* ── State Descriptions ────────────────────────────────── */}
      <Heading level={2} id="state-descriptions">State Descriptions</Heading>

      <Heading level={3} id="state-available">available</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin exists in the ACP Market catalog but has not been downloaded or installed
        on this Panel instance. It is visible in the Market browse UI.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'No'],
          ['Routes registered', 'No'],
          ['Bot handlers active', 'No'],
          ['Database tables exist', 'No'],
          ['Config stored', 'No'],
          ['Visible in Panel sidebar', 'No'],
        ]}
      />

      <Heading level={3} id="state-downloading">downloading</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin bundle is being fetched from the Market CDN. The Panel displays a
        download progress indicator. This is a transient state.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Partial (downloading)'],
          ['Routes registered', 'No'],
          ['Bot handlers active', 'No'],
          ['Database tables exist', 'No'],
          ['Config stored', 'No — install metadata only'],
          ['Visible in Panel sidebar', 'No (shown in install queue)'],
        ]}
      />

      <Heading level={3} id="state-installed">installed</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin bundle has been downloaded and verified (signature + hash). Code exists
        on disk but the plugin is not running. No routes are registered and no background
        tasks are active. The admin can review permissions before activating.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Yes (verified)'],
          ['Routes registered', 'No'],
          ['Bot handlers active', 'No'],
          ['Database tables exist', 'No (created on first activation)'],
          ['Config stored', 'Default config from manifest'],
          ['Visible in Panel sidebar', 'Yes (as "Installed — Inactive")'],
        ]}
      />

      <Heading level={3} id="state-active">active</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin is fully operational. Frontend components are rendered in the Panel,
        backend routes are registered, bot handlers are listening, and scheduled tasks
        are running.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Yes'],
          ['Routes registered', 'Yes'],
          ['Bot handlers active', 'Yes'],
          ['Database tables exist', 'Yes (created/migrated)'],
          ['Config stored', 'Yes (admin-configurable)'],
          ['Visible in Panel sidebar', 'Yes (fully functional)'],
        ]}
      />

      <Heading level={3} id="state-disabled">disabled</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin has been deactivated by the admin or by the health monitor. Code remains
        on disk, database tables are preserved, but all runtime components are torn down.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Yes'],
          ['Routes registered', 'No (unregistered on disable)'],
          ['Bot handlers active', 'No (detached on disable)'],
          ['Database tables exist', 'Yes (preserved)'],
          ['Config stored', 'Yes (preserved)'],
          ['Visible in Panel sidebar', 'Yes (as "Disabled")'],
        ]}
      />

      <Heading level={3} id="state-error">error</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin has entered an error state due to verification failure, repeated crashes,
        health check failures, or a failed update. All runtime components are torn down.
        Admin intervention is required to resolve.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Yes (may be corrupted)'],
          ['Routes registered', 'No'],
          ['Bot handlers active', 'No'],
          ['Database tables exist', 'Yes (preserved for recovery)'],
          ['Config stored', 'Yes (preserved)'],
          ['Visible in Panel sidebar', 'Yes (as "Error — Action Required")'],
        ]}
      />

      <Heading level={3} id="state-updating">updating</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        A new version of the plugin is being downloaded and prepared. The previous version
        continues to serve traffic until the update is verified and hot-swapped.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Yes (old version active, new version downloading)'],
          ['Routes registered', 'Yes (old version serving)'],
          ['Bot handlers active', 'Yes (old version handling)'],
          ['Database tables exist', 'Yes (migration pending)'],
          ['Config stored', 'Yes (old config, new defaults merged on completion)'],
          ['Visible in Panel sidebar', 'Yes (as "Updating...")'],
        ]}
      />

      <Heading level={3} id="state-uninstalling">uninstalling</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The plugin is being removed. Runtime components are torn down first, then data
        cleanup proceeds according to the data retention policy.
      </p>
      <PropsTable
        columns={['Property', 'Value']}
        rows={[
          ['Code on disk', 'Being deleted'],
          ['Routes registered', 'No (unregistered first)'],
          ['Bot handlers active', 'No (detached first)'],
          ['Database tables exist', 'Pending deletion (grace period)'],
          ['Config stored', 'Pending deletion'],
          ['Visible in Panel sidebar', 'Yes (as "Uninstalling...")'],
        ]}
      />

      {/* ── State Transitions ─────────────────────────────────── */}
      <Heading level={2} id="state-transitions">State Transitions</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The following table documents all 13 valid state transitions. Any transition not
        listed here is illegal and will be rejected by the lifecycle engine.
      </p>

      <PropsTable
        columns={['#', 'Transition', 'From', 'To', 'Trigger', 'Side Effects']}
        rows={[
          ['1', 'install', 'available', 'downloading', 'Admin clicks "Install"', 'Bundle download starts, progress tracked'],
          ['2', 'verify_success', 'downloading', 'installed', 'Bundle signature + hash verified', 'Files extracted to plugin directory'],
          ['3', 'verify_fail', 'downloading', 'error', 'Signature or hash mismatch', 'Partial files quarantined, admin notified'],
          ['4', 'activate', 'installed', 'active', 'Admin clicks "Activate"', 'DB migration runs, routes registered, handlers attached'],
          ['5', 'disable', 'active', 'disabled', 'Admin clicks "Disable"', 'Routes unregistered, handlers detached, cron jobs stopped'],
          ['6', 'auto_disable', 'active', 'disabled', 'Health monitor threshold exceeded', 'Same as disable + incident logged'],
          ['7', 'update_start', 'active', 'updating', 'New version available, admin approves', 'New bundle download begins alongside running version'],
          ['8', 'update_success', 'updating', 'active', 'New version verified + hot-swapped', 'Old version archived, new version serves traffic'],
          ['9', 'update_rollback', 'updating', 'active', 'Health check fails after swap', 'New version removed, old version restored'],
          ['10', 'update_fail', 'updating', 'error', 'Download or verification fails', 'Old version stopped, error state entered'],
          ['11', 'uninstall', 'installed | active | disabled | error', 'uninstalling', 'Admin clicks "Uninstall"', 'Teardown sequence initiated'],
          ['12', 'acknowledge_error', 'error', 'installed', 'Admin reviews and acknowledges', 'Error cleared, plugin ready for re-activation'],
          ['13', 'cleanup', 'uninstalling', '(removed)', 'Teardown sequence completes', 'All plugin data deleted per retention policy'],
        ]}
      />

      <Callout type="info" title="Transition Atomicity">
        Every state transition is atomic — it either fully completes or fully rolls back.
        The lifecycle engine uses a write-ahead log to ensure that interrupted transitions
        (e.g., due to a Panel restart) are correctly recovered on startup.
      </Callout>

      {/* ── Hot-Reload Process ────────────────────────────────── */}
      <Heading level={2} id="hot-reload">Hot-Reload Process</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        When a plugin is updated while active, the Panel performs a hot-reload to minimize
        downtime. The process is designed to be zero-downtime under normal conditions and
        to automatically roll back if the new version fails health checks.
      </p>

      <CodeBlock language="text" title="Hot-Reload Sequence">
{`Step 1: DETECT CHANGE
   ├─ New version bundle downloaded and verified
   ├─ New version extracted to staging directory
   └─ Old version continues serving traffic

Step 2: LOAD NEW VERSION
   ├─ New backend module loaded into isolated namespace
   ├─ New frontend bundle registered with module federation
   └─ Old version still serving (no interruption)

Step 3: COMPARE SCHEMAS
   ├─ Compare old vs new database schema
   ├─ Generate migration plan (additive preferred)
   └─ If destructive changes detected → require admin approval

Step 4: RUN MIGRATION
   ├─ Execute migration within a transaction
   ├─ If migration fails → rollback transaction
   └─ Migration state recorded in plg_{id}_migrations

Step 5: SWAP ROUTES
   ├─ Atomically swap backend route handlers
   ├─ Atomically swap frontend component references
   ├─ Old in-flight requests drain (30s grace period)
   └─ New version now serving all new requests

Step 6: VERIFY HEALTH
   ├─ Run health checks against new version (5 checks over 30s)
   ├─ Monitor error rate, response time, crash count
   └─ If any check fails → proceed to rollback

Step 7: COMMIT or ROLLBACK
   ├─ If healthy → archive old version, cleanup staging
   ├─ If unhealthy → swap back to old version
   ├─ Rollback migration if needed
   └─ Log outcome to audit trail`}
      </CodeBlock>

      <Callout type="warning" title="Destructive Schema Changes">
        If the new version requires dropping columns or tables, the hot-reload process
        pauses and requires explicit admin approval before proceeding. The admin is shown
        exactly what data will be lost.
      </Callout>

      {/* ── Version Retention ─────────────────────────────────── */}
      <Heading level={2} id="version-retention">Version Retention Policy</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The Panel retains previous versions of plugins to enable rapid rollback in case
        of issues with new releases.
      </p>

      <PropsTable
        columns={['Policy', 'Value', 'Notes']}
        rows={[
          ['Versions retained', 'Last 3 versions', 'Configurable by Panel admin (1-10)'],
          ['Retention period', '30 days minimum', 'Even if more than 3 updates occur, keep for 30 days'],
          ['Rollback window', 'Any retained version', 'Admin can rollback to any retained version'],
          ['Storage location', '/data/plugins/{id}/versions/', 'Each version in its own subdirectory'],
          ['Auto-cleanup', 'Versions beyond retention limit deleted', 'Runs daily at 03:00 Panel local time'],
          ['Active version link', '/data/plugins/{id}/current -> versions/x.y.z/', 'Symlink to the active version'],
        ]}
      />

      {/* ── Health Monitoring ─────────────────────────────────── */}
      <Heading level={2} id="health-monitoring">Health Monitoring</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The Panel continuously monitors the health of all active plugins. If a plugin
        consistently fails health checks or exceeds error thresholds, it is automatically
        disabled to protect system stability.
      </p>

      <Heading level={3} id="health-checks">Health Check Types</Heading>
      <PropsTable
        columns={['Check', 'Frequency', 'Timeout', 'What It Verifies']}
        rows={[
          ['Backend Ping', 'Every 30 seconds', '5 seconds', 'Plugin backend responds to /health endpoint with 200'],
          ['Frontend Render', 'Every 60 seconds', '10 seconds', 'Plugin React component renders without throwing'],
          ['Database Connectivity', 'Every 60 seconds', '5 seconds', 'Plugin can execute a simple query on its tables'],
          ['Memory Usage', 'Every 30 seconds', 'N/A', 'Plugin process stays under memory limit (256 MB default)'],
          ['CPU Usage', 'Every 30 seconds', 'N/A', 'Plugin process stays under CPU limit (50% of one core default)'],
          ['Error Rate', 'Rolling 5-minute window', 'N/A', 'Error rate stays below threshold (5% of requests default)'],
        ]}
      />

      <Heading level={3} id="error-counting">Error Counting and Auto-Disable Thresholds</Heading>
      <PropsTable
        columns={['Metric', 'Threshold', 'Action', 'Recovery']}
        rows={[
          ['Consecutive health check failures', '5 failures', 'auto_disable transition', 'Admin re-enables after investigation'],
          ['Frontend crashes (in 5 min)', '3 crashes', 'Component replaced with error fallback', 'Auto-retry after 5 minutes'],
          ['Frontend crashes (in 1 hour)', '10 crashes', 'auto_disable transition', 'Admin re-enables after investigation'],
          ['Backend error rate (5 min window)', '> 5% of requests', 'Warning logged', 'Clears when rate drops below 3%'],
          ['Backend error rate (5 min window)', '> 20% of requests', 'auto_disable transition', 'Admin re-enables after investigation'],
          ['Memory usage', '> 256 MB for 60 seconds', 'auto_disable transition', 'Admin increases limit or developer optimizes'],
          ['Response time (p95)', '> 5 seconds for 5 minutes', 'Warning logged', 'Clears when p95 drops below 3 seconds'],
          ['Response time (p95)', '> 10 seconds for 5 minutes', 'auto_disable transition', 'Admin re-enables after investigation'],
        ]}
      />

      <CodeBlock language="json" title="Health Monitor Configuration (per plugin)">
{`{
  "health_monitor": {
    "enabled": true,
    "backend_ping_interval_seconds": 30,
    "frontend_render_interval_seconds": 60,
    "consecutive_failure_threshold": 5,
    "frontend_crash_threshold_5min": 3,
    "frontend_crash_threshold_1hour": 10,
    "error_rate_warning_percent": 5,
    "error_rate_disable_percent": 20,
    "memory_limit_mb": 256,
    "cpu_limit_percent": 50,
    "response_time_warning_p95_ms": 5000,
    "response_time_disable_p95_ms": 10000,
    "auto_retry_after_minutes": 5
  }
}`}
      </CodeBlock>

      {/* ── Plugin Data Lifecycle ─────────────────────────────── */}
      <Heading level={2} id="data-lifecycle">Plugin Data Lifecycle</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        When a plugin is uninstalled, its data is not immediately destroyed. The Panel
        follows a structured data lifecycle to allow recovery from accidental uninstalls
        while eventually freeing resources.
      </p>

      <Heading level={3} id="uninstall-data">What Happens on Uninstall</Heading>
      <PropsTable
        columns={['Data Type', 'Immediate Action', 'Grace Period', 'After Grace Period']}
        rows={[
          ['Plugin code (bundle)', 'Moved to quarantine directory', '7 days', 'Permanently deleted'],
          ['Database tables (plg_{id}_*)', 'Marked as orphaned, queries blocked', '30 days', 'Tables dropped, data unrecoverable'],
          ['Configuration (key-value store)', 'Marked as orphaned', '30 days', 'Permanently deleted'],
          ['Filesystem data (/data/plugins/{id}/)', 'Access blocked, directory sealed', '7 days', 'Recursively deleted'],
          ['Scheduled tasks (cron jobs)', 'Immediately cancelled', 'None', 'N/A'],
          ['Registered routes', 'Immediately unregistered', 'None', 'N/A'],
          ['Bot handlers', 'Immediately detached', 'None', 'N/A'],
          ['Audit logs', 'Preserved indefinitely', 'N/A', 'Never deleted (regulatory compliance)'],
          ['Error logs', 'Preserved for 90 days', '90 days', 'Archived then deleted'],
        ]}
      />

      <Callout type="warning" title="Reinstall Within Grace Period">
        If the same plugin (same ID) is reinstalled within the grace period, the Panel
        offers to restore the orphaned data. The admin can choose to restore or start
        fresh. Restored data is re-verified for integrity before reattachment.
      </Callout>

      <Heading level={3} id="data-export">Data Export Before Uninstall</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Admins can export all plugin data before uninstalling. The export includes database
        tables (as SQL dump or CSV), filesystem contents (as .tar.gz), and configuration
        (as JSON). The export is signed with the Panel's key for integrity.
      </p>

      <CodeBlock language="bash" title="Plugin Data Export (CLI)">
{`# Export all data for plugin "abc123" before uninstall
acp plugin export abc123 --output /backups/abc123-export.tar.gz

# Export includes:
#   /database/  - SQL dump of all plg_abc123_* tables
#   /files/     - Contents of /data/plugins/abc123/
#   /config/    - Plugin configuration as JSON
#   /meta.json  - Export metadata, timestamps, checksums
#   /signature  - Ed25519 signature of the export archive`}
      </CodeBlock>

      {/* ── Audit Log Events ──────────────────────────────────── */}
      <Heading level={2} id="audit-events">Audit Log Events</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Every lifecycle transition and significant operational event is recorded in the
        audit log. The following table lists all plugin lifecycle audit events.
      </p>

      <PropsTable
        columns={['Event', 'Trigger', 'Logged Data', 'Retention']}
        rows={[
          ['plugin.install.started', 'Admin initiates install', 'plugin_id, version, source_url, admin_user', 'Indefinite'],
          ['plugin.install.verify_success', 'Bundle verified', 'plugin_id, version, bundle_hash, signature_valid', 'Indefinite'],
          ['plugin.install.verify_fail', 'Verification failed', 'plugin_id, version, expected_hash, actual_hash, error', 'Indefinite'],
          ['plugin.activate', 'Admin activates plugin', 'plugin_id, version, permissions_granted, admin_user', 'Indefinite'],
          ['plugin.disable', 'Admin disables plugin', 'plugin_id, version, reason, admin_user', 'Indefinite'],
          ['plugin.auto_disable', 'Health monitor disables', 'plugin_id, version, threshold_exceeded, metrics_snapshot', 'Indefinite'],
          ['plugin.update.started', 'Update process begins', 'plugin_id, old_version, new_version, admin_user', 'Indefinite'],
          ['plugin.update.success', 'Hot-reload succeeds', 'plugin_id, old_version, new_version, migration_applied', 'Indefinite'],
          ['plugin.update.rollback', 'Hot-reload rolled back', 'plugin_id, old_version, new_version, rollback_reason', 'Indefinite'],
          ['plugin.update.fail', 'Update fails', 'plugin_id, old_version, new_version, error_details', 'Indefinite'],
          ['plugin.uninstall.started', 'Admin initiates uninstall', 'plugin_id, version, data_export_created, admin_user', 'Indefinite'],
          ['plugin.uninstall.complete', 'Cleanup finishes', 'plugin_id, version, data_deleted, grace_period_used', 'Indefinite'],
          ['plugin.error.acknowledged', 'Admin acknowledges error', 'plugin_id, version, error_type, resolution_notes', 'Indefinite'],
          ['plugin.health.warning', 'Threshold warning', 'plugin_id, metric, current_value, threshold', '90 days'],
          ['plugin.health.critical', 'Critical threshold', 'plugin_id, metric, current_value, threshold', 'Indefinite'],
          ['plugin.crash.frontend', 'React ErrorBoundary caught', 'plugin_id, error_message, component_stack', '90 days'],
          ['plugin.crash.backend', 'Unhandled exception', 'plugin_id, exception_type, traceback', '90 days'],
        ]}
      />

      <Callout type="info" title="Audit Log Immutability">
        Audit log entries are append-only and hash-chained. Each entry includes a SHA-256
        hash of the previous entry, creating a tamper-evident chain. Entries cannot be
        modified or deleted. The chain root is checkpointed to an external store daily.
      </Callout>
    </div>
  );
}
