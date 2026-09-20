import React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ children, className = '', style, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`px-3 py-2 rounded-[var(--radius-md)] border text-sm outline-none transition-all min-h-[44px] w-full bg-[var(--color-card)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-paper)] cursor-pointer ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink)',
        ...style,
      }}
    >
      {children}
    </select>
  )
}
