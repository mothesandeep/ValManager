import { Download, Upload } from 'lucide-react'

interface BackupFileCardsProps {
  isExporting: boolean
  isRestoring: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onExport: () => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function BackupFileCards({
  isExporting,
  isRestoring,
  fileInputRef,
  onExport,
  onFileSelect,
}: BackupFileCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
      {/* Card 1: Export Full Backup */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4">
        <div className="space-y-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Download size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Export Full Backup (JSON)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Bundles all local Dexie database tables along with tare settings and tar masters into a single JSON file.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="w-full py-2 px-3.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Download size={14} />
          <span>{isExporting ? 'Generating Backup…' : 'Download Backup File (.json)'}</span>
        </button>
      </div>

      {/* Card 2: Restore from Backup */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4">
        <div className="space-y-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Upload size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Restore from Backup File
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Upload a previously exported ValManager JSON backup to restore and synchronize records onto this system.
            </p>
          </div>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="w-full py-2 px-3.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isRestoring ? 'Restoring Records…' : 'Select Backup File (.json)'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

