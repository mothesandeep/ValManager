import { useState } from 'react'
import { Trash2, Check, X } from 'lucide-react'

interface Props {
  onConfirm: () => void
  disabled?: boolean
  label?: string
}

/**
 * Two-tap delete button per design.md §3:
 *   tap once → arm (shows check + cancel)
 *   tap check → execute delete
 *   tap X or blur → disarm
 */
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
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          minHeight: 40,
          minWidth: 40,
          color: 'var(--color-ink-soft)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-due)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-soft)')}
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
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          minHeight: 40,
          minWidth: 40,
          color: 'var(--color-due)',
          background: 'var(--color-due-bg)',
        }}
      >
        <Check size={15} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        title="Cancel"
        aria-label="Cancel delete"
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          minHeight: 40,
          minWidth: 40,
          color: 'var(--color-ink-soft)',
        }}
      >
        <X size={15} strokeWidth={2} />
      </button>
    </span>
  )
}
