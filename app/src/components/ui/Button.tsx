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
      variantClasses = "bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs border border-slate-900 active:scale-[0.98]"
      break
    case 'secondary':
      variantClasses = "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs rounded-lg active:scale-[0.98] font-medium"
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
