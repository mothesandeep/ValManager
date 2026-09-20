import React from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)] mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm font-medium text-[var(--color-ink-soft)] mt-1.5">
            {description}
          </p>
        )}
      </div>
      {actions && actions}
    </div>
  )
}
