import { Receipt, Pencil, Trash2 } from 'lucide-react'
import { fmtDate } from '@/utils/date'
import { fmtMoney } from '@/utils/format'
import { getPartyInitials } from '@/features/parties/utils'
import type { PaymentWithParty } from '@/features/billing/types'

export interface BillingTableProps {
  filteredPaymentsList: PaymentWithParty[]
  totalReceivedFiltered: number
  animatingDeleteId: string | null
  detectPaymentMode: (note?: string | null) => { mode: string; style: string }
  onViewReceipt: (p: PaymentWithParty) => void
  onEdit: (p: PaymentWithParty) => void
  onDelete: (p: PaymentWithParty) => void
}

export function BillingTable({
  filteredPaymentsList,
  totalReceivedFiltered,
  animatingDeleteId,
  detectPaymentMode,
  onViewReceipt,
  onEdit,
  onDelete,
}: BillingTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs mt-3">
      {/* ── Compact Horizontal-Scrollable Data Table (min-w-[580px]) ── */}
      <div
        className="w-full overflow-x-auto no-scrollbar scrollbar-hide overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        tabIndex={0}
        role="region"
        aria-label="Payments Table"
      >
        <table className="w-full min-w-[580px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
            <tr>
              <th className="w-28 px-2 md:px-3.5 py-1.5 md:py-2.5 text-left bg-slate-50 dark:bg-slate-900">DATE</th>
              <th className="min-w-[150px] px-2 md:px-3.5 py-1.5 md:py-2.5 text-left bg-slate-50 dark:bg-slate-900">PARTY NAME</th>
              <th className="w-28 px-2 md:px-3.5 py-1.5 md:py-2.5 text-center bg-slate-50 dark:bg-slate-900">MODE / REF</th>
              <th className="w-28 pr-4 md:pr-3.5 px-2 md:px-3.5 py-1.5 md:py-2.5 text-right bg-slate-50 dark:bg-slate-900">AMOUNT</th>
              <th className="w-24 text-right pr-4 md:pr-3.5 py-1.5 md:py-2.5 pl-2 bg-slate-50 dark:bg-slate-900">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredPaymentsList.map((p) => {
              const modeInfo = detectPaymentMode(p.note)
              const initials = getPartyInitials(p.party?.name)
              const isRowDeleting = animatingDeleteId === p.id

              return (
                <tr
                  key={p.id}
                  onClick={() => onViewReceipt(p)}
                  className={`border-b border-slate-100 dark:border-slate-800/60 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/50 cursor-pointer transition-colors group/row ${
                    isRowDeleting
                      ? 'opacity-0 -translate-x-4 scale-y-95 bg-rose-50/60 pointer-events-none'
                      : ''
                  }`}
                >
                  {/* 1. Date */}
                  <td className="w-28 px-2 md:px-3.5 py-1.5 md:py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                    {fmtDate(p.date)}
                  </td>

                  {/* 2. Party Name */}
                  <td className="min-w-[150px] px-2 md:px-3.5 py-1.5 md:py-2.5 text-left whitespace-nowrap align-middle">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        {initials}
                      </span>
                      <span
                        className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]"
                        title={p.party?.name}
                      >
                        {p.party?.name || 'Unknown Party'}
                      </span>
                    </div>
                  </td>

                  {/* 3. Mode / Ref */}
                  <td className="w-28 px-2 md:px-3.5 py-1.5 md:py-2.5 text-center whitespace-nowrap align-middle">
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-medium leading-none ${modeInfo.style}`}
                      >
                        {modeInfo.mode}
                      </span>
                      {p.note && !p.note.toLowerCase().startsWith('split') && (
                        <span
                          className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5 max-w-[120px] truncate block"
                          title={p.note}
                        >
                          {p.note}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Amount */}
                  <td className="w-28 pr-4 md:pr-3.5 px-2 md:px-3.5 py-1.5 md:py-2.5 text-right whitespace-nowrap align-middle">
                    <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{fmtMoney(p.amount)}
                    </span>
                  </td>

                  {/* 5. Actions */}
                  <td
                    className="w-24 text-right pr-4 md:pr-3.5 py-1.5 md:py-2.5 pl-2 whitespace-nowrap align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(p)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="View Payment Voucher"
                        aria-label="View Payment Voucher"
                      >
                        <Receipt size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                        title="Edit Payment"
                        aria-label="Edit Payment"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        title="Delete Payment"
                        aria-label="Delete Payment"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Summary Footer Bar (Matches Inward & Outward Layout) ── */}
      <div className="bg-slate-50/50 dark:bg-slate-800/30 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
        <div>
          <span>
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{filteredPaymentsList.length}</strong> {filteredPaymentsList.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div>
          <span>
            Total Received:{' '}
            <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {fmtMoney(totalReceivedFiltered)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
