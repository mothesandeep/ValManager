import React from 'react'

export function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg p-8 text-center text-sm"
      style={{ border: '1px dashed var(--color-border)', color: 'var(--color-ink-soft)' }}
    >
      {text}
    </div>
  )
}

