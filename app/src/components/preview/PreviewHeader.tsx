import React, { useState, useRef, useEffect } from 'react'
import { X, MoreVertical, Trash2 } from 'lucide-react'
import { fmtDate } from '@/utils/date'

export interface PreviewSubtitleProps {
  challanNo?: string | null
  date: string
  badge?: React.ReactNode
  className?: string
}

export const PreviewSubtitle: React.FC<PreviewSubtitleProps> = ({
  challanNo,
  date,
  badge,
  className = '',
}) => {
  const displayChallan =
    challanNo && challanNo !== '—' ? `Challan #${challanNo}` : 'No Challan'

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 ${className}`}
    >
      <span>{displayChallan}</span>
      <span>•</span>
      <span>{fmtDate(date)}</span>
      {badge}
    </div>
  )
}

export interface PreviewHeaderProps {
  partyName: string
  challanNo?: string | null
  date: string
  onClose?: () => void
  onDelete?: () => void
  deleteLabel?: string
  badge?: React.ReactNode
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>
  className?: string
  actionsMenu?: React.ReactNode
}

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  partyName,
  challanNo,
  date,
  onClose,
  onDelete,
  deleteLabel = 'Delete Entire Challan',
  badge,
  onPointerDown,
  className = '',
  actionsMenu,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isMenuOpen])

  return (
    <div
      className={`px-5 sm:px-6 pt-2 pb-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 shrink-0 z-20 select-none ${className}`}
      onPointerDown={onPointerDown}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight leading-tight truncate">
          {partyName}
        </h2>
        <PreviewSubtitle challanNo={challanNo} date={date} badge={badge} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {actionsMenu}

        {onDelete && !actionsMenu && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="More options"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onDelete()
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{deleteLabel}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  )
}

export default PreviewHeader

