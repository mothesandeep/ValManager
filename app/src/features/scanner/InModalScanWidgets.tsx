import { Sparkles, Loader2, Camera, CheckCircle2, Eye, RefreshCw, X } from 'lucide-react'
import type { AttachedChallanPhoto } from './useInModalChallanScan'

export interface InModalScanHeaderPillProps {
  onScan: () => void
  isScanning: boolean
  disabled?: boolean
}

export function InModalScanHeaderPill({
  onScan,
  isScanning,
  disabled = false,
}: InModalScanHeaderPillProps) {
  return (
    <button
      type="button"
      onClick={onScan}
      disabled={disabled || isScanning}
      className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-300 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
      title="Snap delivery challan or browse document to autofill with Gemini AI"
    >
      {isScanning ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      )}
      <span className="whitespace-nowrap">
        {isScanning ? 'Scanning...' : 'Scan Challan AI'}
      </span>
    </button>
  )
}

export interface InModalScanBannerProps {
  isScanning: boolean
  scanningStatus?: string
  attachedPhoto: AttachedChallanPhoto | null
  onScan: () => void
  onViewPhoto?: () => void
  onRemovePhoto?: () => void
  isEditing?: boolean
}

export function InModalScanBanner({
  isScanning,
  scanningStatus = 'Extracting challan details with Gemini AI...',
  attachedPhoto,
  onScan,
  onViewPhoto,
  onRemovePhoto,
  isEditing = false,
}: InModalScanBannerProps) {
  // Case 1: Active Scanning State
  if (isScanning) {
    return (
      <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 animate-pulse flex items-center gap-3 shadow-xs">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <Sparkles className="w-4 h-4 text-blue-600 absolute inset-0 m-auto" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-blue-950 dark:text-blue-100">
            {scanningStatus || 'Extracting challan details with Gemini AI...'}
          </p>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 truncate">
            Transcribing party name, challan number, date, and bag weights in real-time.
          </p>
        </div>
      </div>
    )
  }

  // Case 2: Attached Photo Preview Card
  if (attachedPhoto) {
    return (
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={onViewPhoto}
            className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer group bg-slate-100 dark:bg-slate-800"
            title="Click to view full challan slip"
          >
            <img
              src={attachedPhoto.previewUrl}
              alt="Attached challan receipt"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Challan Slip Attached
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Autofilled with Gemini Vision • Tap to view full slip
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onViewPhoto && (
            <button
              type="button"
              onClick={onViewPhoto}
              className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>
          )}
          <button
            type="button"
            onClick={onScan}
            className="h-8 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Retake or replace challan photo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retake</span>
          </button>
          {onRemovePhoto && (
            <button
              type="button"
              onClick={onRemovePhoto}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
              title="Remove attached photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Case 3: Empty State Prompt (shown for new records as the primary AI Scan entry point)
  if (!isEditing) {
    return (
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Camera className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-950 dark:text-blue-100 leading-tight">
              Auto-fill with AI Scan
            </p>
            <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80 mt-0.5 leading-tight truncate">
              Take photo or upload delivery slip
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onScan}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          title="Snap delivery challan or browse document to autofill with Gemini AI"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scan Slip</span>
        </button>
      </div>
    )
  }

  return null
}
