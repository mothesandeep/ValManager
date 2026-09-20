

export interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  tone?: 'due' | 'positive' | 'ink'
  loading?: boolean
}

export function KpiCard({ label, value, sub, tone, loading }: KpiCardProps) {
  const toneColor =
    tone === 'due'
      ? 'var(--color-due)'
      : tone === 'positive'
      ? 'var(--color-positive)'
      : 'var(--color-ink)'

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 flex flex-col justify-between h-full bg-[var(--color-card)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider truncate mb-1">
        {label}
      </span>
      <span
        className={`text-2xl sm:text-3xl font-bold tabular-nums leading-tight truncate ${loading ? 'skeleton' : ''}`}
        style={{
          color: loading ? 'transparent' : toneColor,
          fontFamily: 'var(--font-display)',
        }}
      >
        {loading ? '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' : value}
      </span>
      {sub && (
        <span className="text-xs text-[var(--color-ink-soft)] truncate mt-1">
          {sub}
        </span>
      )}
    </div>
  )
}
