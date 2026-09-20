import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  style,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:scale-[0.98]"
  
  let variantClasses = ""
  let variantStyle: React.CSSProperties = {}

  switch (variant) {
    case 'primary':
      variantClasses = "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] opacity-90 hover:opacity-100"
      variantStyle = {
        background: 'var(--color-brass)',
        color: '#ffffff',
        border: '1px solid var(--color-brass-dark)',
      }
      break
    case 'secondary':
      variantClasses = "shadow-[var(--shadow-sm)] hover:bg-[var(--color-paper)]"
      variantStyle = {
        background: 'var(--color-card)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-border)',
      }
      break
    case 'ghost':
      variantClasses = "hover:bg-[var(--color-border-soft)]"
      variantStyle = {
        background: 'transparent',
        color: 'var(--color-ink-soft)',
        border: '1px solid transparent',
      }
      break
    case 'danger':
      variantClasses = "hover:bg-[var(--color-due-bg)]"
      variantStyle = {
        background: 'transparent',
        color: 'var(--color-due)',
        border: '1px solid var(--color-due)',
      }
      break
  }

  return (
    <button
      {...props}
      style={{ ...variantStyle, ...style }}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  )
}
