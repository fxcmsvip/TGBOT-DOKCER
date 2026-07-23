import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import { checkRole } from './constants/roles';
import Marketplace from './pages/Marketplace';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PluginSubmit from './pages/PluginSubmit';
import Revenue from './pages/Revenue';
import ReviewQueue from './pages/ReviewQueue';
import AdminPanel from './pages/AdminPanel';
import ResetPassword from './pages/ResetPassword';
import PluginDetail from './pages/PluginDetail';
import ApiKeys from './pages/ApiKeys';
import DocsLayout from './pages/docs/DocsLayout';

function ProtectedRoute({ children, minRole }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-text-secondary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;
  if (minRole && !checkRole(user.role, minRole)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-6xl font-bold text-text-tertiary">404</h1>
      <p className="text-text-secondary">Page not found</p>
      <Link to="/" className="text-primary hover:underline">Back to Marketplace</Link>
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/plugins/:pluginId" element={<PluginDetail />} />
        <Route path="/categories" element={<Navigate to="/" />} />
        <Route path="/docs/*" element={<DocsLayout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute minRole="developer"><Dashboard /></ProtectedRoute>} />
        <Route path="/plugins/submit" element={<ProtectedRoute minRole="developer"><PluginSubmit /></ProtectedRoute>} />
        <Route path="/api-keys" element={<ProtectedRoute minRole="developer"><ApiKeys /></ProtectedRoute>} />
        <Route path="/revenue" element={<ProtectedRoute minRole="developer"><Revenue /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute minRole="reviewer"><ReviewQueue /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute minRole="admin"><AdminPanel /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
