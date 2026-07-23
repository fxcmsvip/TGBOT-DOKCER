import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Check, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import Modal from '../components/Modal';
import api from '../api/client';

const AVAILABLE_SCOPES = [
  { value: 'registry:read', label: 'Registry Read', desc: 'Read plugin information' },
  { value: 'registry:write', label: 'Registry Write', desc: 'Submit and manage plugins' },
  { value: 'billing:read', label: 'Billing Read', desc: 'View purchases and licenses' },
  { value: 'billing:write', label: 'Billing Write', desc: 'Create checkouts and manage billing' },
];

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createScopes, setCreateScopes] = useState(['registry:read', 'billing:read']);
  const [creating, setCreating] = useState(false);

  // New key display
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirm
  const [revokeModal, setRevokeModal] = useState({ open: false, key: null });
  const [revoking, setRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/auth/api-keys');
      setKeys(data.data || data || []);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
      setError('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/auth/api-keys', {
        name: createName.trim(),
        scopes: createScopes,
      });
      const keyData = data.data || data;
      setNewKey(keyData.key);
      setCreateOpen(false);
      setCreateName('');
      setCreateScopes(['registry:read', 'billing:read']);
      fetchKeys();
    } catch (err) {
      console.error('Failed to create API key:', err);
      alert(err?.response?.data?.detail || 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    const keyId = revokeModal.key?.id;
    if (!keyId) return;
    setRevoking(true);
    try {
      await api.delete(`/auth/api-keys/${keyId}`);
      setRevokeModal({ open: false, key: null });
      fetchKeys();
    } catch (err) {
      console.error('Failed to revoke key:', err);
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleScope = (scope) => {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <DashboardLayout
      title="API Keys"
      headerRight={
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New API Key
        </button>
      }
    >
      {/* New key banner */}
      {newKey && (
        <div className="mb-6 rounded-xl border border-success/30 bg-success-light p-5">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">API Key Created</p>
              <p className="text-xs text-text-secondary mb-3">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm font-mono text-text-primary break-all">
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey)}
                  className="shrink-0 p-2 rounded-lg bg-white border border-border hover:bg-bg-gray transition-colors"
                  title="Copy key"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-text-secondary" />}
                </button>
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-text-tertiary hover:text-text-primary text-lg leading-none">&times;</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <button onClick={fetchKeys} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Keys table */}
      <div className="bg-white border border-border rounded-xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Your API Keys</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Use API keys to authenticate with the ACP Market API from CLI tools or scripts.</p>
        </div>

        {loading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-bg-gray" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-bg-gray rounded w-1/4" />
                  <div className="h-3 bg-bg-gray rounded w-1/3" />
                </div>
                <div className="h-5 bg-bg-gray rounded-full w-20" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && keys.length === 0 && (
          <div className="py-16 text-center">
            <Key className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-base font-medium text-text-primary mb-1">No API keys yet</h3>
            <p className="text-sm text-text-secondary mb-6">Create an API key to access the Market API programmatically.</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          </div>
        )}

        {!loading && keys.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-gray/50">
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Key</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Scopes</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Created</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Last Used</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-bg-gray/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                          <Key className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-text-primary">{k.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-text-secondary">{k.key_prefix}••••••••</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes || []).map((s) => (
                          <span key={s} className="inline-flex px-2 py-0.5 rounded-full bg-bg-gray text-[11px] font-medium text-text-secondary">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">
                        {k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-tertiary">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setRevokeModal({ open: true, key: k })}
                        className="p-1.5 rounded-lg hover:bg-bg-gray text-text-secondary hover:text-danger transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create API Key"
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
          </>
        }
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Key Name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. CI/CD Pipeline, Local Dev"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Scopes</label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label key={scope.value} className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-bg-gray/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={createScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">{scope.label}</span>
                    <p className="text-xs text-text-tertiary">{scope.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirm Modal */}
      <Modal
        open={revokeModal.open}
        onClose={() => setRevokeModal({ open: false, key: null })}
        title="Revoke API Key"
        footer={
          <>
            <button
              onClick={() => setRevokeModal({ open: false, key: null })}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-50"
            >
              {revoking ? 'Revoking...' : 'Revoke Key'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to revoke <span className="font-medium text-text-primary">{revokeModal.key?.name}</span>?
          This action cannot be undone. Any applications using this key will lose access.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
