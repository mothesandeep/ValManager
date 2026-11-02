import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

export interface DestructiveConfirmDialogProps {
  isOpen: boolean
  itemName: string
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  isDeleting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible Destructive Confirmation Dialog
 * Implements WAI-ARIA alertdialog pattern with:
 * - Specific Item Name in title and warning
 * - Solid Red warning button for deletion
 * - Neutral Grey Cancel button with automatic keyboard focus
 * - Escape key dismissal
 * - Physical button gap to prevent mis-taps
 */
export function DestructiveConfirmDialog({
  isOpen,
  itemName,
  title,
  description,
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  isDeleting = false,
  onConfirm,
  onCancel,
}: DestructiveConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the safe Cancel button on open so pressing Enter/Space by default cancels
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Escape key listener
  useEffect(() => {
    if (!isOpen || isDeleting) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onCancel])

  if (!isOpen) return null

  const resolvedTitle = title || `Delete "${itemName}" permanently?`
  const resolvedDesc =
    description || 'This action cannot be undone. Are you sure you want to permanently delete this record from the database?'

  const content = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="destructive-dialog-title"
      aria-describedby="destructive-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel()
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl max-w-md w-full p-6 text-left animate-in zoom-in-95 duration-200">
        {/* Warning Icon & Heading */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              id="destructive-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
            >
              {resolvedTitle}
            </h3>
            <span className="inline-block px-2 py-0.5 mt-1.5 text-[11px] font-semibold font-mono rounded bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 truncate max-w-full">
              {itemName}
            </span>
          </div>
        </div>

        {/* Description Warning Text */}
        <p id="destructive-dialog-desc" className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {resolvedDesc}
        </p>

        {/* Action Buttons: Cancel (Safe, grey) vs Delete (Solid Red) with distinct gap */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-11 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-11 px-5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 size={16} strokeWidth={2.2} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

