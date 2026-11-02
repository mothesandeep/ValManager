import React from 'react'

export interface MetricCardItem {
  id?: string
  label: string
  value: React.ReactNode
  subValue?: React.ReactNode
  highlight?: boolean
  className?: string
}

export interface MetricCardProps extends MetricCardItem {}

const getMetricValueStyle = (label: string, highlight?: boolean): string => {
  if (highlight || /billing|amount|total bill/i.test(label)) {
    return 'text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base'
  }
  if (/net val|net kasab|^net$/i.test(label)) {
    return 'text-slate-900 dark:text-white font-bold text-sm sm:text-base'
  }
  return 'text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm'
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  highlight = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 py-2 px-3 rounded-xl text-center flex flex-col justify-center items-center shadow-2xs transition-colors ${className}`}
    >
      <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 tracking-wider mb-0.5 truncate w-full">
        {label}
      </div>
      <div
        className={`font-mono tabular-nums leading-tight truncate w-full ${getMetricValueStyle(label, highlight)}`}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate w-full">
          {subValue}
        </div>
      )}
    </div>
  )
}

export interface MetricCardGridProps {
  metrics: MetricCardItem[]
  columns?: 2 | 4
  className?: string
}

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({
  metrics,
  columns = 4,
  className = '',
}) => {
  const isStrictTwoCol = columns === 2

  return (
    <div
      className={`rounded-xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden grid ${
        isStrictTwoCol ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
      } ${className}`}
    >
      {metrics.map((metric, idx) => {
        const isRightColMobile = idx % 2 === 1
        const isSecondRowMobile = idx >= 2
        const isNotFirstColSm = idx > 0

        const borderClasses = isStrictTwoCol
          ? [
              isRightColMobile ? 'border-l border-slate-200/70 dark:border-slate-800' : '',
              isSecondRowMobile ? 'border-t border-slate-200/70 dark:border-slate-800' : '',
            ]
              .filter(Boolean)
              .join(' ')
          : [
              isRightColMobile ? 'border-l border-slate-200/70 dark:border-slate-800' : '',
              isSecondRowMobile ? 'border-t border-slate-200/70 dark:border-slate-800' : '',
              isNotFirstColSm ? 'sm:border-l sm:border-slate-200/70 dark:sm:border-slate-800' : 'sm:border-l-0',
              'sm:border-t-0',
            ]
              .filter(Boolean)
              .join(' ')

        return (
          <div
            key={metric.id || metric.label || idx}
            className={`py-2 px-3 text-center flex flex-col justify-center items-center ${borderClasses} ${metric.className || ''}`}
          >
            <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-slate-400 tracking-wider mb-0.5 truncate w-full">
              {metric.label}
            </div>
            <div
              className={`font-mono tabular-nums leading-tight truncate w-full ${getMetricValueStyle(metric.label, metric.highlight)}`}
            >
              {metric.value}
            </div>
            {metric.subValue && (
              <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate w-full">
                {metric.subValue}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MetricCardGrid

