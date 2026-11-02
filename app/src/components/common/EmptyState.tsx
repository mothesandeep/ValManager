import React from 'react'
import { Inbox, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  title?: string
  description?: string
  text?: string // backwards compatibility with existing usages
  icon?: React.ElementType
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  text,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  action,
  className = '',
}: EmptyStateProps) {
  // If title is provided, use it; otherwise fallback to text or default title
  const displayTitle = title || (text && !description ? text : 'No records found')
  const displayDescription = description || (title && text ? text : undefined)

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 sm:p-12 flex flex-col items-center justify-center text-center select-none',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shrink-0">
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
        {displayTitle}
      </h3>
      {displayDescription && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm leading-relaxed font-normal">
          {displayDescription}
        </p>
      )}
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </div>
  )
}

export default EmptyState
