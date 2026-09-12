import React from 'react'

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
      className="rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full shadow-2xs"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-[11px] sm:text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider truncate">
        {label}
      </span>
      <span
        className={`text-lg sm:text-2xl font-black tabular-nums leading-tight my-1 truncate ${loading ? 'skeleton' : ''}`}
        style={{
          color: loading ? 'transparent' : toneColor,
          fontFamily: 'var(--font-display)',
        }}
      >
        {/* non-breaking spaces keep skeleton width realistic */}
        {loading ? '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' : value}
      </span>
      {sub && (
        <span className="text-[11px] sm:text-xs text-[var(--color-ink-soft)] truncate font-medium">
          {sub}
        </span>
      )}
    </div>
  )
}

