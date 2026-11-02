
import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

export function ConfirmDelete({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={onConfirm}
        className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl cursor-pointer flex items-center justify-center transition-colors hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400"
        title="Confirm delete"
        aria-label="Confirm delete"
      >
        <Check size={18} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl cursor-pointer flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
        title="Cancel"
        aria-label="Cancel delete"
      >
        <X size={18} strokeWidth={2} />
      </button>
    </span>
  )
}
