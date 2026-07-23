const variants = {
  published: { bg: 'bg-success-light', text: 'text-success', label: 'Published' },
  approved: { bg: 'bg-success-light', text: 'text-success', label: 'Approved' },
  active: { bg: 'bg-success-light', text: 'text-success', label: 'Active' },
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending' },
  in_review: { bg: 'bg-warning-light', text: 'text-warning', label: 'In Review' },
  rejected: { bg: 'bg-danger-light', text: 'text-danger', label: 'Rejected' },
  suspended: { bg: 'bg-danger-light', text: 'text-danger', label: 'Suspended' },
  changes_requested: { bg: 'bg-warning-light', text: 'text-warning', label: 'Changes Requested' },
  developer: { bg: 'bg-primary-light', text: 'text-primary', label: 'Developer' },
  reviewer: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Reviewer' },
  admin: { bg: 'bg-danger-light', text: 'text-danger', label: 'Admin' },
  super_admin: { bg: 'bg-danger-light', text: 'text-danger', label: 'Super Admin' },
  free: { bg: 'bg-success-light', text: 'text-success', label: 'Free' },
};

export default function StatusBadge({ status, label }) {
  const v = variants[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${v.bg} ${v.text}`}>
      {label || v.label}
    </span>
  );
}
