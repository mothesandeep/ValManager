import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'
import { ImpactStyle } from '@capacitor/haptics'

export interface ActionConfirmSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  destructiveLabel?: string
  cancelLabel?: string
  onConfirmDestructive: () => void | Promise<void>
  loading?: boolean
}

export type ActionSheetProps = ActionConfirmSheetProps

export const ActionConfirmSheet: React.FC<ActionConfirmSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  destructiveLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirmDestructive,
  loading = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      triggerHaptic(ImpactStyle.Light)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const handleCloseActive = () => {
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('kasab:close-active-modal', handleCloseActive)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('kasab:close-active-modal', handleCloseActive)
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Action Sheet Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-sm flex flex-col gap-2 z-10"
          >
            {/* Top Container: Title, Description, and Destructive Action */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {(title || description) && (
                <div className="px-4 py-3.5 text-center flex flex-col gap-1">
                  {title && (
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {title}
                    </span>
                  )}
                  {description && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  try {
                    await onConfirmDestructive()
                  } finally {
                    onClose()
                  }
                }}
                className="w-full h-12 flex items-center justify-center gap-2 text-rose-600 dark:text-rose-500 font-bold text-base hover:bg-rose-50/50 dark:hover:bg-rose-950/30 active:bg-rose-100/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="size-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={18} strokeWidth={2.2} />
                    <span>{destructiveLabel}</span>
                  </>
                )}
              </button>
            </div>

            {/* Bottom Container: Cancel Button */}
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg text-slate-800 dark:text-slate-200 font-bold text-base flex items-center justify-center active:scale-[0.98] transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export const ActionSheet = ActionConfirmSheet
export default ActionConfirmSheet
