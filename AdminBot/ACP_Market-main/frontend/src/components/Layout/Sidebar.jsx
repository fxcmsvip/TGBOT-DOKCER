import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Boxes, LayoutDashboard, Upload, CreditCard, Key, ClipboardCheck, Shield } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { checkRole } from '../../constants/roles';
import { APP_VERSION } from '../../constants/version';

function SidebarLink({ to, icon: Icon, label }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm transition-colors ${
        isActive ? 'bg-primary text-white font-medium' : 'text-sidebar-text hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const userRole = useAuthStore((s) => s.user?.role);
  const isReviewer = userRole && checkRole(userRole, 'reviewer');
  const isAdmin = userRole && checkRole(userRole, 'admin');

  const devLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/plugins/submit', icon: Upload, label: t('nav.submitPlugin') },
    { to: '/api-keys', icon: Key, label: t('nav.apiKeys') },
    { to: '/revenue', icon: CreditCard, label: t('nav.revenue') },
  ];

  const reviewerLinks = [
    { to: '/review', icon: ClipboardCheck, label: t('nav.reviewQueue') },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: t('nav.adminPanel') },
  ];

  return (
    <aside className="w-60 bg-sidebar flex flex-col shrink-0 h-full">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-6">
        <Boxes className="w-7 h-7 text-primary" />
        <span className="text-lg font-bold text-white">ACP Market</span>
      </Link>
      <div className="h-px bg-white/10" />
      <nav className="flex flex-col gap-0.5 px-3 py-4">
        <span className="text-[10px] font-semibold text-slate-500 tracking-widest px-3 py-2">{t('nav.main')}</span>
        {devLinks.map((link) => (
          <SidebarLink key={link.to} {...link} />
        ))}

        {isReviewer && (
          <>
            <span className="text-[10px] font-semibold text-slate-500 tracking-widest px-3 py-2 mt-4">{t('nav.review')}</span>
            {reviewerLinks.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <span className="text-[10px] font-semibold text-slate-500 tracking-widest px-3 py-2 mt-4">{t('nav.admin')}</span>
            {adminLinks.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </>
        )}
      </nav>
      <div className="mt-auto px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Powered by ACP Market v{APP_VERSION}
        </p>
        <p className="text-[11px] text-slate-600">
          &copy;{new Date().getFullYear()} NovaHelix
        </p>
      </div>
    </aside>
  );
}
