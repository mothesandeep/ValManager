import { fmtMoney } from '@/utils/format'

export interface NetMarginCardProps {
  revenue: number
  expenses: number
  netMargin: number
}

export function NetMarginCard({
  revenue,
  expenses,
  netMargin,
}: NetMarginCardProps) {
  const isPositive = netMargin >= 0

  return (
    <div className="rounded-2xl bg-slate-950 dark:bg-slate-900 border border-slate-800/80 p-4 shadow-md text-white mt-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Estimated Net Margin
        </span>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            isPositive
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
          }`}
        >
          {isPositive ? 'Profitable' : 'Deficit'}
        </span>
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight">
        {fmtMoney(netMargin)}
      </div>
      <div className="text-[11px] text-slate-400 font-mono mt-2">
        {fmtMoney(revenue)} (Revenue) - {fmtMoney(expenses)} (Expenses) = {fmtMoney(netMargin)} Net Yield
      </div>
    </div>
  )
}

export default NetMarginCard
