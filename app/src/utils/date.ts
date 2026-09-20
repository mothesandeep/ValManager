export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isThisMonth(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const today = todayStr;

export function currentMonthStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthYear(monthStr?: string | null): string {
  if (!monthStr || monthStr === 'all') return 'All Time';
  const parts = monthStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return monthStr;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function shiftMonth(monthStr: string, offsetMonths: number): string {
  if (!monthStr || monthStr === 'all') {
    monthStr = currentMonthStr();
  }
  const parts = monthStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const dt = new Date(y, m - 1 + offsetMonths, 1);
  const newY = dt.getFullYear();
  const newM = String(dt.getMonth() + 1).padStart(2, '0');
  return `${newY}-${newM}`;
}
