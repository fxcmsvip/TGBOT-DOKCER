import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ children, language = '', title = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof children === 'string' ? children : '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-bg-gray/70 border-b border-border">
          <span className="text-xs font-medium text-text-tertiary">{title}</span>
          {language && <span className="text-[10px] font-mono text-text-tertiary uppercase">{language}</span>}
        </div>
      )}
      <div className="relative group">
        <pre className="bg-[#1a1a2e] text-[#e0e0e0] text-[13px] leading-relaxed p-4 overflow-x-auto font-mono">
          <code>{children}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/10 text-white/60 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
