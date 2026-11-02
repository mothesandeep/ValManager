import { AlertCircle } from 'lucide-react'
import { ScannedBagsReviewList, type InwardBagCalculation } from '@/features/inward/components/scanner/ScannedBagsReviewList'
import type { InwardReviewBag } from '@/features/inward/sheets/InwardScannerSheet'

export interface ItemizedBagTableProps {
  inwardBagCalculations: InwardBagCalculation[]
  inwardBagsCount: number
  inwardTotals: {
    count: number
    totalGross: number
    totalTare: number
    totalNet: number
    totalRola: number
    calculatedTotalTare: number
  }
  tareOverride: string
  setTareOverride: (val: string) => void
  onUpdateBag: (id: string, field: keyof InwardReviewBag, value: string) => void
  onRemoveBag: (id: string) => void
  onAddBag: () => void
  onSizeTypeChange: (id: string, sizeType: 'Norm' | 'Big') => void
}

export function ItemizedBagTable({
  inwardBagCalculations,
  inwardBagsCount,
  inwardTotals,
  tareOverride,
  setTareOverride,
  onUpdateBag,
  onRemoveBag,
  onAddBag,
  onSizeTypeChange,
}: ItemizedBagTableProps) {
  return (
    <div className="w-full space-y-3 pt-1">
      <ScannedBagsReviewList
        inwardBagCalculations={inwardBagCalculations}
        totalBagsCount={inwardBagsCount}
        onUpdateBag={onUpdateBag}
        onRemoveBag={onRemoveBag}
        onAddBag={onAddBag}
        onSizeTypeChange={onSizeTypeChange}
      />

      {/* Inward Live Calculations Summary Card */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Inward Summary
          </span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {inwardTotals.count} {inwardTotals.count === 1 ? 'Bag' : 'Bags'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Gross
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {inwardTotals.totalGross.toFixed(3)} kg
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider block">
              Total Tare
            </span>
            <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              -{inwardTotals.totalTare.toFixed(3)} kg
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Net Kasab
            </span>
            <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
              {inwardTotals.totalNet.toFixed(3)} kg
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Rola
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {inwardTotals.totalRola} pcs
            </span>
          </div>
        </div>

        {/* Optional Total Slip Tare Override */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Total Slip Tare Override</span>
              {tareOverride.trim() !== '' && (
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                  Lump-Sum Active
                </span>
              )}
            </label>
            {tareOverride.trim() !== '' && (
              <button
                type="button"
                onClick={() => setTareOverride('')}
                className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Reset to per-bag ({inwardTotals.calculatedTotalTare.toFixed(3)} kg)
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-rose-500">
              -
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={tareOverride}
              onChange={(e) => setTareOverride(e.target.value)}
              placeholder={`Enter slip lump-sum deduction (default: ${inwardTotals.calculatedTotalTare.toFixed(3)})`}
              className="w-full h-9 pl-7 pr-3 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
          {inwardTotals.totalGross > 0 && inwardTotals.totalTare >= inwardTotals.totalGross && (
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
              <AlertCircle size={13} className="shrink-0" />
              <span>
                Gross weight ({inwardTotals.totalGross.toFixed(3)} kg) must strictly exceed Tare deduction ({inwardTotals.totalTare.toFixed(3)} kg).
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
export default ItemizedBagTable

