import { CheckCircle2, AlertCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react'
import type { ToastType, ToastAction } from '@/context/ToastContext'

export interface ToastNotificationProps {
  id: number
  message: string
  type: ToastType
  action?: ToastAction
  onDismiss: (id: number) => void
}

export function ToastNotification({
  id,
  message,
  type,
  action,
  onDismiss,
}: ToastNotificationProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
      case 'error':
        return <AlertCircle size={16} className="text-rose-500 shrink-0" />
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500 shrink-0" />
      case 'delete':
        return <Trash2 size={16} className="text-rose-500 shrink-0" />
      case 'info':
      default:
        return <Info size={16} className="text-blue-600 shrink-0" />
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-900 dark:text-slate-100 min-w-[280px] max-w-[380px]">
      {getIcon()}
      <span className="text-xs sm:text-sm font-semibold flex-1 leading-snug break-words">
        {message}
      </span>
      {action && (
        <button
          type="button"
          onClick={() => {
            void action.onClick()
            onDismiss(id)
          }}
          className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default ToastNotification
