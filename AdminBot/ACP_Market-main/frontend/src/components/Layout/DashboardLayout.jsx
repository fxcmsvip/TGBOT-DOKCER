import { Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import useAuthStore from '../../stores/authStore';

export default function DashboardLayout({ title, children, headerRight }) {
  const user = useAuthStore((s) => s.user);
  const initial = user?.display_name?.[0] || user?.username?.[0] || 'U';

  return (
    <div className="flex h-screen bg-bg-gray">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between h-16 px-8 bg-white border-b border-border shrink-0">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          <div className="flex items-center gap-4">
            {headerRight}
            <Bell className="w-5 h-5 text-text-secondary cursor-pointer hover:text-text-primary transition-colors" />
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-white">{initial.toUpperCase()}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
