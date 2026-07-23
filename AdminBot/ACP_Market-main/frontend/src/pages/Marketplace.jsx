import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Search, ChevronDown } from 'lucide-react';
import api from '../api/client';
import PluginCard from '../components/PluginCard';
import useAuthStore from '../stores/authStore';
import { APP_VERSION } from '../constants/version';

const CATEGORIES = [
  'All',
  'Productivity',
  'Analytics',
  'Communication',
  'Security',
  'Developer Tools',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'downloads', label: 'Most Downloads' },
];

export default function Marketplace() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState('popular');
  const [sortOpen, setSortOpen] = useState(false);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, page_size: 12, sort };
        if (query.trim()) params.q = query.trim();
        if (activeCategory !== 'All') params.category = activeCategory;

        const { data } = await api.get('/plugins', { params, signal: controller.signal });
        if (cancelled) return;
        setPlugins(data.items || data.results || data);
        const total = data.total || data.count || 0;
        const pageSize = data.page_size || 12;
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      } catch (err) {
        if (cancelled) return;
        if (err.name !== 'CanceledError') {
          console.error('Failed to fetch plugins:', err);
          setError('Failed to load plugins. Please try again.');
          setPlugins([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [query, activeCategory, sort, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleSortSelect = (value) => {
    setSort(value);
    setSortOpen(false);
    setPage(1);
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort';

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Navigation Bar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + nav links */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-primary" />
              <span className="text-lg font-bold text-text-primary">ACP Market</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-primary">
                Explore
              </Link>
              <Link to="/categories" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Categories
              </Link>
              <Link
                to="/docs"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Documentation
              </Link>
            </div>
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/login?tab=register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-[40px] font-bold text-text-primary leading-tight">
            Discover Powerful Plugins
          </h1>
          <p className="mt-3 text-lg text-text-secondary max-w-xl mx-auto">
            Browse, install and manage plugins for your AdminChat Panel
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto">
            <div className="flex items-center bg-bg border border-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <div className="pl-4">
                <Search className="w-5 h-5 text-text-tertiary" />
              </div>
              <input
                type="text"
                placeholder="Search plugins..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 px-3 py-3.5 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-bg text-text-secondary hover:bg-primary-light hover:text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plugin Grid Section ── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">
            {activeCategory === 'All' ? 'Popular Plugins' : activeCategory}
          </h2>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              {currentSortLabel}
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-border rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSortSelect(opt.value)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sort === opt.value
                          ? 'text-primary bg-primary-light font-medium'
                          : 'text-text-secondary hover:bg-bg'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        {error ? (
          <div className="text-center py-20">
            <p className="text-sm text-danger mb-3">{error}</p>
            <button onClick={() => setPage((p) => p)} className="text-sm text-primary hover:underline">Retry</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-border rounded-2xl animate-pulse">
                <div className="flex gap-3.5 p-5">
                  <div className="w-12 h-12 rounded-xl bg-bg" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-bg rounded w-3/4" />
                    <div className="h-3 bg-bg rounded w-1/2" />
                  </div>
                </div>
                <div className="px-5 pb-2 space-y-2">
                  <div className="h-3 bg-bg rounded w-full" />
                  <div className="h-3 bg-bg rounded w-2/3" />
                </div>
                <div className="px-5 py-4">
                  <div className="h-4 bg-bg rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-1">No plugins found</h3>
            <p className="text-sm text-text-secondary">
              Try adjusting your search or category filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plugins.map((plugin) => (
              <PluginCard key={plugin.plugin_id || plugin.id} plugin={plugin} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Boxes className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-text-primary">
                Powered by ACP Market v{APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              &copy;{new Date().getFullYear()} NovaHelix
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Documentation
            </Link>
            <a href="/terms" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Terms
            </a>
            <a href="/privacy" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
