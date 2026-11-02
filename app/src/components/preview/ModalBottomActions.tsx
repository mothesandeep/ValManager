import React from 'react'
import { Printer, Pencil, Trash2 } from 'lucide-react'

export interface ModalBottomActionsProps {
  primaryLabel?: string
  primaryIcon?: React.ReactNode
  onPrimaryClick: () => void
  secondaryLabel?: string
  secondaryIcon?: React.ReactNode
  onSecondaryClick?: () => void
  tertiaryLabel?: string
  tertiaryIcon?: React.ReactNode
  onTertiaryClick?: () => void
  destructiveLabel?: string
  destructiveIcon?: React.ReactNode
  onDestructiveClick?: () => void
  className?: string
}

export const ModalBottomActions: React.FC<ModalBottomActionsProps> = ({
  primaryLabel = 'Print Delivery Challan',
  primaryIcon,
  onPrimaryClick,
  secondaryLabel = 'Edit Challan',
  secondaryIcon,
  onSecondaryClick,
  tertiaryLabel = 'View Receipt',
  tertiaryIcon,
  onTertiaryClick,
  destructiveLabel = 'Delete Entire Challan',
  destructiveIcon,
  onDestructiveClick,
  className = '',
}) => {
  return (
    <div
      className={`p-3 sm:p-4 bg-white dark:bg-slate-900 md:bg-white/95 md:dark:bg-slate-900/95 md:backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {/* Primary Row: Print and Edit Challan */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrimaryClick}
          className="flex-1 h-10 sm:h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
        >
          {primaryIcon ?? <Printer size={16} />}
          <span>{primaryLabel}</span>
        </button>

        {onSecondaryClick && (
          <button
            type="button"
            onClick={onSecondaryClick}
            className="flex-1 sm:flex-initial px-4 sm:px-5 h-10 sm:h-11 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-[0.98] shrink-0"
          >
            {secondaryIcon ?? <Pencil size={15} />}
            <span>{secondaryLabel}</span>
          </button>
        )}

        {onTertiaryClick && (
          <button
            type="button"
            onClick={onTertiaryClick}
            className="px-3 h-10 sm:h-11 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-[0.98] shrink-0"
            title={tertiaryLabel}
          >
            {tertiaryIcon}
            <span className="hidden sm:inline">{tertiaryLabel}</span>
          </button>
        )}
      </div>

      {/* Outlined red button for destructive action */}
      {onDestructiveClick && (
        <button
          type="button"
          onClick={onDestructiveClick}
          className="mt-2.5 w-full h-9 sm:h-10 rounded-xl border border-red-500/80 hover:border-red-600 dark:border-red-500/70 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          title={destructiveLabel}
        >
          {destructiveIcon ?? <Trash2 size={14} className="text-red-500 dark:text-red-400 shrink-0" />}
          <span>{destructiveLabel}</span>
        </button>
      )}
    </div>
  )
}

export default ModalBottomActions

