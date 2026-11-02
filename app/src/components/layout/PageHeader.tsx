import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SyncIndicator } from '@/components/common/SyncIndicator'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  actions?: React.ReactNode
  rightAction?: React.ReactNode
  leftAction?: React.ReactNode
  onBack?: () => void
  showBack?: boolean
  badge?: React.ReactNode
  className?: string
  showSyncIndicator?: boolean
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  rightAction,
  leftAction,
  onBack,
  showBack,
  badge,
  className = '',
  showSyncIndicator = false,
}: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const shouldShowBack = showBack ?? Boolean(onBack)
  const subText = subtitle || description
  const actionContent = rightAction || actions

  return (
    <header className={cn('flex items-center sm:items-start justify-between gap-2.5 sm:gap-4 mb-3.5 md:mb-6', className)}>
      {/* Left: Back button + Title + Badges + Subtitle */}
      <div className="flex items-center sm:items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
        {shouldShowBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" strokeWidth={2.2} />
          </button>
        ) : (
          leftAction && <div className="shrink-0">{leftAction}</div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0 flex items-center">{badge}</div>}
            {showSyncIndicator && (
              <div className="shrink-0 flex items-center">
                <SyncIndicator compact={true} />
              </div>
            )}
          </div>
          {subText && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-snug line-clamp-1">
              {subText}
            </p>
          )}
        </div>
      </div>

      {/* Right: Date selector / Action badge / Filter trigger */}
      {actionContent && (
        <div className="flex items-center gap-2 shrink-0">
          {actionContent}
        </div>
      )}
    </header>
  )
}

export default PageHeader
