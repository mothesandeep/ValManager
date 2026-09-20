import React from 'react'

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', style, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`px-3 py-2 rounded-[var(--radius-md)] border text-sm outline-none transition-all min-h-[44px] w-full bg-[var(--color-card)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-paper)] placeholder:text-[var(--color-ink-soft)] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink)',
        ...style,
      }}
    />
  )
}
