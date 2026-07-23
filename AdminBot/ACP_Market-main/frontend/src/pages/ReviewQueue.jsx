import { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Zap, Database, Puzzle, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import Modal from '../components/Modal';
import api from '../api/client';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'changes_requested', label: 'Changes Requested' },
];

const ICON_MAP = {
  productivity: { icon: Zap, bg: 'bg-amber-100', color: 'text-amber-600' },
  analytics: { icon: Database, bg: 'bg-blue-100', color: 'text-blue-600' },
  default: { icon: Puzzle, bg: 'bg-primary-light', color: 'text-primary' },
};

function getIconConfig(category) {
  const key = (category || '').toLowerCase();
  return ICON_MAP[key] || ICON_MAP.default;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function ReviewQueue() {
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ open: false, submission: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Approve confirmation state
  const [approveConfirm, setApproveConfirm] = useState({ open: false, submission: null });

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, page_size: 20 };
      if (filter !== 'all') params.status = filter;
      const { data } = await api.get('/review/queue', { params });
      setSubmissions(data.items || data.results || data || []);
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
      setError('Failed to load review queue. Please try again.');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const handleApprove = async (submission) => {
    setApproveConfirm({ open: true, submission });
  };

  const confirmApprove = async () => {
    const { submission } = approveConfirm;
    if (!submission) return;
    setActionLoading(submission.submission_id || submission.id);
    try {
      await api.post(`/review/${submission.submission_id || submission.id}/approve`);
      setApproveConfirm({ open: false, submission: null });
      fetchQueue();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (submission) => {
    setRejectModal({ open: true, submission });
    setRejectReason('');
    setRejectNotes('');
  };

  const confirmReject = async () => {
    const { submission } = rejectModal;
    if (!submission || !rejectReason.trim()) return;
    setActionLoading(submission.submission_id || submission.id);
    try {
      await api.post(`/review/${submission.submission_id || submission.id}/reject`, {
        reason: rejectReason.trim(),
        notes: rejectNotes.trim(),
      });
      setRejectModal({ open: false, submission: null });
      setRejectReason('');
      setRejectNotes('');
      fetchQueue();
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async () => {
    const { submission } = rejectModal;
    if (!submission || !rejectReason.trim()) return;
    setActionLoading(submission.submission_id || submission.id);
    try {
      await api.post(`/review/${submission.submission_id || submission.id}/request-changes`, {
        reason: rejectReason.trim(),
        notes: rejectNotes.trim(),
      });
      setRejectModal({ open: false, submission: null });
      setRejectReason('');
      setRejectNotes('');
      fetchQueue();
    } catch (err) {
      console.error('Failed to request changes:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions = submissions;
  const totalCount = submissions.length;

  return (
    <DashboardLayout title="Review Queue">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-primary-light text-primary hover:bg-primary/10'
            }`}
          >
            {f.label}
            {f.key === 'all' && (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                  filter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && !loading ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">Something went wrong</h3>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            onClick={fetchQueue}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-border rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-bg-gray" />
                  <div className="space-y-2">
                    <div className="h-4 bg-bg-gray rounded w-40" />
                    <div className="h-3 bg-bg-gray rounded w-24" />
                    <div className="h-3 bg-bg-gray rounded w-64 mt-2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 bg-bg-gray rounded-lg" />
                  <div className="h-9 w-24 bg-bg-gray rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">
            No pending reviews
          </h3>
          <p className="text-sm text-text-secondary">
            All submissions have been reviewed. Check back later.
          </p>
        </div>
      ) : (
        /* Review Cards */
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const id = sub.submission_id || sub.id;
            const iconCfg = getIconConfig(sub.category);
            const Icon = iconCfg.icon;
            const isActioning = actionLoading === id;

            return (
              <div
                key={id}
                className="bg-white border border-border rounded-xl p-6 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section */}
                  <div className="flex gap-4 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl ${iconCfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-6 h-6 ${iconCfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {sub.plugin_name || sub.name}
                        </h3>
                        {sub.version && (
                          <span className="text-xs text-text-tertiary bg-bg-gray px-2 py-0.5 rounded-full shrink-0">
                            v{sub.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mb-2">
                        by {sub.author_name || sub.author || sub.developer_name || 'Unknown'}{' '}
                        {sub.submitted_at && (
                          <span>&middot; {formatTimeAgo(sub.submitted_at)}</span>
                        )}
                      </p>
                      {sub.description && (
                        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                          {sub.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.category && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-primary-light text-primary rounded-full">
                            {sub.category}
                          </span>
                        )}
                        {sub.pricing && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-bg-gray text-text-secondary rounded-full">
                            {sub.pricing}
                          </span>
                        )}
                        {sub.status === 'changes_requested' && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-600 rounded-full">
                            Changes Requested
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(sub)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(sub)}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-danger-light text-danger rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        open={approveConfirm.open}
        onClose={() => setApproveConfirm({ open: false, submission: null })}
        title="Approve Submission"
        footer={
          <>
            <button
              onClick={() => setApproveConfirm({ open: false, submission: null })}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {actionLoading ? 'Approving...' : 'Confirm Approve'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-2">
          Are you sure you want to approve{' '}
          <span className="font-medium text-text-primary">
            {approveConfirm.submission?.plugin_name || approveConfirm.submission?.name}
          </span>
          ? This will publish the plugin to the marketplace.
        </p>
      </Modal>

      {/* Reject / Request Changes Modal */}
      <Modal
        open={rejectModal.open}
        onClose={() => {
          setRejectModal({ open: false, submission: null });
          setRejectReason('');
          setRejectNotes('');
        }}
        title="Reject / Request Changes"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={() => {
                setRejectModal({ open: false, submission: null });
                setRejectReason('');
                setRejectNotes('');
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-gray rounded-lg hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={actionLoading || !rejectReason.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              Request Changes
            </button>
            <button
              onClick={confirmReject}
              disabled={actionLoading || !rejectReason.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-5">
          Provide a reason for rejecting{' '}
          <span className="font-medium text-text-primary">
            {rejectModal.submission?.plugin_name || rejectModal.submission?.name}
          </span>
          .
        </p>

        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Reason <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Security vulnerability, missing docs..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
        />

        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          placeholder="Additional feedback for the developer..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </Modal>
    </DashboardLayout>
  );
}
