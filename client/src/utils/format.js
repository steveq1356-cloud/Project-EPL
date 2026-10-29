const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// $1,234.56, or with { whole } $1,235, or with { compact } $1.2K.
export function money(cents, { whole = false, compact = false } = {}) {
  const dollars = (cents ?? 0) / 100;
  if (compact && Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return (whole ? usdWhole : usd).format(dollars);
}

export const centsToInput = (cents) => (cents ? (cents / 100).toFixed(2) : '');

export function plural(n, word, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const pad = (n) => String(n).padStart(2, '0');
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function shortDate(value) {
  if (!value) return '';
  const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function monthLabel(key, { long = false } = {}) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short' });
}
