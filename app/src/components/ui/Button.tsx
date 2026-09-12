import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  style,
  ...props
}: ButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-brass)',
      color: '#ffffff',
      border: '1px solid transparent',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      background: 'transparent',
      color: 'var(--color-due)',
      border: '1px solid color-mix(in srgb, var(--color-due) 25%, transparent)',
    },
  }

  return (
    <button
      {...props}
      style={{ ...styles[variant], ...style }}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium active:scale-[0.98] transition-transform select-none cursor-pointer disabled:opacity-50 min-h-[44px] ${className}`}
    >
      {children}
    </button>
  )
}

