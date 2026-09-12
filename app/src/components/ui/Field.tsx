import React from 'react'

export interface FieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  children: React.ReactNode
}

export function Field({ label, children, className = '', ...props }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`} {...props}>
      <span style={{ color: 'var(--color-ink-soft)' }} className="text-xs font-medium">
        {label}
      </span>
      {children}
    </label>
  )
}

