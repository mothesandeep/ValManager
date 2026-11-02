import { useState } from 'react'
import { AlertOctagon, Trash2 } from 'lucide-react'
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog'

export interface DangerZoneProps {
  title?: string
  description?: string
  itemName: string
  buttonLabel?: string
  dialogTitle?: string
  dialogDescription?: string
  disabled?: boolean
  disabledReason?: string
  isDeleting?: boolean
  onDelete: () => Promise<void> | void
  className?: string
}

/**
 * Danger Zone section for detailed edit modals & views.
 * Isolates high-risk destructive actions into a visually separated, red-bordered container
 * with explicit item naming and confirmation safeguards.
 */
export function DangerZone({
  title = 'Danger Zone',
  description = 'Once deleted, this record will be moved to the Trash Bin and removed from active reports. This action cannot be undone.',
  itemName,
  buttonLabel,
  dialogTitle,
  dialogDescription,
  disabled = false,
  disabledReason,
  isDeleting = false,
  onDelete,
  className = '',
}: DangerZoneProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const resolvedBtnLabel = buttonLabel || `Delete ${itemName}`

  const handleConfirm = async () => {
    try {
      await onDelete()
      setShowConfirm(false)
    } catch {
      // Handled by caller
    }
  }

  return (
    <>
      <div
        className={`rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 mt-6 transition-colors ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300 tracking-tight">
                {title}
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-700/80 dark:text-rose-400/80 leading-relaxed max-w-xl">
              {description}
            </p>
            {disabled && disabledReason && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                ⚠️ {disabledReason}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={disabled || isDeleting}
            onClick={() => setShowConfirm(true)}
            className="h-11 px-4 rounded-xl text-xs sm:text-sm font-bold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-[44px] shadow-2xs"
          >
            <Trash2 size={15} strokeWidth={2.2} />
            <span className="truncate">{resolvedBtnLabel}</span>
          </button>
        </div>
      </div>

      <DestructiveConfirmDialog
        isOpen={showConfirm}
        itemName={itemName}
        title={dialogTitle}
        description={dialogDescription}
        isDeleting={isDeleting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}

