import React from 'react'
import { cn } from '@/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
  dot?: boolean
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  ...props
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-xs'

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    success: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
    danger:  'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60',
    info:    'bg-[#EFF6FF] text-[#2563EB] border-[#93C5FD] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
    outline: 'bg-transparent text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700',
  }[variant]

  const dotColor = {
    default: 'bg-slate-400',
    success: 'bg-[#15803D] dark:bg-emerald-400',
    warning: 'bg-[#B45309] dark:bg-amber-400',
    danger:  'bg-[#B91C1C] dark:bg-red-400',
    info:    'bg-[#2563EB] dark:bg-blue-400',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-500',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold border tracking-wide select-none',
        sizeClasses,
        variantStyles,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full shrink-0', dotColor)} />}
      {children}
    </span>
  )
}

export default Badge
