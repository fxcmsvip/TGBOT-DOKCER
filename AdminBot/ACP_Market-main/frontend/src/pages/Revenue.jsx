import { useState, useEffect } from 'react';
import { Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { escapeCsvCell } from '../utils/format';
import api from '../api/client';

export default function Revenue() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    totalSales: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const { data: resp } = await api.get('/billing/purchases');
      const items = resp.items || resp.results || resp || [];

      // Derive stats from license data
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalEarnings = 0;
      let thisMonth = 0;

      const mapped = items.map((purchase) => {
        const amountCents = purchase.amount_cents || 0;
        const payoutCents = purchase.developer_payout_cents || 0;
        const amount = amountCents / 100;
        const share = payoutCents / 100;
        totalEarnings += share;

        const date = new Date(purchase.created_at);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          thisMonth += share;
        }

        return {
          id: purchase.id,
          plugin: purchase.plugin_name || 'Unknown Plugin',
          buyer: `User #${purchase.buyer_id}`,
          amount,
          share,
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          rawDate: date,
        };
      });

      // Sort newest first
      mapped.sort((a, b) => b.rawDate - a.rawDate);

      setTransactions(mapped);
      setStats({
        totalEarnings,
        thisMonth,
        totalSales: mapped.length,
      });
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions. Please try again.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleConnectStripe() {
    alert('Stripe Connect integration coming soon! This will redirect you to Stripe onboarding.');
  }

  function handleExport() {
    if (transactions.length === 0) return;

    const header = 'Plugin,Buyer,Amount,Your Share (70%),Date';
    const rows = transactions.map(
      (t) => [
        escapeCsvCell(t.plugin),
        escapeCsvCell(t.buyer),
        escapeCsvCell(`$${t.amount.toFixed(2)}`),
        escapeCsvCell(`$${t.share.toFixed(2)}`),
        escapeCsvCell(t.date),
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatCurrency(value) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const statCards = [
    {
      label: 'Total Earnings',
      value: formatCurrency(stats.totalEarnings),
      trend: null,
      trendUp: false,
      sub: 'All time revenue (70% share)',
    },
    {
      label: 'This Month',
      value: formatCurrency(stats.thisMonth),
      trend: null,
      trendUp: false,
      sub: 'Current month earnings',
    },
    {
      label: 'Total Sales',
      value: stats.totalSales.toLocaleString(),
      trend: null,
      trendUp: false,
      sub: 'Licenses sold',
    },
  ];

  return (
    <DashboardLayout title="Revenue">
      <div className="space-y-6">
        {/* ── Stripe Connect Card ── */}
        <div className="flex items-center justify-between bg-white border border-border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">S</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Stripe Connect</h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                {stripeConnected
                  ? 'Your account is connected and receiving payouts'
                  : 'Connect your Stripe account to receive payouts'}
              </p>
            </div>
          </div>

          {stripeConnected ? (
            <button
              onClick={() =>
                alert('This would open your Stripe dashboard.')
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              Manage Account
              <ExternalLink className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConnectStripe}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Connect Stripe
            </button>
          )}
        </div>

        {/* ── Error State ── */}
        {error && !loading && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-4">
            <AlertCircle className="w-5 h-5 text-danger shrink-0" />
            <span className="text-sm text-red-700 flex-1">{error}</span>
            <button onClick={fetchTransactions} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white border border-border rounded-xl p-5"
            >
              <p className="text-xs font-medium text-text-tertiary">{card.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-bold text-text-primary">{card.value}</span>
                {card.trend && (
                  <span
                    className={`text-xs font-medium mb-1 ${
                      card.trendUp ? 'text-success' : 'text-red-500'
                    }`}
                  >
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-tertiary mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Recent Transactions Table ── */}
        <div className="bg-white border border-border rounded-xl">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
            <button
              onClick={handleExport}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-gray transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 bg-bg-gray rounded w-1/4" />
                  <div className="h-4 bg-bg-gray rounded w-1/5" />
                  <div className="h-4 bg-bg-gray rounded w-1/6" />
                  <div className="h-4 bg-bg-gray rounded w-1/6" />
                  <div className="h-4 bg-bg-gray rounded w-1/6" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center mx-auto mb-3">
                <Download className="w-5 h-5 text-text-tertiary" />
              </div>
              <h4 className="text-sm font-medium text-text-primary mb-1">No transactions yet</h4>
              <p className="text-xs text-text-tertiary max-w-xs mx-auto">
                When users purchase your plugins, transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary">Plugin</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary">Buyer</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary">Amount</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary">Your Share (70%)</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-bg-gray/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-text-primary">{tx.plugin}</td>
                      <td className="px-6 py-3.5 text-text-secondary">{tx.buyer}</td>
                      <td className="px-6 py-3.5 text-right text-text-secondary">{formatCurrency(tx.amount)}</td>
                      <td className="px-6 py-3.5 text-right font-medium text-success">{formatCurrency(tx.share)}</td>
                      <td className="px-6 py-3.5 text-right text-text-tertiary">{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
