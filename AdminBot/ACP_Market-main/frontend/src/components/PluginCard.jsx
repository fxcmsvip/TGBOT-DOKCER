import { Download, Puzzle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PluginCard({ plugin }) {
  const cents = plugin.price_cents ?? 0;
  const priceDisplay = plugin.pricing_model === 'free'
    ? 'Free'
    : plugin.pricing_model === 'one_time'
      ? `$${(cents / 100).toFixed(2)}`
      : `$${(cents / 100).toFixed(2)}/mo`;

  return (
    <Link
      to={`/plugins/${plugin.plugin_id || plugin.id}`}
      className="block bg-white border border-border rounded-2xl hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex gap-3.5 p-5">
        <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
          <Puzzle className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors truncate">{plugin.name}</h3>
          <p className="text-xs text-text-tertiary">by {plugin.author_name || plugin.author?.display_name || plugin.author?.username || 'Unknown'}</p>
        </div>
      </div>
      <div className="px-5 pb-2">
        <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-2">{plugin.description}</p>
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <span className={`text-sm font-semibold ${plugin.pricing_model === 'free' ? 'text-success' : 'text-text-primary'}`}>
          {priceDisplay}
        </span>
        <div className="flex items-center gap-1 text-text-tertiary">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{formatNum(plugin.download_count || 0)}</span>
        </div>
      </div>
    </Link>
  );
}

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}
