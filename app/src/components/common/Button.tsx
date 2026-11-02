import React from 'react'
import { cn } from '@/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  style,
  ...props
}: ButtonProps) {
  const sizeClasses =
    size === 'sm'
      ? 'h-9 px-3 text-xs min-h-[36px]'
      : size === 'lg'
        ? 'h-12 px-6 text-base min-h-[48px]'
        : 'h-11 px-4 text-sm min-h-[44px]'

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1'

  let variantClasses = ''

  switch (variant) {
    case 'primary':
      variantClasses =
        'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold shadow-sm border border-blue-600'
      break
    case 'secondary':
      variantClasses =
        'bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm font-medium'
      break
    case 'ghost':
      variantClasses =
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
      break
    case 'danger':
      variantClasses =
        'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-medium'
      break
  }

  return (
    <button
      {...props}
      style={style}
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
    >
      {children}
    </button>
  )
}

export default Button
