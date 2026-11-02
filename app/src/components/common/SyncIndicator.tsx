import { RefreshCw } from 'lucide-react'
import { useSync } from '@/context/SyncContext'

export interface SyncIndicatorProps {
  compact?: boolean
  className?: string
}

export function SyncIndicator({ compact = false, className = '' }: SyncIndicatorProps) {
  const { isOnline, isSyncing, syncError, lastSyncTime, pendingCount, triggerSync } = useSync()

  if (!isOnline) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 font-semibold tracking-wide shrink-0 shadow-2xs select-none ${
          compact ? 'h-8 px-2.5 text-[11px]' : 'px-2.5 py-1 text-[11px]'
        } ${className}`}
        title="Offline — changes are saved locally and will sync when reconnected"
      >
        <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 font-semibold tracking-wide shrink-0 shadow-2xs select-none ${
          compact ? 'h-8 px-2.5 text-[11px]' : 'px-2.5 py-1 text-[11px]'
        } ${className}`}
      >
        <RefreshCw size={11} strokeWidth={2.5} className="animate-spin text-sky-500 shrink-0" />
        <span>{compact ? 'Sync' : 'Syncing...'}</span>
      </div>
    )
  }

  if (syncError && pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void triggerSync()}
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 font-semibold tracking-wide shrink-0 shadow-2xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer ${
          compact ? 'h-8 px-2.5 text-[11px]' : 'px-2.5 py-1 text-[11px]'
        } ${className}`}
        title={`Sync error: ${syncError}. Click to retry.`}
      >
        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>{compact ? `${pendingCount}!` : `${pendingCount} pending (Retry)`}</span>
      </button>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void triggerSync()}
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 font-semibold tracking-wide shrink-0 shadow-2xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer ${
          compact ? 'h-8 px-2.5 text-[11px] font-semibold' : 'px-2.5 py-1 text-[11px]'
        } ${className}`}
        title={`${pendingCount} mutations queued. Click to sync now.`}
      >
        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>{compact ? `${pendingCount}` : `${pendingCount} pending`}</span>
      </button>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0 shadow-2xs select-none ${
        compact
          ? 'h-8 px-2.5 text-[11px] font-semibold'
          : 'px-3 py-1.5 h-[36px] text-[10.5px] font-bold tracking-wide'
      } ${className}`}
      title={lastSyncTime ? `All data synced & secured (Last synced at ${lastSyncTime.toLocaleTimeString()})` : 'All data synced & secured'}
    >
      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      <span>Synced</span>
    </div>
  )
}

export default SyncIndicator

