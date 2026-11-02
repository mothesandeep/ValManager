import React from 'react'
import { DangerZone } from '@/components/feedback/DangerZone'
import type { Party } from '@/features/parties/types'

interface InwardSettlementSummaryProps {
  totalGrossWeight: number
  finalTotalTare: number
  finalNetKasab: number
  totalRolaPcs: number
  tareOverride: string
  setTareOverride: (val: string) => void
  notes: string
  setNotes: (val: string) => void
  editingId: string | null
  challanNo: string
  party?: Party
  saving: boolean
  onDeleteChallan: () => Promise<void>
}

export function InwardSettlementSummary({
  totalGrossWeight,
  finalTotalTare,
  finalNetKasab,
  totalRolaPcs,
  tareOverride,
  setTareOverride,
  notes,
  setNotes,
  editingId,
  challanNo,
  party,
  saving,
  onDeleteChallan,
}: InwardSettlementSummaryProps) {
  return (
    <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-0 mt-3 lg:mt-0">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800 p-3.5 space-y-2 text-xs">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Total Gross</span>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {totalGrossWeight.toFixed(3)} kg
          </span>
        </div>
        <div className="flex justify-between text-rose-600 dark:text-rose-400">
          <span>Total Tare</span>
          <span className="font-mono font-semibold">-{finalTotalTare.toFixed(3)} kg</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2">
          <span>Net Kasab</span>
          <span className="font-mono text-emerald-600 text-sm">{finalNetKasab.toFixed(3)} kg</span>
        </div>
        <div className="flex justify-between text-slate-500 pt-1">
          <span>Total Rola Pcs</span>
          <span className="font-mono font-semibold">{totalRolaPcs} pcs</span>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Tare Override (kg)
        </label>
        <input
          type="text"
          placeholder="Leave blank for automatic calculation"
          value={tareOverride}
          onChange={(e) => setTareOverride(e.target.value)}
          className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-xs font-mono"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Notes / Remarks
        </label>
        <input
          type="text"
          placeholder="Optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-xs"
        />
      </div>

      {editingId && (
        <DangerZone
          title="Danger Zone"
          description="Permanently delete this saved inward receipt challan."
          itemName={`Receipt #${challanNo || '—'} (${party?.name || 'Party'})`}
          buttonLabel="Delete Challan"
          isDeleting={saving}
          onDelete={onDeleteChallan}
        />
      )}
    </div>
  )
}

