export const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export function formatDayMonth(isoStr?: string | null): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return isoStr;
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const clean = d.includes('T') ? d.split('T')[0] : d;
  const dt = new Date(clean + 'T00:00:00');
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isThisMonth(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split('-');
  if (parts.length < 2) return false;
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  return Number(parts[0]) === curY && Number(parts[1]) === curM;
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const today = todayStr;

export function currentMonthStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthYear(monthStr?: string | null): string {
  if (!monthStr || monthStr === 'all') return 'All Time';
  if (monthStr === '7days') return 'Last 7 Days';
  if (monthStr.startsWith('custom:')) {
    const parts = monthStr.split(':');
    const start = parts[1];
    const end = parts[2];
    if (start && end) return `${formatDayMonth(start)} - ${formatDayMonth(end)}`;
    if (start) return `From ${formatDayMonth(start)}`;
    if (end) return `Until ${formatDayMonth(end)}`;
    return 'Custom Range';
  }
  if (monthStr.startsWith('fy-')) {
    const y = parseInt(monthStr.replace('fy-', ''), 10);
    return `FY ${y}-${String(y + 1).slice(-2)}`;
  }
  const parts = monthStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return monthStr;
  const dt = new Date(y, m - 1, 1);
  return `${SHORT_MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function shiftMonth(monthStr: string, offsetMonths: number): string {
  if (!monthStr || monthStr === 'all' || monthStr === '7days' || monthStr.startsWith('custom:') || monthStr.startsWith('fy-')) {
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
