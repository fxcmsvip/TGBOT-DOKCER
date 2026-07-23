import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Send } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import api from '../api/client';

const CATEGORIES = [
  'Productivity',
  'Analytics',
  'Communication',
  'Security',
  'Developer Tools',
  'Other',
];

const PRICING_MODELS = [
  { value: 'free', label: 'Free' },
  { value: 'one_time', label: 'One-time Purchase' },
  { value: 'subscription_monthly', label: 'Monthly Subscription' },
  { value: 'subscription_yearly', label: 'Yearly Subscription' },
];

export default function PluginSubmit() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    plugin_id: '',
    name: '',
    description: '',
    category: 'Productivity',
    pricing_model: 'free',
    price: '',
    version: '',
    min_panel_version: '',
    changelog: '',
  });
  const [bundleFile, setBundleFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setError('Only .zip files are allowed.');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be under 100MB.');
        return;
      }
      setError('');
      setBundleFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!bundleFile) {
      setError('Please upload a plugin bundle (.zip).');
      return;
    }

    const priceCents =
      form.pricing_model !== 'free' && form.price
        ? Math.round(parseFloat(form.price) * 100)
        : 0;

    const metadata = {
      plugin_id: form.plugin_id,
      name: form.name,
      description: form.description,
      categories: [form.category],
      tags: [],
      pricing_model: form.pricing_model,
      price_cents: priceCents,
      version: form.version,
      min_panel_version: form.min_panel_version,
      changelog: form.changelog,
    };

    const formData = new FormData();
    formData.append('bundle', bundleFile);
    formData.append('metadata', JSON.stringify(metadata));

    setLoading(true);
    try {
      await api.post('/plugins', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to submit plugin. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Submit Plugin">
      <div className="flex justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-3xl bg-white border border-border rounded-xl p-8"
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary">Plugin Information</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Fill in the details about your plugin
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Plugin ID + Display Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Plugin ID
              </label>
              <input
                type="text"
                name="plugin_id"
                value={form.plugin_id}
                onChange={handleChange}
                placeholder="my-awesome-plugin"
                required
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="My Awesome Plugin"
                required
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what your plugin does..."
              required
              className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Category + Pricing Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Pricing Model
              </label>
              <select
                name="pricing_model"
                value={form.pricing_model}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {PRICING_MODELS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Price Field */}
          {form.pricing_model !== 'free' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
                  $
                </span>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-7 pr-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Plugin Bundle
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary-50 transition-all"
            >
              <Upload className="w-8 h-8 text-text-tertiary" />
              {bundleFile ? (
                <p className="text-sm font-medium text-text-primary">{bundleFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-text-primary">
                    Drag &amp; drop your .zip file here
                  </p>
                  <p className="text-xs text-text-tertiary">or click to browse (max 100MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileDrop}
                className="hidden"
              />
            </div>
          </div>

          {/* Version + Min Panel Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Version
              </label>
              <input
                type="text"
                name="version"
                value={form.version}
                onChange={handleChange}
                placeholder="1.0.0"
                required
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Min Panel Version
              </label>
              <input
                type="text"
                name="min_panel_version"
                value={form.min_panel_version}
                onChange={handleChange}
                placeholder="2.0.0"
                required
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Changelog */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Changelog
            </label>
            <textarea
              name="changelog"
              value={form.changelog}
              onChange={handleChange}
              rows={3}
              placeholder="What's new in this version..."
              className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-gray transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
