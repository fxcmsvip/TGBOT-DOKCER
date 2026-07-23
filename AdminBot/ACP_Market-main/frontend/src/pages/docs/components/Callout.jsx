import { Info, AlertTriangle, AlertCircle } from 'lucide-react';

const styles = {
  info: {
    border: 'border-primary/30',
    bg: 'bg-primary-light',
    icon: Info,
    iconColor: 'text-primary',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning-light',
    icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  danger: {
    border: 'border-danger/30',
    bg: 'bg-danger-light',
    icon: AlertCircle,
    iconColor: 'text-danger',
  },
};

export default function Callout({ type = 'info', title, children }) {
  const s = styles[type] || styles.info;
  const Icon = s.icon;

  return (
    <div className={`my-4 rounded-lg border ${s.border} ${s.bg} p-4`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${s.iconColor} shrink-0 mt-0.5`} />
        <div className="min-w-0">
          {title && <p className="text-sm font-semibold text-text-primary mb-1">{title}</p>}
          <div className="text-sm text-text-secondary leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
