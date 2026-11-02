import { fmtDate } from '@/utils/date'
import { fmtMoney } from '@/utils/format'
import { Receipt, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { standardizeCategory, getCategoryBadge, cleanEmojiAndMode } from '@/features/expenses/constants'
import type { Expense } from '@/features/expenses/types'

export interface ExpenseTableProps {
  paginatedExpenses: Expense[]
  displayExpensesCount: number
  displayTotal: number
  currentPage: number
  totalPages: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  onEdit: (x: Expense) => void
  onViewReceipt: (x: Expense) => void
  onDelete: (x: Expense) => void
}

export function ExpenseTable({
  paginatedExpenses,
  displayExpensesCount,
  displayTotal,
  currentPage,
  totalPages,
  setCurrentPage,
  onEdit,
  onViewReceipt,
  onDelete,
}: ExpenseTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* ── Compact Horizontal-Scrollable Table (Matches Inward & Outward) ── */}
      <div
        className="w-full overflow-x-auto scrollbar-thin overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        tabIndex={0}
        role="region"
        aria-label="Operating Expenses Table"
      >
        <table className="w-full min-w-[440px] md:min-w-[540px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
            <tr className="border-b border-slate-200/80 dark:border-slate-800">
              <th className="sticky left-0 top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 border-r border-slate-200/80 dark:border-slate-800 px-3 py-2.5 w-20 min-w-[75px] md:w-28 md:min-w-[100px] text-left whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] md:shadow-none">
                DATE
              </th>
              <th className="px-3 py-2.5 w-24 md:w-32 text-left bg-slate-50/80 dark:bg-slate-900/90">
                CATEGORY
              </th>
              <th className="px-3 py-2.5 min-w-[130px] md:min-w-[180px] text-left bg-slate-50/80 dark:bg-slate-900/90">
                DESCRIPTION / NOTE
              </th>
              <th className="px-3 py-2.5 pr-3 md:pr-4 w-20 md:w-28 text-right bg-slate-50/80 dark:bg-slate-900/90">
                AMOUNT
              </th>
              <th className="hidden md:table-cell w-20 min-w-[72px] text-center px-3 py-2.5 bg-slate-50/80 dark:bg-slate-900/90 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedExpenses.map((x) => {
              const head = standardizeCategory(x.category, x.note)
              const badge = getCategoryBadge(head)
              const cleanNote = cleanEmojiAndMode(x.note || x.category)
              const cleanCat = cleanEmojiAndMode(x.category)

              return (
                <tr
                  key={x.id}
                  onClick={() => onEdit(x)}
                  className="border-b border-slate-100 dark:border-slate-800/60 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/50 cursor-pointer transition-colors group/row"
                >
                  {/* 1. Date (Sticky/Bordered Left Cell) */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-800 border-r border-slate-100 dark:border-slate-800/80 py-2 md:py-2.5 px-3 w-20 min-w-[75px] md:w-28 md:min-w-[100px] text-[11px] md:text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] md:shadow-none transition-colors leading-none">
                    {fmtDate(x.date)}
                  </td>

                  {/* 2. Category */}
                  <td className="py-2 md:py-2.5 px-3 w-24 md:w-32 text-xs whitespace-nowrap align-middle leading-none">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium leading-none border ${badge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotClass}`} />
                      <span className="truncate leading-none">{head}</span>
                    </span>
                  </td>

                  {/* 3. Description / Note */}
                  <td className="py-2 md:py-2.5 px-3 min-w-[130px] md:min-w-[180px] text-xs font-medium align-middle leading-tight">
                    <div className="flex flex-col justify-center">
                      <span
                        className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[130px] md:max-w-xs block leading-tight"
                        title={cleanNote || cleanCat}
                      >
                        {cleanNote || cleanCat || 'General Expense'}
                      </span>
                      {cleanCat && cleanCat !== cleanNote && cleanCat !== 'Other' && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5 block truncate max-w-[130px] md:max-w-xs">
                          {cleanCat}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Amount */}
                  <td className="py-2 md:py-2.5 px-3 pr-3 md:pr-4 w-20 md:w-28 text-right whitespace-nowrap align-middle leading-none">
                    <span className="text-xs md:text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 leading-none">
                      {fmtMoney(x.amount)}
                    </span>
                  </td>

                  {/* 5. Desktop Actions */}
                  <td className="hidden md:table-cell w-20 min-w-[72px] text-center px-3 py-2 md:py-2.5 whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(x)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="View Expense Voucher"
                        aria-label="View Expense Voucher"
                      >
                        <Receipt className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(x)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors cursor-pointer"
                        title="Edit Expense"
                        aria-label="Edit Expense"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(x)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Delete Expense"
                        aria-label="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Summary Footer Strip Directly Below Last Table Row ── */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 py-2.5 select-none">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-xs">Total Expenses:</span>
            <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {fmtMoney(displayTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Standard Pagination Controls Row ── */}
      <div className="flex items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 select-none">
        <div>
          <span>
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{displayExpensesCount}</strong> {displayExpensesCount === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
              <span className="sm:hidden">{currentPage} / {totalPages}</span>
              <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
