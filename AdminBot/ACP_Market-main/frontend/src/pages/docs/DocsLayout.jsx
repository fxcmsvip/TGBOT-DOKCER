import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Boxes, Menu, X } from 'lucide-react';
import DocsSidebar from './DocsSidebar';
import useAuthStore from '../../stores/authStore';

import GettingStarted from './content/GettingStarted';
import ApiReference from './content/ApiReference';
import QuickStart from './content/QuickStart';
import PluginManifest from './content/PluginManifest';
import BackendApi from './content/BackendApi';
import FrontendApi from './content/FrontendApi';
import CliReference from './content/CliReference';
import DesignSystem from './content/DesignSystem';
import SecurityModel from './content/SecurityModel';
import PluginLifecycle from './content/PluginLifecycle';
import SharedDependencies from './content/SharedDependencies';

export default function DocsLayout() {
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
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
              <Link to="/docs" className="text-sm font-medium text-primary">
                Documentation
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {user ? (
              <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Log In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 flex gap-8 py-8">
        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>

        {/* Sidebar — mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-16 bottom-0 w-64 bg-white border-r border-border p-4 overflow-y-auto">
              <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-4xl">
          <article className="prose-sm">
            <Routes>
              <Route index element={<GettingStarted />} />
              <Route path="api-reference" element={<ApiReference />} />
              <Route path="quick-start" element={<QuickStart />} />
              <Route path="plugin-manifest" element={<PluginManifest />} />
              <Route path="backend-api" element={<BackendApi />} />
              <Route path="frontend-api" element={<FrontendApi />} />
              <Route path="cli-reference" element={<CliReference />} />
              <Route path="design-system" element={<DesignSystem />} />
              <Route path="security" element={<SecurityModel />} />
              <Route path="plugin-lifecycle" element={<PluginLifecycle />} />
              <Route path="shared-dependencies" element={<SharedDependencies />} />
            </Routes>
          </article>
        </main>
      </div>
    </div>
  );
}
