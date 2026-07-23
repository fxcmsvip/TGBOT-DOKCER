import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Puzzle, Download, DollarSign, Timer, Plus } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { formatNumber } from '../utils/format';
import useAuthStore from '../stores/authStore';
import api from '../api/client';

const STAT_CARDS = [
  { key: 'plugins', label: 'Total Plugins', icon: Puzzle, color: 'text-primary', bgIcon: 'bg-primary-light' },
  { key: 'downloads', label: 'Total Downloads', icon: Download, color: 'text-success', bgIcon: 'bg-success-light' },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-warning', bgIcon: 'bg-warning-light', prefix: '$' },
  { key: 'pending', label: 'Pending Reviews', icon: Timer, color: 'text-warning', bgIcon: 'bg-warning-light' },
];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMyPlugins() {
      setLoading(true);
      try {
        const params = user ? { author_id: user.id } : {};
        const { data } = await api.get('/plugins', { params });
        const items = data.items || data.results || data || [];
        if (!cancelled) setPlugins(items);
      } catch (err) {
        console.error('Failed to fetch plugins:', err);
        if (!cancelled) setPlugins([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMyPlugins();
    return () => { cancelled = true; };
  }, [user]);

  // Compute stats from plugins
  const stats = {
    plugins: plugins.length,
    downloads: plugins.reduce((sum, p) => sum + (p.download_count || p.downloads || 0), 0),
    revenue: plugins.reduce((sum, p) => sum + (p.revenue || 0), 0),
    pending: plugins.filter((p) => {
      const s = p.review_status || p.status;
      return s === 'pending' || s === 'in_review';
    }).length,
  };

  return (
    <DashboardLayout
      title="Dashboard"
      headerRight={
        <Link
          to="/plugins/submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Plugin
        </Link>
      }
    >
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
              {loading ? (
                <span className="inline-block w-16 h-7 bg-bg-gray rounded animate-pulse" />
              ) : (
                <>
                  {prefix || ''}
                  {formatNumber(stats[key])}
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">All time</p>
          </div>
        ))}
      </div>

      {/* ── My Plugins Table ── */}
      <div className="bg-white border border-border rounded-xl">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">My Plugins</h2>
          <Link
            to="/plugins/submit"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plugin
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-bg-gray" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-bg-gray rounded w-1/3" />
                  <div className="h-3 bg-bg-gray rounded w-1/5" />
                </div>
                <div className="h-4 bg-bg-gray rounded w-12" />
                <div className="h-5 bg-bg-gray rounded-full w-16" />
                <div className="h-4 bg-bg-gray rounded w-14" />
                <div className="h-4 bg-bg-gray rounded w-14" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && plugins.length === 0 && (
          <div className="py-16 text-center">
            <Puzzle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-base font-medium text-text-primary mb-1">No plugins yet</h3>
            <p className="text-sm text-text-secondary mb-6">
              Get started by submitting your first plugin.
            </p>
            <Link
              to="/plugins/submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Submit Plugin
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && plugins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-gray/50">
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Plugin
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Version
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Downloads
                  </th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-6 py-3">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plugins.map((plugin) => {
                  const id = plugin.plugin_id || plugin.id;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-bg-gray/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <Link to={`/plugins/${id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-bg-gray flex items-center justify-center overflow-hidden shrink-0">
                            {plugin.icon_url ? (
                              <img
                                src={plugin.icon_url}
                                alt={plugin.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Puzzle className="w-5 h-5 text-text-tertiary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {plugin.name}
                            </p>
                            <p className="text-xs text-text-tertiary truncate">
                              {plugin.short_description || plugin.description?.slice(0, 60)}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary font-mono">
                          {plugin.latest_version || plugin.version || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={plugin.review_status || plugin.status || (plugin.is_published ? 'published' : 'pending')} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">
                          {formatNumber(plugin.download_count || plugin.downloads || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-text-primary">
                          ${(plugin.revenue || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
