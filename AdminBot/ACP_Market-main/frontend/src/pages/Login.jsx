import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Boxes, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Modal from '../components/Modal';
import useAuthStore from '../stores/authStore';
import { APP_VERSION } from '../constants/version';
import api from '../api/client';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(t('login.resetPasswordSent'));
    } catch {
      setForgotMessage(t('login.resetPasswordError'));
    } finally {
      setForgotLoading(false);
    }
  };

  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password, rememberMe);
      } else {
        await register({
          email: form.email,
          password: form.password,
          username: form.username,
          display_name: form.displayName,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'An unexpected error occurred';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  const features = t('login.features', { returnObjects: true });

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <Boxes className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">ACP Market</span>
          </div>

          {/* Tagline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            The Plugin Marketplace
            <br />
            for AdminChat Panel
          </h1>

          {/* Description */}
          <p className="text-slate-400 text-lg mb-10 max-w-md">
            Discover, publish, and manage plugins for AdminChat Panel. Join our
            growing community of developers building the future of chat
            administration.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                <span className="text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <p>Powered by ACP Market v{APP_VERSION}</p>
          <p>&copy;{new Date().getFullYear()} NovaHelix</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Boxes className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-text-primary">
              ACP Market
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">
              {mode === 'login' ? t('login.signIn') : t('login.signUp')}
            </h2>
            <p className="text-text-secondary mt-1">
              {mode === 'login'
                ? t('login.welcomeBack')
                : t('login.createAccount')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    {t('login.username')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="your-username"
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    {t('login.displayName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t('login.email')}
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 pr-11 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password (login only) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-secondary">
                    {t('login.rememberMe')}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotEmail(form.email);
                    setForgotMessage('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? mode === 'login'
                  ? t('login.signingIn')
                  : t('login.creatingAccount')
                : mode === 'login'
                  ? t('login.signIn')
                  : t('login.signUp')}
            </button>
          </form>

          {/* Divider (login only) */}
          {mode === 'login' && (
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-text-tertiary">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Mode Toggle */}
          <p
            className={`text-center text-sm text-text-secondary ${mode === 'register' ? 'mt-6' : ''}`}
          >
            {mode === 'login'
              ? t('login.noAccount') + ' '
              : t('login.hasAccount') + ' '}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === 'login' ? 'register' : 'login')
              }
              className="font-medium text-primary hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
        footer={
          <>
            <button
              onClick={() => setForgotOpen(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotEmail}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-4">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        {forgotMessage && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {forgotMessage}
          </div>
        )}
        <input
          type="email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </Modal>
    </div>
  );
}
