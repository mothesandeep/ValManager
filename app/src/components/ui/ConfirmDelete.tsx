
import { Check, X } from 'lucide-react'

export function ConfirmDelete({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={onConfirm}
        className="p-2 rounded-[var(--radius-md)] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors hover:bg-[var(--color-due-bg)] text-[var(--color-due)]"
        title="Confirm delete"
        aria-label="Confirm delete"
      >
        <Check size={18} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-[var(--radius-md)] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors hover:bg-[var(--color-border-soft)] text-[var(--color-ink-soft)]"
        title="Cancel"
        aria-label="Cancel delete"
      >
        <X size={18} strokeWidth={2} />
      </button>
    </span>
  )
}
