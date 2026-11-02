import React from 'react'
import { cn } from '@/utils/cn'

export type KpiDotColor = 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'violet' | 'sky' | 'blue' | 'green' | 'red'

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  unit?: string
  subtitle?: React.ReactNode
  dotColor?: KpiDotColor | string
  dotClassName?: string
  valueClassName?: string
  loading?: boolean
  onClick?: () => void
  badge?: React.ReactNode
  className?: string
}

const DOT_COLORS: Record<string, string> = {
  emerald: 'bg-[#15803D]',
  green: 'bg-[#15803D]',
  amber: 'bg-[#B45309]',
  rose: 'bg-[#B91C1C]',
  red: 'bg-[#B91C1C]',
  indigo: 'bg-[#2563EB]',
  blue: 'bg-[#2563EB]',
  sky: 'bg-[#2563EB]',
  slate: 'bg-[#64748B]',
  violet: 'bg-[#2563EB]',
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  dotColor = 'slate',
  dotClassName = '',
  valueClassName = '',
  loading = false,
  onClick,
  badge,
  className = '',
}) => {
  const dotBg = DOT_COLORS[dotColor] || dotColor

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between min-h-[104px] transition-all hover:border-slate-300 dark:hover:border-slate-700',
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
    >
      {/* Top Header: Dot Indicator + Uppercase Label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className={cn('w-2 h-2 rounded-full shrink-0', dotBg, dotClassName)} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {label}
          </span>
        </div>
        {badge && <div className="shrink-0 ml-1">{badge}</div>}
      </div>

      {/* Metric Value & Subtitle */}
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse my-1" />
        ) : (
          <div
            className={cn(
              'text-2xl font-bold tracking-tight tabular-nums truncate flex items-baseline leading-tight text-ink dark:text-white',
              valueClassName
            )}
          >
            <span>{value}</span>
            {unit && (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1 font-sans">
                {unit}
              </span>
            )}
          </div>
        )}
        {subtitle && (
          <div
            className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate whitespace-nowrap font-normal leading-tight"
            title={typeof subtitle === 'string' ? subtitle : undefined}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export default KpiCard
