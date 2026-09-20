import { useState } from 'react'
import { Trash2, Check, X } from 'lucide-react'

interface Props {
  onConfirm: () => void
  disabled?: boolean
  label?: string
}

export default function InlineConfirmDelete({ onConfirm, disabled, label = 'Delete' }: Props) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        disabled={disabled}
        title={label}
        aria-label={label}
        className="flex items-center justify-center rounded-[var(--radius-md)] transition-colors text-[var(--color-ink-soft)] hover:text-[var(--color-due)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{
          minHeight: 40,
          minWidth: 40,
        }}
      >
        <Trash2 size={16} strokeWidth={2} />
      </button>
    )
  }

  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => { onConfirm(); setArmed(false) }}
        title="Confirm delete"
        aria-label="Confirm delete"
        className="flex items-center justify-center rounded-[var(--radius-md)] transition-colors text-[var(--color-due)] bg-[var(--color-due-bg)] cursor-pointer"
        style={{
          minHeight: 40,
          minWidth: 40,
        }}
      >
        <Check size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        title="Cancel"
        aria-label="Cancel delete"
        className="flex items-center justify-center rounded-[var(--radius-md)] transition-colors text-[var(--color-ink-soft)] hover:bg-[var(--color-border-soft)] cursor-pointer"
        style={{
          minHeight: 40,
          minWidth: 40,
        }}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </span>
  )
}
