import React from 'react'
import { CheckCircle2, ZoomIn, FileText } from 'lucide-react'

export interface ChallanSlipBannerProps {
  imageUrl?: string | null
  challanNo?: string | null
  onPreview: () => void
  title?: string
  subtitle?: string
  verifiedLabel?: string
  buttonLabel?: string
  showFallback?: boolean
  onAttach?: () => void
  className?: string
}

export const ChallanSlipBanner: React.FC<ChallanSlipBannerProps> = ({
  imageUrl,
  challanNo,
  onPreview,
  title = 'Receipt Attached',
  subtitle,
  verifiedLabel = 'Verified Scan',
  buttonLabel = 'View Receipt',
  showFallback = true,
  onAttach,
  className = '',
}) => {
  if (!imageUrl) {
    if (!showFallback) return null
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl text-xs text-slate-500 dark:text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
            No receipt image attached
          </span>
          {challanNo && challanNo !== '—' && (
            <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 truncate">
              • Challan #{challanNo}
            </span>
          )}
        </div>
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 shrink-0 ml-2 cursor-pointer active:scale-95 transition-all"
          >
            <span>Attach</span>
          </button>
        )}
      </div>
    )
  }

  const displaySubtitle =
    subtitle ??
    (challanNo && challanNo !== '—'
      ? `Challan #${challanNo} • Tap to zoom`
      : 'Tap to view full receipt')

  return (
    <div
      onClick={onPreview}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
          onPreview()
        }
      }}
      className={`flex items-center justify-between p-2 sm:p-2.5 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl cursor-pointer transition-all active:scale-[0.99] group/challancard gap-2.5 ${className}`}
      aria-label="Preview receipt image"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-2xs group-hover/challancard:ring-2 group-hover/challancard:ring-emerald-500/20 transition-all"
          title="Tap to preview slip"
        >
          <img
            src={imageUrl}
            alt={challanNo && challanNo !== '—' ? `Challan #${challanNo}` : 'Challan Slip'}
            className="w-full h-full object-cover group-hover/challancard:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/challancard:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn size={14} className="text-white drop-shadow" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {title}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
              <CheckCircle2 size={10} className="shrink-0" />
              <span>{verifiedLabel}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {displaySubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg shadow-2xs group-hover/challancard:bg-slate-50 dark:group-hover/challancard:bg-slate-700 active:scale-95 transition-all shrink-0">
        <ZoomIn
          size={13}
          className="text-slate-400 group-hover/challancard:text-slate-700 dark:group-hover/challancard:text-white transition-colors"
        />
        <span>{buttonLabel}</span>
      </div>
    </div>
  )
}

export default ChallanSlipBanner

