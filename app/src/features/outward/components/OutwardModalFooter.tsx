import { CheckCircle2, Loader2 } from 'lucide-react'
import { fmtKg } from '@/utils/format'

interface OutwardModalFooterProps {
  onClose: () => void
  onSubmit: () => Promise<void>
  saving: boolean
  hasParty: boolean
  hasChallanNo: boolean
  hasValidBags: boolean
  editingId: string | null
  dispatchType: 'Val' | 'Rola'
  totalNetVal: number
  totalGross: number
  currentBagsCount: number
  grandTotalAmount: number
}

export function OutwardModalFooter({
  onClose,
  onSubmit,
  saving,
  hasParty,
  hasChallanNo,
  hasValidBags,
  editingId,
  dispatchType,
  totalNetVal,
  totalGross,
  currentBagsCount,
  grandTotalAmount,
}: OutwardModalFooterProps) {
  const saveLabel = editingId
    ? `Save Changes • ${fmtKg(dispatchType === 'Val' ? totalNetVal : totalGross)} (${currentBagsCount} Bag${currentBagsCount !== 1 ? 's' : ''})`
    : dispatchType === 'Val'
      ? `Save Dispatch • ${fmtKg(totalNetVal)} (₹${Math.round(grandTotalAmount).toLocaleString('en-IN')})`
      : `Save Dispatch • ${fmtKg(totalGross)} (${currentBagsCount} Bag${currentBagsCount !== 1 ? 's' : ''})`

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
        disabled={saving || !hasParty || !hasChallanNo || !hasValidBags}
        className="flex-1 h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={18} className="animate-spin shrink-0" />
            <span>Saving Outward Entry...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{saveLabel}</span>
          </>
        )}
      </button>
    </div>
  )
}

