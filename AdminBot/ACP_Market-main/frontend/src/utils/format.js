export function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

export function formatCurrency(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export function escapeCsvCell(value) {
  const str = String(value ?? '');
  // Prevent CSV formula injection
  const escaped = str.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}
