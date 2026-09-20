import React from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({ text, icon: Icon = Inbox }: { text: string, icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-xl)] bg-[var(--color-card)]/50">
      <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border-soft)] flex items-center justify-center mb-4 text-[var(--color-brass)] opacity-80">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-[var(--color-ink-soft)] max-w-[240px] leading-relaxed">
        {text}
      </p>
    </div>
  )
}
