import { Link, useLocation } from 'react-router-dom';
import { navigation } from './navigation';

export default function DocsSidebar({ onNavigate }) {
  const { pathname } = useLocation();

  return (
    <nav className="space-y-6">
      {navigation.map((group) => (
        <div key={group.title}>
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-3">
            {group.title}
          </h4>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-text-secondary hover:bg-bg-gray hover:text-text-primary'
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
