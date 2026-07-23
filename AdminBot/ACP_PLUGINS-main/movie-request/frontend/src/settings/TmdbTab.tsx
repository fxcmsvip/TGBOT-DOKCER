import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Key,
  Database,
  FlaskConical,
  Save,
} from 'lucide-react';
import pluginApi from '../api';

const cv = (name: string) => `var(--color-${name})`;

// Shared input style
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 14px',
  background: cv('bg-elevated'),
  border: `1px solid ${cv('border')}`,
  borderRadius: 8,
  fontSize: 14,
  color: cv('text-primary'),
  outline: 'none',
  fontFamily: "'JetBrains Mono', monospace",
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: cv('text-muted'),
  marginBottom: 6,
};

const cardStyle: React.CSSProperties = {
  background: cv('bg-card'),
  border: `1px solid ${cv('border')}`,
  borderRadius: 10,
  padding: 20,
};

// Types
interface TmdbApiKey {
  id: number;
  name: string;
  api_key_masked: string;
  access_token_masked?: string;
  is_active: boolean;
  is_rate_limited: boolean;
  rate_limited_until?: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

interface MediaLibraryConfig {
  id: number;
  name: string;
  db_type: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password_masked?: string;
  table_name?: string;
  tmdb_id_column?: string;
  media_type_column?: string;
  name_column?: string;
  path_column?: string;
  is_dir_column?: string;
  trashed_column?: string;
  api_url?: string;
  api_auth_header_masked?: string;
  api_response_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API
async function getTmdbKeys(): Promise<{ items: TmdbApiKey[] }> {
  const { data } = await pluginApi.get('/tmdb-keys');
  return data.data;
}
async function createTmdbKey(body: { name: string; api_key: string; access_token?: string }) {
  const { data } = await pluginApi.post('/tmdb-keys', body);
  return data.data;
}
async function deleteTmdbKey(id: number) { await pluginApi.delete(`/tmdb-keys/${id}`); }
async function listMediaLibraryConfigs(): Promise<{ items: MediaLibraryConfig[] }> {
  const { data } = await pluginApi.get('/media-library');
  return data.data;
}
async function createMediaLibraryConfig(body: Record<string, unknown>) {
  const { data } = await pluginApi.post('/media-library', body);
  return data.data;
}
async function updateMediaLibraryConfig(id: number, body: Record<string, unknown>) {
  const { data } = await pluginApi.patch(`/media-library/${id}`, body);
  return data.data;
}
async function deleteMediaLibraryConfig(id: number) {
  await pluginApi.delete(`/media-library/${id}`);
}
async function testMediaLibraryConfig(id: number) {
  const { data } = await pluginApi.post(`/media-library/${id}/test`);
  return data.data as { success: boolean; message: string };
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[10px] font-semibold font-['JetBrains_Mono'] px-2 py-0.5 rounded"
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {label}
    </span>
  );
}

// ── Form data shape ──
interface MLFormState {
  name: string;
  db_type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  table_name: string;
  tmdb_id_column: string;
  media_type_column: string;
  name_column: string;
  path_column: string;
  is_dir_column: string;
  trashed_column: string;
  api_url: string;
  api_auth_header: string;
  api_response_path: string;
}

const _emptyMLForm = (): MLFormState => ({
  name: '', db_type: 'postgresql', host: '', port: '', database: '',
  username: '', password: '', table_name: '', tmdb_id_column: 'tmdb_id', media_type_column: '',
  name_column: '', path_column: '', is_dir_column: '', trashed_column: '',
  api_url: '', api_auth_header: '', api_response_path: 'exists',
});

const _formFromConfig = (cfg: MediaLibraryConfig): MLFormState => ({
  name: cfg.name || '',
  db_type: cfg.db_type || 'postgresql',
  host: cfg.host || '',
  port: cfg.port ? String(cfg.port) : '',
  database: cfg.database || '',
  username: cfg.username || '',
  password: '', // never pre-fill — backend keeps existing if blank
  table_name: cfg.table_name || '',
  tmdb_id_column: cfg.tmdb_id_column || '',
  media_type_column: cfg.media_type_column || '',
  name_column: cfg.name_column || '',
  path_column: cfg.path_column || '',
  is_dir_column: cfg.is_dir_column || '',
  trashed_column: cfg.trashed_column || '',
  api_url: cfg.api_url || '',
  api_auth_header: '', // never pre-fill — backend keeps existing if blank
  api_response_path: cfg.api_response_path || 'exists',
});

const _formToPayload = (form: MLFormState): Record<string, unknown> => {
  const isApi = form.db_type === 'api';
  const payload: Record<string, unknown> = { name: form.name, db_type: form.db_type };
  if (isApi) {
    payload.api_url = form.api_url;
    payload.api_auth_header = form.api_auth_header || undefined;
    payload.api_response_path = form.api_response_path || 'exists';
  } else {
    payload.host = form.host;
    payload.port = form.port ? Number(form.port) : undefined;
    payload.database = form.database;
    payload.username = form.username;
    payload.password = form.password || undefined;
    payload.table_name = form.table_name;
    payload.tmdb_id_column = form.tmdb_id_column;
    payload.media_type_column = form.media_type_column || undefined;
    payload.name_column = form.name_column || undefined;
    payload.path_column = form.path_column || undefined;
    payload.is_dir_column = form.is_dir_column || undefined;
    payload.trashed_column = form.trashed_column || undefined;
  }
  return payload;
};

// ── Reusable form (used by both create and edit) ──
function MediaLibraryForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  isPending,
  isEdit,
}: {
  form: MLFormState;
  setForm: (f: MLFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const isApi = form.db_type === 'api';
  const u = (key: keyof MLFormState, value: string) => setForm({ ...form, [key]: value });
  const dbModeFilled = form.host && form.database && form.username && form.table_name && form.tmdb_id_column && (isEdit || form.password);
  const canSave = form.name && (isApi ? !!form.api_url : !!dbModeFilled) && !isPending;

  return (
    <div style={cardStyle} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Name</label>
          <input type="text" value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="My Media Server" style={{ ...inputStyle, fontFamily: "'Inter', sans-serif" }} />
        </div>
        <div>
          <label style={labelStyle}>Connection Type</label>
          <select value={form.db_type} onChange={(e) => u('db_type', e.target.value)} style={inputStyle}>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="api">HTTP API</option>
          </select>
        </div>
        {!isApi && (
          <div>
            <label style={labelStyle}>Host</label>
            <input type="text" value={form.host} onChange={(e) => u('host', e.target.value)} placeholder="192.168.1.100" style={inputStyle} />
          </div>
        )}
      </div>

      {isApi ? (
        <>
          <div>
            <label style={labelStyle}>API URL <span style={{ color: cv('text-placeholder') }}>(use {'{tmdb_id}'} and optionally {'{media_type}'} as placeholders)</span></label>
            <input type="text" value={form.api_url} onChange={(e) => u('api_url', e.target.value)} placeholder="https://api.example.com/library/check?tmdb_id={tmdb_id}&type={media_type}" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Auth Token <span style={{ color: cv('text-placeholder') }}>{isEdit ? '(leave blank to keep existing)' : '(optional)'}</span></label>
              <input type="password" value={form.api_auth_header} onChange={(e) => u('api_auth_header', e.target.value)} placeholder={isEdit ? '••••••• (unchanged)' : 'Bearer your-secret-token'} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Response Field <span style={{ color: cv('text-placeholder') }}>(JSON path)</span></label>
              <input type="text" value={form.api_response_path} onChange={(e) => u('api_response_path', e.target.value)} placeholder="exists" style={inputStyle} />
            </div>
          </div>
          <p className="text-[11px] font-['JetBrains_Mono']" style={{ color: cv('text-placeholder') }}>
            Expected: GET request returns JSON. Example: {'{"exists": true}'} with Response Field = "exists"
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[['Port', 'port', form.db_type === 'postgresql' ? '5432' : '3306'], ['Database', 'database', 'media_db'], ['Username', 'username', 'db_user'], ['Password', 'password', isEdit ? '••••••• (unchanged)' : '********']].map(([label, key, ph]) => (
              <div key={key}>
                <label style={labelStyle}>
                  {label}
                  {key === 'password' && isEdit && <span style={{ color: cv('text-placeholder') }}> (blank=keep)</span>}
                </label>
                <input type={key === 'password' ? 'password' : 'text'} value={(form as unknown as Record<string, string>)[key]} onChange={(e) => u(key as keyof MLFormState, e.target.value)} placeholder={ph} style={inputStyle} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[['Table Name', 'table_name', 'files'], ['TMDB ID Column', 'tmdb_id_column', 'tmdb'], ['Media Type Column', 'media_type_column', 'media_type']].map(([label, key, ph]) => (
              <div key={key}>
                <label style={labelStyle}>{label}{key === 'media_type_column' ? ' (optional)' : ''}</label>
                <input type="text" value={(form as unknown as Record<string, string>)[key]} onChange={(e) => u(key as keyof MLFormState, e.target.value)} placeholder={ph} style={inputStyle} />
              </div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-['JetBrains_Mono'] mb-2" style={{ color: cv('text-placeholder') }}>
              Optional — fill these to enable <b>version detail</b> (1080p × 1, 4K DoVi × 1, S01: E01-E26):
            </p>
            <div className="grid grid-cols-4 gap-4">
              {[['Name Column', 'name_column', 'name'], ['Path Column', 'path_column', 'path'], ['Is-Dir Column', 'is_dir_column', 'is_dir'], ['Trashed Column', 'trashed_column', 'trashed']].map(([label, key, ph]) => (
                <div key={key}>
                  <label style={labelStyle}>{label} (optional)</label>
                  <input type="text" value={(form as unknown as Record<string, string>)[key]} onChange={(e) => u(key as keyof MLFormState, e.target.value)} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors" style={{ color: cv('text-secondary'), border: `1px solid ${cv('border')}` }}>Cancel</button>
        <button
          onClick={onSubmit}
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-black text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-30"
          style={{ background: cv('accent') }}
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {isEdit ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Single config card (rendered for each existing config) ──
function MediaLibraryConfigCard({ config }: { config: MediaLibraryConfig }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<MLFormState>(_formFromConfig(config));

  const deleteMutation = useMutation({
    mutationFn: () => deleteMediaLibraryConfig(config.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-library-configs'] }),
  });
  const testMutation = useMutation({ mutationFn: () => testMediaLibraryConfig(config.id) });
  const updateMutation = useMutation({
    mutationFn: () => updateMediaLibraryConfig(config.id, _formToPayload(editForm)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library-configs'] });
      setEditing(false);
    },
  });

  const summary = config.db_type === 'api'
    ? `API @ ${config.api_url?.substring(0, 60) || '—'}${(config.api_url?.length || 0) > 60 ? '…' : ''}`
    : `${config.db_type.toUpperCase()} @ ${config.host}:${config.port || (config.db_type === 'postgresql' ? 5432 : 3306)} / ${config.database}`;

  if (editing) {
    return (
      <MediaLibraryForm
        form={editForm}
        setForm={setEditForm}
        onCancel={() => { setEditing(false); setEditForm(_formFromConfig(config)); }}
        onSubmit={() => updateMutation.mutate()}
        isPending={updateMutation.isPending}
        isEdit={true}
      />
    );
  }

  return (
    <div style={cardStyle} className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium" style={{ color: cv('text-primary') }}>{config.name}</h4>
          <p className="text-xs font-['JetBrains_Mono'] mt-1 truncate" style={{ color: cv('text-muted') }}>{summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
            style={{ color: cv('accent'), border: `1px solid color-mix(in srgb, ${cv('accent')} 20%, transparent)` }}
          >
            {testMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
            Test
          </button>
          <button
            onClick={() => { setEditForm(_formFromConfig(config)); setEditing(true); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: cv('text-muted') }}
            onMouseEnter={(e) => { e.currentTarget.style.color = cv('accent'); }}
            onMouseLeave={(e) => { e.currentTarget.style.color = cv('text-muted'); }}
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => { if (confirm('Delete this database connection?')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: cv('text-muted') }}
            onMouseEnter={(e) => { e.currentTarget.style.color = cv('red'); }}
            onMouseLeave={(e) => { e.currentTarget.style.color = cv('text-muted'); }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 text-xs">
        {config.db_type === 'api'
          ? [['Response Field', config.api_response_path || 'exists'], ['Auth', config.api_auth_header_masked || '\u2014'], ['Type', 'HTTP API'], ['', '']].map(([l, v], i) => (
              l ? <div key={l}><span style={{ color: cv('text-muted') }}>{l}:</span>{' '}<span className="font-['JetBrains_Mono']" style={{ color: cv('text-primary') }}>{v}</span></div> : <div key={i} />
            ))
          : [['Table', config.table_name || '\u2014'], ['TMDB ID', config.tmdb_id_column || '\u2014'], ['Name Col', config.name_column || '\u2014'], ['Path Col', config.path_column || '\u2014']].map(([l, v]) => (
              <div key={l}><span style={{ color: cv('text-muted') }}>{l}:</span>{' '}<span className="font-['JetBrains_Mono']" style={{ color: cv('text-primary') }}>{v}</span></div>
            ))
        }
      </div>
      {config.is_active && <Badge label="ACTIVE" color={cv('green')} />}
      {testMutation.data && (
        <p className="text-xs font-['JetBrains_Mono']" style={{ color: testMutation.data.success ? cv('green') : cv('red') }}>
          {testMutation.data.message}
        </p>
      )}
    </div>
  );
}

// ── Media Library Section ──
function MediaLibrarySection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MLFormState>(_emptyMLForm());

  const { data, isLoading } = useQuery({ queryKey: ['media-library-configs'], queryFn: listMediaLibraryConfigs });
  const configs: MediaLibraryConfig[] = data?.items || [];

  const createMutation = useMutation({
    mutationFn: () => createMediaLibraryConfig(_formToPayload(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library-configs'] });
      setShowForm(false);
      setForm(_emptyMLForm());
    },
  });

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold font-['Space_Grotesk']" style={{ color: cv('text-primary') }}>Media Library Check</h3>
          <p className="text-xs mt-1" style={{ color: cv('text-muted') }}>
            Connect one or more external databases / APIs to check if a title is already in your library. When the optional <b>Name Column</b> is set, the bot also shows version details (1080p × 1, 4K DoVi × 1, S01: E01-E26 etc).
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
          style={{ color: cv('accent'), background: `color-mix(in srgb, ${cv('accent')} 10%, transparent)` }}
        >
          <Plus size={14} /> Add Database
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: cv('text-muted') }} />
        </div>
      ) : configs.length === 0 && !showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-6 rounded-[10px] text-sm transition-colors"
          style={{ background: cv('bg-card'), border: `1px dashed ${cv('border')}`, color: cv('text-muted') }}
        >
          <Database size={20} className="mx-auto mb-2 opacity-50" />
          Configure External Media Library
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {configs.map((c) => <MediaLibraryConfigCard key={c.id} config={c} />)}
        </div>
      )}

      {showForm && (
        <MediaLibraryForm
          form={form}
          setForm={setForm}
          onCancel={() => { setShowForm(false); setForm(_emptyMLForm()); }}
          onSubmit={() => createMutation.mutate()}
          isPending={createMutation.isPending}
          isEdit={false}
        />
      )}
    </div>
  );
}

// ── Main TMDB Tab ──
export default function TmdbTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formAccessToken, setFormAccessToken] = useState('');
  const [addError, setAddError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['tmdb-keys'], queryFn: getTmdbKeys });
  const addMutation = useMutation({
    mutationFn: () => createTmdbKey({ name: formName, api_key: formApiKey, access_token: formAccessToken || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tmdb-keys'] }); setShowForm(false); setFormName(''); setFormApiKey(''); setFormAccessToken(''); setAddError(''); },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setAddError(detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('; '));
      } else if (typeof detail === 'string') {
        setAddError(detail);
      } else {
        setAddError(err?.message || 'Failed to add key');
      }
    },
  });
  const deleteMutation = useMutation({ mutationFn: (id: number) => deleteTmdbKey(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tmdb-keys'] }) });

  const keys: TmdbApiKey[] = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold font-['Space_Grotesk']" style={{ color: cv('text-primary') }}>TMDB API Keys</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ color: cv('accent'), background: `color-mix(in srgb, ${cv('accent')} 10%, transparent)` }}
        >
          <Plus size={14} /> Add Key
        </button>
      </div>

      {showForm && (
        <div style={cardStyle} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My TMDB Key" style={{ ...inputStyle, fontFamily: "'Inter', sans-serif" }} />
            </div>
            <div>
              <label style={labelStyle}>API Key</label>
              <input type="text" value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} placeholder="API key" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Access Token (optional)</label>
              <input type="text" value={formAccessToken} onChange={(e) => setFormAccessToken(e.target.value)} placeholder="Bearer token" style={inputStyle} />
            </div>
          </div>
          {addError && (
            <p className="text-xs font-['JetBrains_Mono']" style={{ color: cv('red') }}>
              {addError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setAddError(''); }} className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors" style={{ color: cv('text-secondary'), border: `1px solid ${cv('border')}` }}>Cancel</button>
            <button
              onClick={() => { setAddError(''); addMutation.mutate(); }}
              disabled={!formName || !formApiKey || addMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-black text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-30"
              style={{ background: cv('accent') }}
            >
              {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: cv('text-muted') }} />
        </div>
      ) : keys.length === 0 ? (
        <div style={cardStyle} className="text-center py-4">
          <Key size={24} className="mx-auto mb-2" style={{ color: cv('text-placeholder') }} />
          <p className="text-sm" style={{ color: cv('text-muted') }}>No TMDB API keys configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {keys.map((k) => (
            <div key={k.id} style={cardStyle}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium" style={{ color: cv('text-primary') }}>{k.name}</h4>
                  <p className="text-xs font-['JetBrains_Mono'] mt-1" style={{ color: cv('text-muted') }}>{k.api_key_masked}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(k.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: cv('text-muted') }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = cv('red'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = cv('text-muted'); }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {k.is_active ? (
                  k.is_rate_limited
                    ? <Badge label="RATE LIMITED" color={cv('orange')} />
                    : <Badge label="ACTIVE" color={cv('green')} />
                ) : (
                  <span className="text-[10px] font-semibold font-['JetBrains_Mono'] px-2 py-0.5 rounded" style={{ color: cv('text-muted'), background: cv('bg-elevated') }}>INACTIVE</span>
                )}
                <span className="text-[10px] font-['JetBrains_Mono']" style={{ color: cv('text-muted') }}>{k.request_count} requests</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaLibrarySection />
    </div>
  );
}
