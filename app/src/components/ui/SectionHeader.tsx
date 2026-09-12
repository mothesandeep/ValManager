import React from 'react'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

