import React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ children, className = '', style, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`px-3 py-3 rounded-md border bg-white text-base outline-none transition-all min-h-[44px] ${className}`}
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

