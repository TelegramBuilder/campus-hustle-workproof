export function naira(n?: number): string {
  if (n === undefined || n === null) return 'Negotiable';
  return '₦' + n.toLocaleString('en-NG');
}

export function priceLabel(style: string, price?: number): string {
  if (style === 'negotiable' || price === undefined || price === null) return 'Negotiable';
  if (style === 'starting_from') return `From ${naira(price)}`;
  return naira(price);
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function timeShort(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function dateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function dateFull(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initials(first: string, last?: string): string {
  return ((first?.[0] ?? '?') + (last?.[0] ?? '')).toUpperCase();
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}