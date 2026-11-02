import { FileCheck, ShieldAlert, Database } from 'lucide-react'

interface BackupInformationBannersProps {
  restoreStatus: string | null
}

export function BackupInformationBanners({ restoreStatus }: BackupInformationBannersProps) {
  return (
    <>
      {/* Restore Status banner */}
      {restoreStatus && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs font-medium flex items-center gap-2.5">
          <FileCheck size={16} className="text-blue-700 dark:text-blue-400 shrink-0" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {/* Best Practice Info Banner */}
      <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
            Data Security &amp; Disaster Recovery Best Practice
          </span>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            ValManager operates an offline-first IndexedDB database for instant responsiveness. We recommend downloading a JSON backup at the end of each business week to ensure zero data loss.
          </p>
        </div>
      </div>

      {/* Automated Cloud & GitHub Backups Card */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Database size={15} className="text-blue-600 dark:text-blue-400" />
            Automated Cloud &amp; GitHub Daily Backup
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            The backend runs an automated daily dump via GitHub Actions at 1:30 AM IST dumping all tables into{' '}
            <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">
              backups/
            </code>{' '}
            with 90-day retention.
          </p>
        </div>
      </div>
    </>
  )
}

