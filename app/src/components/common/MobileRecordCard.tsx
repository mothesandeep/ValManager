import { Printer, Share2, Pencil, Trash2 } from 'lucide-react'
import { SwipeableRow } from './SwipeableRow'
import { fmtDate } from '../../utils/date'
import { fmtMoney } from '../../utils/format'

export interface CardPill {
  label: string
  sub?: string
  variant?: 'slate' | 'emerald' | 'sky' | 'amber' | 'rose' | 'blue'
}

export interface MobileRecordCardProps {
  partyName: string
  partySubtitle?: string
  challanNo?: string | number | null
  date: string
  pills: CardPill[]
  amount?: number | null
  amountPrefix?: string
  amountLabel?: string
  amountColorClass?: string
  statusBadge?: {
    label: string
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral'
  }
  onClick?: () => void
  onPrint?: () => void
  onShare?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MobileRecordCard({
  partyName,
  partySubtitle,
  challanNo,
  date,
  pills,
  amount,
  amountLabel = 'Total Amount',
  amountColorClass = 'text-emerald-700',
  statusBadge,
  onClick,
  onPrint,
  onShare,
  onEdit,
  onDelete,
}: MobileRecordCardProps) {
  const getPillClasses = (pill: CardPill) => {
    const isNet = pill.label.toLowerCase().includes('net') || pill.sub?.toLowerCase().includes('net')
    if (isNet) {
      return 'font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 text-[11px] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 tabular-nums'
    }
    switch (pill.variant) {
      case 'amber':
        return 'bg-[#FFFBEB] text-[#B45309] dark:bg-amber-950/40 dark:text-amber-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-[#FDE68A] dark:border-amber-800/60 tabular-nums'
      case 'sky':
      case 'blue':
        return 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-[#93C5FD] dark:border-blue-800/60 tabular-nums'
      case 'emerald':
        return 'bg-[#F0FDF4] text-[#15803D] dark:bg-emerald-950/40 dark:text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-[#BBF7D0] dark:border-emerald-800/60 tabular-nums'
      case 'rose':
        return 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-950/40 dark:text-red-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-[#FECACA] dark:border-red-800/60 tabular-nums'
      case 'slate':
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-slate-200 dark:border-slate-700 tabular-nums'
    }
  }

  const getStatusBadgeClasses = (variant: string = 'neutral') => {
    switch (variant) {
      case 'success':
        return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
      case 'warning':
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
      case 'info':
        return 'bg-[#EFF6FF] text-[#2563EB] border-[#93C5FD] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
      case 'danger':
        return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60'
      case 'neutral':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  const cardContent = (
    <div
      onClick={onDelete ? undefined : onClick}
      className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-2.5 w-full select-none transition-all active:bg-slate-50/70 dark:active:bg-slate-800/70 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* ── Row 1 (Header): Party Name (65% truncate) + Challan Badge + Date (pinned right) ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[65%]">
            {partyName}
          </span>
          {challanNo ? (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded font-mono font-semibold shrink-0">
              #{String(challanNo).replace(/^#/, '')}
            </span>
          ) : null}
          {statusBadge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${getStatusBadgeClasses(
                statusBadge.variant
              )}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>

        {/* Date pinned to right */}
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0 ml-auto">
          {fmtDate(date)}
        </span>
      </div>

      {partySubtitle && (
        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
          {partySubtitle}
        </p>
      )}

      {/* ── Row 2 (Specs & Weights): Inline horizontal badge row ── */}
      {pills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap my-2">
          {pills.map((pill, idx) => (
            <div
              key={idx}
              className={`inline-flex items-center gap-1 ${getPillClasses(pill)}`}
            >
              <span>{pill.label}</span>
              {pill.sub && (
                <span className="text-[10px] opacity-75 font-normal">
                  ({pill.sub})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Row 3 (Bottom Line & Touch Actions): Amount + Generous 44x44px touch targets ── */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/90">
        <div className="min-w-0">
          {amount !== undefined && amount !== null && (
            <div>
              {amountLabel && (
                <span className="text-[9.5px] font-semibold text-slate-400 block uppercase tracking-wider leading-none mb-0.5">
                  {amountLabel}
                </span>
              )}
              <span className={`font-mono font-bold text-sm text-emerald-600 tabular-nums ${amountColorClass}`}>
                {fmtMoney(amount)}
              </span>
            </div>
          )}
        </div>

        {/* 44x44px Touch Target Action Buttons */}
        <div
          className="flex items-center gap-0.5 shrink-0 -mr-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer"
              title="Share document"
              aria-label="Share document"
            >
              <Share2 size={16} strokeWidth={2.2} />
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer"
              title="Print document"
              aria-label="Print document"
            >
              <Printer size={16} strokeWidth={2.2} />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer"
              title="Edit entry"
              aria-label="Edit entry"
            >
              <Pencil size={16} strokeWidth={2.2} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-500 hover:text-rose-700 active:bg-rose-50 transition-colors cursor-pointer"
              title="Delete entry"
              aria-label="Delete entry"
            >
              <Trash2 size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (onDelete) {
    return (
      <SwipeableRow onDelete={onDelete} onClick={onClick}>
        {cardContent}
      </SwipeableRow>
    )
  }

  return cardContent
}
