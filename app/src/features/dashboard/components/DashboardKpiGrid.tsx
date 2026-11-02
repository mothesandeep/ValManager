import { PackagePlus, Truck, Users } from 'lucide-react'
import { fmtKg, fmtMoney } from '@/utils/format'

export interface DashboardKpiGridProps {
  monthReceivedNet: number
  monthDispatchNet: number
  rolaPending: number
  totalDue: number
}

export function DashboardKpiGrid({
  monthReceivedNet,
  monthDispatchNet,
  rolaPending,
  totalDue,
}: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Kasab Inward */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Kasab Inward</span>
          <div className="size-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <PackagePlus size={15} />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
          {fmtKg(monthReceivedNet)}
        </div>
      </div>

      {/* Val Dispatch */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Val Dispatch</span>
          <div className="size-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Truck size={15} />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
          {fmtKg(monthDispatchNet)}
        </div>
      </div>

      {/* Pending Kasab */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Pending Rola</span>
          <div className="size-7 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Users size={15} />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
          {rolaPending} <span className="text-xs font-medium text-slate-400">pcs</span>
        </div>
      </div>

      {/* Total Due */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Due</span>
          <div className="size-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <span className="text-xs font-black">₹</span>
          </div>
        </div>
        <div className="mt-2 text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
          {fmtMoney(totalDue)}
        </div>
      </div>
    </div>
  )
}

export default DashboardKpiGrid
