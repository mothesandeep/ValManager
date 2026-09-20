import React from 'react'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-medium text-[var(--color-ink-soft)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
