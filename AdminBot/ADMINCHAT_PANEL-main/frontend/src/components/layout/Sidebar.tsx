import { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Bot,
  HelpCircle,
  BarChart3,
  BrainCircuit,
  ShieldCheck,
  Settings,
  Store,
  Ban,
  BookOpen,
  FileText,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useActivePlugins } from '../../plugins/useInstalledPlugins';
import { resolveIcon } from '../../plugins/iconResolver';
import type { Role } from '../../types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  labelKey: string;
  minRole: Role;
}

const roleLevel: Record<Role, number> = {
  agent: 0,
  admin: 1,
  super_admin: 2,
};

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, labelKey: 'nav.dashboard', minRole: 'agent' },
  { to: '/chat', icon: <MessageSquare size={20} />, labelKey: 'nav.chat', minRole: 'agent' },
  { to: '/users', icon: <Users size={20} />, labelKey: 'nav.users', minRole: 'agent' },
  { to: '/blacklist', icon: <Ban size={20} />, labelKey: 'nav.blacklist', minRole: 'agent' },
  { to: '/bots', icon: <Bot size={20} />, labelKey: 'nav.bots', minRole: 'admin' },
  { to: '/faq', icon: <HelpCircle size={20} />, labelKey: 'nav.faq', minRole: 'admin' },
  { to: '/faq/ranking', icon: <BarChart3 size={20} />, labelKey: 'nav.ranking', minRole: 'agent' },
  { to: '/faq/missed', icon: <BookOpen size={20} />, labelKey: 'nav.missed', minRole: 'admin' },
  { to: '/ai', icon: <BrainCircuit size={20} />, labelKey: 'nav.ai', minRole: 'super_admin' },
  { to: '/admins', icon: <ShieldCheck size={20} />, labelKey: 'nav.admins', minRole: 'super_admin' },
  { to: '/audit-logs', icon: <FileText size={20} />, labelKey: 'nav.auditLog', minRole: 'super_admin' },
  { to: '/settings', icon: <Settings size={20} />, labelKey: 'nav.settings', minRole: 'super_admin' },
  { to: '/market', icon: <Store size={20} />, labelKey: 'nav.market', minRole: 'admin' },
];

function SidebarInner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const userRole = user?.role ?? 'agent';
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [expanded, setExpanded] = useState(false);
  const { data: activePlugins } = useActivePlugins();

  // Build plugin nav items from active plugins' manifests
  const pluginNavItems: NavItem[] = (activePlugins || [])
    .flatMap(p => (p.manifest.frontend?.sidebar || []).map(item => ({
      to: item.path,
      icon: (() => { const Icon = resolveIcon(item.icon); return <Icon size={20} />; })(),
      labelKey: item.label, // Plugin labels are used as-is
      minRole: item.minRole as Role,
    })));

  // Merge: core items + plugin items (insert after 'bots' position)
  const allItems = [...navItems];
  const botsIdx = allItems.findIndex(i => i.to === '/bots');
  const insertIdx = botsIdx >= 0 ? botsIdx + 1 : allItems.length;
  allItems.splice(insertIdx, 0, ...pluginNavItems);

  const visibleItems = allItems.filter(
    (item) => roleLevel[userRole] >= roleLevel[item.minRole]
  );

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed top-0 left-0 z-50 flex flex-col h-screen bg-bg-sidebar glass-sidebar border-r border-border-subtle shrink-0 transition-all duration-200 ease-in-out ${
        expanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 border-b border-border-subtle px-4 overflow-hidden">
        <span className="text-accent font-bold text-sm tracking-tight whitespace-nowrap">
          {expanded ? 'ADMINCHAT' : 'AC'}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 py-3 overflow-y-auto px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 h-11 rounded-lg transition-colors relative ${
                expanded ? 'px-3' : 'justify-center'
              } ${
                isActive
                  ? 'bg-accent/5 text-accent'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                )}
                <span className="shrink-0">{item.icon}</span>
                <span
                  className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
                    expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom - theme toggle + logout + version */}
      <div className="flex flex-col gap-2 py-3 border-t border-border-subtle px-2">
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 h-11 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors ${
            expanded ? 'px-3' : 'justify-center'
          }`}
          title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
          aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
        >
          {theme === 'dark' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
          <span
            className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
              expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            }`}
          >
            {theme === 'dark' ? t('theme.light') : t('theme.dark')}
          </span>
        </button>
        <button
          onClick={logout}
          className={`flex items-center gap-3 h-11 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors ${
            expanded ? 'px-3' : 'justify-center'
          }`}
          title={t('common.logout')}
        >
          <LogOut size={20} className="shrink-0" />
          <span
            className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
              expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            }`}
          >
            {t('common.logout')}
          </span>
        </button>
        <div className="flex flex-col items-center px-1 select-none">
          <span className="text-text-placeholder text-[8px] leading-tight">v{__APP_VERSION__}</span>
          <span className="text-text-placeholder text-[7px] leading-tight">&reg; NH&times;SK</span>
        </div>
      </div>
    </aside>
  );
}

const Sidebar = memo(SidebarInner);
export default Sidebar;
