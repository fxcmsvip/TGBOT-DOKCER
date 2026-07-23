import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import {
  LogIn,
  MessageSquare,
  Bot,
  ShieldCheck,
  BarChart3,
  Eye,
  EyeOff,
  User,
  Lock,
} from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginWithCredentials = useAuthStore((s) => s.loginWithCredentials);
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageSquare size={18} />,
      title: t('login.features.bidirectional.title'),
      desc: t('login.features.bidirectional.desc'),
    },
    {
      icon: <Bot size={18} />,
      title: t('login.features.multiBot.title'),
      desc: t('login.features.multiBot.desc'),
    },
    {
      icon: <ShieldCheck size={18} />,
      title: t('login.features.rbac.title'),
      desc: t('login.features.rbac.desc'),
    },
    {
      icon: <BarChart3 size={18} />,
      title: t('login.features.faq.title'),
      desc: t('login.features.faq.desc'),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithCredentials(username, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError.response?.data?.detail || t('login.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-sidebar">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12">
        <div className="max-w-md w-full text-center">
          <h1 className="text-[42px] font-bold tracking-tight font-['Space_Grotesk'] leading-tight">
            <span className="text-accent">ADMINCHAT</span>
          </h1>
          <p className="text-[42px] font-bold text-text-primary font-['Space_Grotesk'] leading-tight">Panel</p>
          <p className="text-text-secondary text-sm leading-relaxed mt-4 max-w-sm mx-auto">
            Telegram customer service management platform with bidirectional
            message forwarding, multi-bot pool, and intelligent FAQ engine.
          </p>

          <div className="space-y-5 text-left max-w-sm mx-auto">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-text-primary text-sm font-medium">{f.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16 lg:border-l lg:border-border-subtle">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight font-['Space_Grotesk']">
              <span className="text-accent">ADMIN</span>
              <span className="text-text-primary">CHAT</span>
            </h1>
            <p className="text-text-muted text-sm mt-1 font-['Space_Grotesk']">Panel</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-[28px] font-bold text-text-primary font-['Space_Grotesk']">{t('login.title')}</h2>
            <p className="text-text-muted text-sm mt-1">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-2 font-['Inter']">
                {t('login.username')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-bg-page border border-border rounded-lg text-text-primary text-sm placeholder:text-text-placeholder focus:outline-none focus:border-accent transition-colors"
                  placeholder={t('login.enterUsername')}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-2 font-['Inter']">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 bg-bg-page border border-border rounded-lg text-text-primary text-sm placeholder:text-text-placeholder focus:outline-none focus:border-accent transition-colors"
                  placeholder={t('login.enterPassword')}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-bg-elevated text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-xs text-text-muted cursor-pointer select-none"
              >
                {t('login.rememberMe')}
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg">
                <p className="text-red text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 h-11 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={16} />
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>

          <p className="text-center text-text-placeholder text-[11px] mt-6 font-['JetBrains_Mono']">
            ADMINCHAT Panel v{__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
