import { DangerZone } from '@/components/feedback/DangerZone'
import type { BagCalculation } from '@/features/outward/components/DispatchEntriesList'

interface OutwardSettlementSummaryProps {
  dispatchType: 'Val' | 'Rola'
  currentBagsCount: number
  totalGross: number
  totalTare: number
  totalNetVal: number
  currentBagCalculations: Array<BagCalculation & { rolaCount?: number }>
  manualTotalAmount: string | null
  setManualTotalAmount: (val: string | null) => void
  autoCalculatedAmount: number
  notes: string
  setNotes: (val: string) => void
  editingId: string | null
  challanNo: string
  partyName: string
  isSaving: boolean
  onDeleteChallan: () => Promise<void>
}

export function OutwardSettlementSummary({
  dispatchType,
  currentBagsCount,
  totalGross,
  totalTare,
  totalNetVal,
  currentBagCalculations,
  manualTotalAmount,
  setManualTotalAmount,
  autoCalculatedAmount,
  notes,
  setNotes,
  editingId,
  challanNo,
  partyName,
  isSaving,
  onDeleteChallan,
}: OutwardSettlementSummaryProps) {
  return (
    <div className="space-y-3">
      {/* Settlement Breakdown Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            SETTLEMENT BREAKDOWN
          </span>
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {currentBagsCount} {currentBagsCount === 1 ? 'BAG' : 'BAGS'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {dispatchType === 'Val' ? (
            <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Gross Weight</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {totalGross.toFixed(3)} kg
                </span>
              </div>

              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Total Tare Deduction</span>
                <span className="font-semibold font-mono">
                  -{totalTare.toFixed(3)} kg
                </span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800 pt-2 text-xs">
                <span>Total Net Val</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {totalNetVal.toFixed(3)} kg
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Rola Weight</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {totalGross.toFixed(3)} kg
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Rola Count</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {currentBagCalculations.reduce((sum, b) => sum + (Number(b.rolaCount ?? b.bag.rolaCount) || 0), 0)} pcs
                </span>
              </div>
            </>
          )}

          {dispatchType === 'Val' && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Grand Total Amount
                </label>
                {manualTotalAmount !== null && (
                  <button
                    type="button"
                    onClick={() => setManualTotalAmount(null)}
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset to Auto (₹{autoCalculatedAmount.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder={String(autoCalculatedAmount)}
                  value={
                    manualTotalAmount !== null
                      ? manualTotalAmount
                      : autoCalculatedAmount > 0
                        ? String(autoCalculatedAmount)
                        : ''
                  }
                  onChange={(e) => setManualTotalAmount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Auto-calculated: sum of Net kg × Rate
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes / Remarks */}
      <div className="mt-3">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
          NOTES / REMARKS (OPTIONAL)
        </label>
        <input
          type="text"
          placeholder="Additional notes or specifications..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
        />
      </div>

      {/* Danger Zone for Editing Mode */}
      {editingId && (
        <DangerZone
          title="Danger Zone"
          description="Permanently delete this saved outward dispatch challan and all associated bags from active records. It can be restored from the Trash Bin."
          itemName={
            challanNo && challanNo !== '—'
              ? `Dispatch #${String(challanNo).replace(/^#/, '')} (${partyName || 'Party'})`
              : `Outward Dispatch (${partyName || 'Party'})`
          }
          buttonLabel="Delete Challan"
          isDeleting={isSaving}
          onDelete={onDeleteChallan}
        />
      )}
    </div>
  )
}
