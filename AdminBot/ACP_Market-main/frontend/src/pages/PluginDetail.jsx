import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Boxes, Puzzle, Download, ArrowLeft, ExternalLink, Tag, Calendar, Package } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { formatNumber, formatCurrency } from '../utils/format';
import useAuthStore from '../stores/authStore';
import api from '../api/client';
import { APP_VERSION } from '../constants/version';

export default function PluginDetail() {
  const { pluginId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [plugin, setPlugin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/plugins/${pluginId}`);
        const detail = data.data || data;
        if (!cancelled) setPlugin(detail);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'Plugin not found.' : 'Failed to load plugin.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pluginId]);

  const priceDisplay = plugin
    ? plugin.pricing_model === 'free'
      ? 'Free'
      : plugin.pricing_model === 'one_time'
        ? formatCurrency(plugin.price_cents)
        : `${formatCurrency(plugin.price_cents)}/mo`
    : '';

  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-primary" />
              <span className="text-lg font-bold text-text-primary">ACP Market</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Explore
              </Link>
              <Link to="/categories" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Categories
              </Link>
              <Link to="/docs" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Documentation
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                  Log In
                </Link>
                <Link to="/login?tab=register" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {/* Loading */}
        {loading && (
          <div className="animate-pulse space-y-6">
            <div className="flex gap-5">
              <div className="w-20 h-20 rounded-2xl bg-bg-gray" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-7 bg-bg-gray rounded w-1/3" />
                <div className="h-4 bg-bg-gray rounded w-1/5" />
              </div>
            </div>
            <div className="h-40 bg-bg-gray rounded-xl" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20">
            <Puzzle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h2 className="text-lg font-medium text-text-primary mb-1">{error}</h2>
            <Link to="/" className="text-sm text-primary hover:underline">Back to Marketplace</Link>
          </div>
        )}

        {/* Plugin Detail */}
        {!loading && plugin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="flex gap-5">
                <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
                  <Puzzle className="w-10 h-10 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-text-primary">{plugin.name}</h1>
                  <p className="text-sm text-text-secondary mt-1">
                    by <span className="font-medium">{plugin.author_name || 'Unknown'}</span>
                    {plugin.author_username && (
                      <span className="text-text-tertiary"> @{plugin.author_username}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {plugin.categories?.map((cat) => (
                      <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg-gray text-xs font-medium text-text-secondary">
                        <Tag className="w-3 h-3" />
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-3">About</h2>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {plugin.long_description || plugin.description}
                </p>
              </div>

              {/* Versions */}
              {plugin.versions && plugin.versions.length > 0 && (
                <div className="bg-white border border-border rounded-xl">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-text-primary">Versions</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {plugin.versions.map((v) => (
                      <div key={v.id || v.version} className="px-6 py-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold font-mono text-text-primary">v{v.version}</span>
                            <StatusBadge status={v.review_status || 'pending'} />
                          </div>
                          {v.changelog && (
                            <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">{v.changelog}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                            {v.min_panel_version && (
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Panel {v.min_panel_version}+
                              </span>
                            )}
                            {v.created_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(v.created_at).toLocaleDateString()}
                              </span>
                            )}
                            {v.bundle_size > 0 && (
                              <span>{(v.bundle_size / 1024).toFixed(0)} KB</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Install card */}
              <div className="bg-white border border-border rounded-xl p-6 space-y-4">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${plugin.pricing_model === 'free' ? 'text-success' : 'text-text-primary'}`}>
                    {priceDisplay}
                  </p>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                  <Download className="w-4 h-4" />
                  Install Plugin
                </button>
              </div>

              {/* Stats card */}
              <div className="bg-white border border-border rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Details</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Downloads</span>
                    <span className="font-medium text-text-primary">{formatNumber(plugin.download_count || 0)}</span>
                  </div>
                  {plugin.versions?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Latest Version</span>
                      <span className="font-mono font-medium text-text-primary">v{plugin.versions[0].version}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Pricing</span>
                    <span className="font-medium text-text-primary capitalize">{plugin.pricing_model?.replace('_', ' ')}</span>
                  </div>
                  {plugin.created_at && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Published</span>
                      <span className="font-medium text-text-primary">{new Date(plugin.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {plugin.tags?.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {plugin.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-bg-gray text-xs font-medium text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Boxes className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-text-primary">Powered by ACP Market v{APP_VERSION}</span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">&copy;{new Date().getFullYear()} NovaHelix</p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
