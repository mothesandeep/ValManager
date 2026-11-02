import { CheckCircle2, Loader2 } from 'lucide-react'

export interface ScannerActionFooterProps {
  onClose: () => void
  onSave: (e?: any) => void | Promise<void>
  isSaving: boolean
  isSaveDisabled: boolean
  saveLabel?: string
  cancelLabel?: string
}

export function ScannerActionFooter({
  onClose,
  onSave,
  isSaving,
  isSaveDisabled,
  saveLabel = 'Confirm & Save Entry',
  cancelLabel = 'Cancel',
}: ScannerActionFooterProps) {
  return (
    <footer className="sticky bottom-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="h-12 px-5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaveDisabled}
        className="flex-1 h-12 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white dark:text-slate-900 shrink-0" />
            <span>Saving Entry...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} strokeWidth={2.4} className="shrink-0" />
            <span>{saveLabel}</span>
          </>
        )}
      </button>
    </footer>
  )
}
