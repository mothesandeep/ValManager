import { LifeBuoy, History, RotateCcw, Download } from 'lucide-react'
import type { AutoSnapshotSummary } from '@/features/settings/utils'

interface OopsSnapshotSectionProps {
  latestSnapshot: AutoSnapshotSummary | null
  isTakingSnapshot: boolean
  isOopsRestoring: boolean
  onTakeSnapshot: () => void
  onOpenRestoreModal: () => void
  onDownloadSnapshot: () => void
}

export function OopsSnapshotSection({
  latestSnapshot,
  isTakingSnapshot,
  isOopsRestoring,
  onTakeSnapshot,
  onOpenRestoreModal,
  onDownloadSnapshot,
}: OopsSnapshotSectionProps) {
  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-950/20 dark:to-transparent rounded-2xl border border-amber-300/80 dark:border-amber-700/80 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <LifeBuoy size={22} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                The &quot;Oops&quot; Button: Automated Daily Safety Snapshots
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Zero Data Loss Safeguard
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Automated rolling daily snapshots protect against accidental deletions, update bugs, or bad edits. If anything goes wrong, restore your safe state with one click.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onTakeSnapshot}
          disabled={isTakingSnapshot}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          <History size={14} className={isTakingSnapshot ? 'animate-spin' : ''} />
          <span>{isTakingSnapshot ? 'Saving Snapshot…' : 'Take Safety Snapshot Now'}</span>
        </button>
      </div>

      {/* Snapshot Status Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200/90 dark:border-amber-800/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {latestSnapshot
                ? `Latest Auto-Snapshot: ${new Date(latestSnapshot.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(latestSnapshot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No local safety snapshot recorded yet today'}
            </span>
          </div>
          {latestSnapshot && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Contains: <strong className="text-slate-800 dark:text-slate-200">{latestSnapshot.counts.parties}</strong> Parties •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{latestSnapshot.counts.receipts}</strong> Inward Receipts •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{latestSnapshot.counts.dispatches}</strong> Dispatches •{' '}
              <strong className="text-slate-800 dark:text-slate-200">{latestSnapshot.counts.expenses}</strong> Expenses
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenRestoreModal}
            disabled={!latestSnapshot || isOopsRestoring}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span>Oops! Undo to Safe Snapshot</span>
          </button>

          {latestSnapshot && (
            <button
              type="button"
              onClick={onDownloadSnapshot}
              title="Download JSON snapshot to disk"
              className="p-2 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

