import { fmtMoney } from '@/utils/format'
import { EXPENSE_CATEGORIES, getCategoryBadge } from '@/features/expenses/constants'

export interface MoMBreakdownData {
  months: string[]
  matrix: Record<string, Record<string, number>>
  monthlyTotals: Record<string, number>
}

export interface MoMTableMatrixProps {
  momData: MoMBreakdownData
  formatMoMMonthHeader: (ym: string) => string
}

export function MoMTableMatrix({
  momData,
  formatMoMMonthHeader,
}: MoMTableMatrixProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse min-w-[560px]">
        <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 select-none">
          <tr className="border-b border-slate-200/80 dark:border-slate-800">
            {/* Column 1 (Sticky Left Column): COST CENTER */}
            <th className="w-44 min-w-[150px] pl-4 py-2.5 sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              COST CENTER
            </th>
            {/* Historical Month Columns */}
            {momData.months.map((m) => (
              <th
                key={m}
                className="w-24 min-w-[95px] text-right px-3 py-2.5 font-mono tabular-nums text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-900"
              >
                {formatMoMMonthHeader(m)}
              </th>
            ))}
            {/* Total Column: TOTAL */}
            <th className="w-24 min-w-[95px] text-right pr-4 py-2.5 font-mono font-semibold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap bg-slate-100 dark:bg-slate-800">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {EXPENSE_CATEGORIES.map((cat, idx) => {
            const badge = getCategoryBadge(cat)
            const Icon = badge.Icon
            const totalCat = momData.months.reduce(
              (sum, m) => sum + (momData.matrix[cat]?.[m] || 0),
              0
            )

            return (
              <tr
                key={cat}
                className={`group border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                  idx % 2 === 1 ? 'bg-slate-50/25 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'
                }`}
              >
                {/* Column 1 (Sticky Left Column): COST CENTER */}
                <td className="w-44 min-w-[150px] pl-4 py-2 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap transition-colors font-medium">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.badgeClass}`}
                  >
                    <Icon size={11} className="shrink-0" />
                    <span className="font-semibold">{cat}</span>
                  </span>
                </td>

                {/* Historical Month Columns */}
                {momData.months.map((m) => {
                  const val = momData.matrix[cat]?.[m] || 0
                  return (
                    <td
                      key={m}
                      className="w-24 min-w-[95px] text-right px-3 py-2 font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap"
                    >
                      {val > 0 ? (
                        fmtMoney(val)
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 select-none">—</span>
                      )}
                    </td>
                  )
                })}

                {/* Total Column */}
                <td className="w-24 min-w-[95px] text-right px-3 py-2 pr-4 font-mono font-semibold text-xs text-slate-900 dark:text-white whitespace-nowrap bg-slate-50/40 dark:bg-slate-800/30">
                  {fmtMoney(totalCat)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-950 dark:bg-slate-800 text-white font-mono text-xs border-t-2 border-slate-900 dark:border-slate-700">
            <td className="w-44 min-w-[150px] sticky left-0 bg-slate-950 dark:bg-slate-800 z-10 pl-4 py-2.5 font-bold tracking-wider uppercase text-[11px] text-white border-r border-slate-800 dark:border-slate-700 whitespace-nowrap">
              MONTHLY TOTAL
            </td>
            {momData.months.map((m) => (
              <td
                key={m}
                className="w-24 min-w-[95px] text-right px-3 py-2.5 font-mono tabular-nums text-xs font-bold text-white whitespace-nowrap"
              >
                {fmtMoney(momData.monthlyTotals[m] || 0)}
              </td>
            ))}
            <td className="w-24 min-w-[95px] text-right px-3 py-2.5 pr-4 font-mono tabular-nums text-xs font-bold text-emerald-400 whitespace-nowrap bg-slate-950 dark:bg-slate-800/90">
              {fmtMoney(
                momData.months.reduce((sum, m) => sum + (momData.monthlyTotals[m] || 0), 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
