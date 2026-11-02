import { useState, useRef, useEffect } from 'react'
import { FolderArchive } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  takeAutoSnapshot,
  restoreAutoSnapshot,
  getLatestAutoSnapshot,
  getPreviousAutoSnapshot,
  downloadSnapshotAsFile,
  type AutoSnapshotSummary,
} from '@/features/settings/utils'
import { TrashBinModal } from '../sheets/TrashBinModal'
import { getTrashBinItems } from '@/services/storage/trashBinService'
import { OopsRestoreModal } from './OopsRestoreModal'
import { OopsSnapshotSection } from './OopsSnapshotSection'
import { BackupFileCards } from './BackupFileCards'
import { BackupInformationBanners } from './BackupInformationBanners'

export function DatabaseBackupActions() {
  const { showToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [latestSnapshot, setLatestSnapshot] = useState<AutoSnapshotSummary | null>(() => getLatestAutoSnapshot())
  const [previousSnapshot, setPreviousSnapshot] = useState<AutoSnapshotSummary | null>(() => getPreviousAutoSnapshot())
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false)
  const [isOopsRestoring, setIsOopsRestoring] = useState(false)
  const [showOopsModal, setShowOopsModal] = useState(false)
  const [showTrashModal, setShowTrashModal] = useState(false)
  const [trashCount, setTrashCount] = useState(() => getTrashBinItems().length)

  useEffect(() => {
    setLatestSnapshot(getLatestAutoSnapshot())
    setPreviousSnapshot(getPreviousAutoSnapshot())

    const handleDataRestored = () => {
      setLatestSnapshot(getLatestAutoSnapshot())
      setPreviousSnapshot(getPreviousAutoSnapshot())
      setTrashCount(getTrashBinItems().length)
    }

    const handleTrashUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>
      if (typeof custom.detail?.count === 'number') {
        setTrashCount(custom.detail.count)
      } else {
        setTrashCount(getTrashBinItems().length)
      }
    }

    window.addEventListener('valmanager-data-restored', handleDataRestored)
    window.addEventListener('kasab:trash-updated', handleTrashUpdated)
    return () => {
      window.removeEventListener('valmanager-data-restored', handleDataRestored)
      window.removeEventListener('kasab:trash-updated', handleTrashUpdated)
    }
  }, [])

  const handleTakeSnapshotNow = async () => {
    setIsTakingSnapshot(true)
    try {
      const snap = await takeAutoSnapshot('manual_checkpoint')
      setLatestSnapshot(snap)
      setPreviousSnapshot(getPreviousAutoSnapshot())
      showToast('Safety snapshot created successfully!')
    } catch {
      showToast('Failed to create safety snapshot')
    } finally {
      setIsTakingSnapshot(false)
    }
  }

  const handleConfirmOopsRestore = async (slot: 'latest' | 'previous' = 'latest') => {
    setIsOopsRestoring(true)
    try {
      const res = await restoreAutoSnapshot(slot)
      if (res.success) {
        showToast(res.message)
        setShowOopsModal(false)
        setTimeout(() => window.location.reload(), 1200)
      } else {
        showToast(res.message)
      }
    } catch {
      showToast('Failed to restore snapshot')
    } finally {
      setIsOopsRestoring(false)
    }
  }

  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const json = await exportDatabaseBackup()
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `valmanager_backup_${today}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Database backup downloaded successfully')
    } catch {
      showToast('Failed to generate database backup')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') return

      const confirmed = window.confirm(
        'Are you sure you want to restore this backup? This will merge local records and update system configuration.'
      )
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setIsRestoring(true)
      setRestoreStatus('Restoring database records and configuration…')
      try {
        const result = await importDatabaseBackup(content)
        if (result.success) {
          showToast(result.message)
          setRestoreStatus('Restore completed successfully! Reloading data…')
          setTimeout(() => window.location.reload(), 1500)
        } else {
          showToast(result.message)
          setRestoreStatus(`Error: ${result.message}`)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error during restore'
        showToast(`Restore error: ${msg}`)
        setRestoreStatus(`Error: ${msg}`)
      } finally {
        setIsRestoring(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-5">
      <OopsRestoreModal
        isOpen={showOopsModal}
        onClose={() => setShowOopsModal(false)}
        latestSnapshot={latestSnapshot}
        previousSnapshot={previousSnapshot}
        isOopsRestoring={isOopsRestoring}
        onConfirmRestore={handleConfirmOopsRestore}
      />

      <TrashBinModal
        isOpen={showTrashModal}
        onClose={() => {
          setShowTrashModal(false)
          setTrashCount(getTrashBinItems().length)
        }}
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Database Backup &amp; Data Portability
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated daily safety snapshots, 1-click &apos;Oops&apos; disaster recovery, and cloud database dumps
          </p>
        </div>

        <OopsSnapshotSection
          latestSnapshot={latestSnapshot}
          isTakingSnapshot={isTakingSnapshot}
          isOopsRestoring={isOopsRestoring}
          onTakeSnapshot={handleTakeSnapshotNow}
          onOpenRestoreModal={() => setShowOopsModal(true)}
          onDownloadSnapshot={() => downloadSnapshotAsFile('latest')}
        />

        <BackupFileCards
          isExporting={isExporting}
          isRestoring={isRestoring}
          fileInputRef={fileInputRef}
          onExport={handleExportBackup}
          onFileSelect={handleFileSelect}
        />

        {/* Soft-Delete Archive & Trash Bin (Pattern 3) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs transition-colors">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FolderArchive size={20} strokeWidth={2.2} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Trash &amp; Archive Bin
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {trashCount} {trashCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Deleted challans, dispatches, payments, expenses, and parties are safely retained for 30 days before permanent purging. You can review and restore any record with 1-click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTrashModal(true)}
            className="h-10 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-98"
          >
            <FolderArchive size={15} />
            <span>Open Trash Bin</span>
          </button>
        </div>

        <BackupInformationBanners restoreStatus={restoreStatus} />
      </div>
    </div>
  )
}
