import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Puzzle, DollarSign, Download, Search, Pencil, Ban, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatNumber } from '../utils/format';
import api from '../api/client';

const STAT_CARDS = [
  { key: 'total_users', label: 'Total Users', icon: Users, color: 'text-primary', bgIcon: 'bg-primary-light' },
  { key: 'total_plugins', label: 'Total Plugins', icon: Puzzle, color: 'text-success', bgIcon: 'bg-success-light' },
  { key: 'total_revenue', label: 'Platform Revenue', icon: DollarSign, color: 'text-warning', bgIcon: 'bg-warning-light', prefix: '$' },
  { key: 'total_downloads', label: 'Total Downloads', icon: Download, color: 'text-primary', bgIcon: 'bg-primary-light' },
];

const AVATAR_COLORS = [
  'bg-primary', 'bg-success', 'bg-warning', 'bg-danger',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AdminPanel() {
  // ── Stats ──
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // ── Users ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);
  const debounceRef = useRef(null);

  // ── Edit modal state ──
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ display_name: '', email: '', role: '', is_active: true });
  const [editSaving, setEditSaving] = useState(false);

  // ── Confirm modal state (replaces window.confirm) ──
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setStatsError('Failed to load stats.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch users ──
  const fetchUsers = useCallback(async (q = '') => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, page_size: 20, ...(q ? { q } : {}) },
      });
      setUsers(data.items || data.results || data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Failed to load users.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [page]);

  // ── Mount ──
  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, fetchUsers]);

  // ── Open edit modal ──
  function openEditModal(user) {
    const uid = user.user_id || user.id;
    setEditForm({
      display_name: user.display_name || user.username || '',
      email: user.email || '',
      role: user.role || 'developer',
      is_active: user.is_active !== false,
    });
    setEditModal({ open: true, user: { ...user, _uid: uid } });
  }

  // ── Save edit ──
  async function handleEditSave() {
    const uid = editModal.user?._uid;
    if (!uid) return;
    setEditSaving(true);
    try {
      await api.patch(`/admin/users/${uid}`, {
        display_name: editForm.display_name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      });
      setEditModal({ open: false, user: null });
      fetchUsers(searchQuery);
      fetchStats();
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Suspend / Activate ──
  function handleToggleActive(user) {
    setConfirmModal({ open: true, user });
  }

  async function confirmToggleActive() {
    const user = confirmModal.user;
    if (!user) return;
    const action = user.is_active ? 'suspend' : 'activate';
    setConfirmModal({ open: false, user: null });
    try {
      await api.patch(`/admin/users/${user.user_id || user.id}`, { is_active: !user.is_active });
      fetchUsers(searchQuery);
      fetchStats();
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
  }

  return (
    <DashboardLayout title="Admin Panel">
      {/* ── Stats Error ── */}
      {statsError && !statsLoading && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-red-700 flex-1">{statsError}</span>
          <button onClick={fetchStats} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bgIcon, prefix }) => (
          <div
            key={key}
            className="relative bg-white border border-border rounded-xl p-5 hover:shadow-sm transition-shadow"
          >
            <div className={`absolute top-4 right-4 w-10 h-10 rounded-lg ${bgIcon} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-sm font-medium text-text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {statsLoading ? (
                <span className="inline-block w-16 h-7 bg-bg-gray rounded animate-pulse" />
              ) : (
                <>
                  {prefix || ''}
                  {formatNumber(stats?.[key] ?? 0)}
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── User Management ── */}
      <div className="bg-white border border-border rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">User Management</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
            />
          </div>
        </div>

        {/* Loading state */}
        {usersLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-bg-gray" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-bg-gray rounded w-1/4" />
                </div>
                <div className="h-4 bg-bg-gray rounded w-40" />
                <div className="h-5 bg-bg-gray rounded-full w-16" />
                <div className="h-5 bg-bg-gray rounded-full w-14" />
                <div className="h-4 bg-bg-gray rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Users error state */}
        {usersError && !usersLoading && (
          <div className="py-16 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h3 className="text-base font-medium text-text-primary mb-1">Failed to load users</h3>
            <p className="text-sm text-text-secondary mb-4">{usersError}</p>
            <button
              onClick={() => fetchUsers(searchQuery)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!usersLoading && !usersError && users.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-base font-medium text-text-primary mb-1">No users found</h3>
            <p className="text-sm text-text-secondary">
              {searchQuery ? 'Try adjusting your search query.' : 'No users registered yet.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!usersLoading && !usersError && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-gray/50">
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const uid = user.user_id || user.id;
                  const initial = (user.display_name || user.username || 'U')[0].toUpperCase();

                  return (
                    <tr key={uid} className="hover:bg-bg-gray/30 transition-colors">
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${avatarColor(user.username)} flex items-center justify-center shrink-0`}
                          >
                            <span className="text-xs font-semibold text-white">{initial}</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary truncate">
                            {user.display_name || user.username}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">{user.email}</span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <StatusBadge status={user.role || 'developer'} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={user.is_active ? 'active' : 'suspended'} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg hover:bg-bg-gray text-text-secondary hover:text-primary transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg hover:bg-bg-gray transition-colors ${
                              user.is_active
                                ? 'text-text-secondary hover:text-danger'
                                : 'text-text-secondary hover:text-success'
                            }`}
                            title={user.is_active ? 'Suspend user' : 'Activate user'}
                          >
                            {user.is_active ? (
                              <Ban className="w-4 h-4" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        title="Edit User"
        footer={
          <>
            <button
              onClick={() => setEditModal({ open: false, user: null })}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-4 mt-2">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Display Name</label>
            <input
              type="text"
              value={editForm.display_name}
              onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="developer">Developer</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Status</label>
            <select
              value={editForm.is_active ? 'active' : 'suspended'}
              onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Suspend/Activate Confirm Modal */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null })}
        title={confirmModal.user?.is_active ? 'Suspend User' : 'Activate User'}
        footer={
          <>
            <button
              onClick={() => setConfirmModal({ open: false, user: null })}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmToggleActive}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                confirmModal.user?.is_active
                  ? 'bg-danger hover:bg-danger/90'
                  : 'bg-success hover:bg-success/90'
              }`}
            >
              {confirmModal.user?.is_active ? 'Suspend' : 'Activate'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to {confirmModal.user?.is_active ? 'suspend' : 'activate'}{' '}
          <span className="font-medium text-text-primary">{confirmModal.user?.username}</span>?
        </p>
      </Modal>
    </DashboardLayout>
  );
}
