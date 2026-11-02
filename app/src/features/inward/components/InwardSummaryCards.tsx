import { fmtKg } from '@/utils/format'

export interface InwardSummaryCardsProps {
  totalGross?: number
  totalNet?: number
  totalBags?: number
  totalRola?: number
  monthGross?: number
  monthNet?: number
  monthRolaCount?: number
  monthRolaWeight?: number
  formattedMonth?: string
  selectedPartyName?: string
  loading?: boolean
}

export function InwardSummaryCards(props: InwardSummaryCardsProps) {
  const totalGross = props.totalGross ?? props.monthGross ?? 0
  const totalNet = props.totalNet ?? props.monthNet ?? 0
  const totalBags = props.totalBags ?? props.monthRolaCount ?? 0
  const totalRola = props.totalRola ?? props.monthRolaWeight ?? 0
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Gross Wt</span>
        <div className="text-lg font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100 mt-1">
          {fmtKg(totalGross)}
        </div>
      </div>
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Net Kasab</span>
        <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
          {fmtKg(totalNet)}
        </div>
      </div>
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Bags</span>
        <div className="text-lg font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100 mt-1">
          {totalBags}
        </div>
      </div>
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Rola Count</span>
        <div className="text-lg font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100 mt-1">
          {totalRola}
        </div>
      </div>
    </div>
  )
}

export default InwardSummaryCards
