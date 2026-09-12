import React from 'react'

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', style, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`px-3 py-3 rounded-md border bg-white text-base outline-none transition-all min-h-[44px] ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink)',
        ...style,
      }}
    />
  )
}

