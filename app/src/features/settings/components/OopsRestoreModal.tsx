import { AlertTriangle, RotateCcw } from 'lucide-react'
import type { AutoSnapshotSummary } from '@/services/storage/autoBackupService'

interface OopsRestoreModalProps {
  isOpen: boolean
  onClose: () => void
  latestSnapshot: AutoSnapshotSummary | null
  previousSnapshot: AutoSnapshotSummary | null
  isOopsRestoring: boolean
  onConfirmRestore: (slot: 'latest' | 'previous') => void
}

export function OopsRestoreModal({
  isOpen,
  onClose,
  latestSnapshot,
  previousSnapshot,
  isOopsRestoring,
  onConfirmRestore,
}: OopsRestoreModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="oops-dialog-title"
      aria-describedby="oops-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-700 p-6 shadow-2xl max-w-md w-full space-y-4 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 id="oops-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Restore Safety Snapshot?
            </h3>
            <p id="oops-dialog-desc" className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              This will safely roll back your enterprise database to the designated safety snapshot, recovering deleted records or undoing bugs from recent updates.
            </p>
          </div>
        </div>

        {latestSnapshot && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center justify-between">
              <span>Target Snapshot:</span>
              <span className="font-mono text-[11px] text-amber-800 dark:text-amber-300">
                {new Date(latestSnapshot.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                {new Date(latestSnapshot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
              {latestSnapshot.counts.parties} Parties • {latestSnapshot.counts.receipts} Receipts •{' '}
              {latestSnapshot.counts.dispatches} Dispatches • {latestSnapshot.counts.expenses} Expenses
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={isOopsRestoring}
            className="w-full sm:w-auto h-11 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>

          {previousSnapshot && (
            <button
              type="button"
              onClick={() => onConfirmRestore('previous')}
              disabled={isOopsRestoring}
              className="w-full sm:w-auto h-11 px-3.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              {isOopsRestoring ? 'Restoring…' : "Restore Yesterday's Snapshot"}
            </button>
          )}

          <button
            type="button"
            onClick={() => onConfirmRestore('latest')}
            disabled={isOopsRestoring}
            className="w-full sm:w-auto h-11 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={14} className={isOopsRestoring ? 'animate-spin' : ''} />
            <span>{isOopsRestoring ? 'Restoring Records…' : 'Yes, Restore Latest Snapshot'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
