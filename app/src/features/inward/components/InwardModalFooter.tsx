import React from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { fmtKg } from '@/utils/format'

interface InwardModalFooterProps {
  onClose: () => void
  onSubmit: () => Promise<void>
  saving: boolean
  partyId: string
  challanNo: string
  totalGrossWeight: number
  editingId: string | null
  finalNetKasab: number
  bagsCount: number
}

export function InwardModalFooter({
  onClose,
  onSubmit,
  saving,
  partyId,
  challanNo,
  totalGrossWeight,
  editingId,
  finalNetKasab,
  bagsCount,
}: InwardModalFooterProps) {
  return (
    <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="h-12 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        Cancel
      </button>
      <button
        type="button"
        data-save-shortcut="true"
        onClick={onSubmit}
        disabled={saving || !partyId || !challanNo.trim() || totalGrossWeight <= 0}
        className="flex-1 h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={18} className="animate-spin shrink-0" />
            <span>Saving Inward Receipt...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} className="shrink-0" />
            <span>
              {editingId
                ? `Save Changes • ${fmtKg(finalNetKasab)} (${bagsCount} Bag${bagsCount !== 1 ? 's' : ''})`
                : `Save Receipt • ${fmtKg(finalNetKasab)} (${bagsCount} Bag${bagsCount !== 1 ? 's' : ''})`}
            </span>
          </>
        )}
      </button>
    </div>
  )
}

