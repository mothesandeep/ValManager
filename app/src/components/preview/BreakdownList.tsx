import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { fmtKg } from '@/utils/format'

export interface BreakdownItemRowProps {
  index: number
  title?: React.ReactNode
  tags?: React.ReactNode
  subDetails?: React.ReactNode
  trailingValue?: React.ReactNode
  gross?: React.ReactNode
  tare?: React.ReactNode
  net?: React.ReactNode
  extraBadges?: React.ReactNode
  onEdit?: () => void
  onDelete?: () => void
  editTitle?: string
  deleteTitle?: string
  className?: string
}

export const BreakdownItemRow: React.FC<BreakdownItemRowProps> = ({
  index,
  title,
  tags,
  subDetails,
  trailingValue,
  gross,
  tare,
  net,
  extraBadges,
  onEdit,
  onDelete,
  editTitle = 'Edit this bag',
  deleteTitle = 'Delete this bag',
  className = '',
}) => {
  const hasStructuredWeights = gross !== undefined || tare !== undefined || net !== undefined

  return (
    <div
      className={`p-2.5 sm:p-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors ${className}`}
    >
      {/* Top Line: Bag pill (#1), Quality tag, Badges (Tar/Twist), trailing amount, accessible edit/delete touch targets */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {/* Bag pill */}
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px] shrink-0 border border-slate-200/60 dark:border-slate-700">
            #{index}
          </span>

          {/* Quality tag */}
          {title && (
            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
              {title}
            </span>
          )}

          {/* Badges (Tar, Twist, etc.) */}
          {tags}
        </div>

        {/* Right side: Line total amount & Accessible Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {trailingValue && (
            <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
              {trailingValue}
            </div>
          )}

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-0.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                  title={editTitle}
                  aria-label={editTitle}
                >
                  <Pencil size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 transition-all cursor-pointer group/trash"
                  title={deleteTitle}
                  aria-label={deleteTitle}
                >
                  <Trash2 size={13} className="text-slate-400 group-hover/trash:text-red-600 dark:group-hover/trash:text-red-400 transition-colors" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Clean badge layout for Gross, Tare, Net & extra badges */}
      {hasStructuredWeights ? (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
          {gross !== undefined && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
              <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">Gross</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{gross}</span>
            </span>
          )}
          {tare !== undefined && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
              <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">Tare</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{tare}</span>
            </span>
          )}
          {net !== undefined && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
              <span className="text-[9px] uppercase font-semibold text-emerald-600/80 dark:text-emerald-400/80">Net</span>
              <span className="font-bold">{net}</span>
            </span>
          )}
          {extraBadges}
        </div>
      ) : subDetails ? (
        <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
          {subDetails}
        </div>
      ) : null}
    </div>
  )
}

export interface BreakdownListProps {
  title?: string
  count: number
  totalGross?: number
  headerRightExtra?: React.ReactNode
  children: React.ReactNode
  className?: string
  maxHeight?: string
  isScrollable?: boolean
}

export const BreakdownList: React.FC<BreakdownListProps> = ({
  title = 'Bag Breakdown',
  count,
  totalGross,
  headerRightExtra,
  children,
  className = '',
  maxHeight = 'max-h-[380px]',
  isScrollable = true,
}) => {
  return (
    <div
      className={`border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col ${className}`}
    >
      {/* Unified Breakdown Header (sticky so count & gross stay pinned while scrolling) */}
      <div className="sticky top-0 z-10 px-4 py-2 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
        <span>
          {title} ({count} {count === 1 ? 'item' : 'items'})
        </span>
        <div className="flex items-center gap-2">
          {totalGross !== undefined && (
            <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">
              Gross: {fmtKg(totalGross)}
            </span>
          )}
          {headerRightExtra}
        </div>
      </div>

      {/* Items Container with Dividers and Smooth Scrolling */}
      <div
        className={`divide-y divide-slate-100 dark:divide-slate-800 ${
          isScrollable && maxHeight
            ? `${maxHeight} overflow-y-auto overscroll-contain pr-1 scrollbar-thin`
            : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default BreakdownList

