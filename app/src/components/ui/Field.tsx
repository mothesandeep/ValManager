import React from 'react'

export interface FieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  children: React.ReactNode
}

export function Field({ label, children, className = '', ...props }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`} {...props}>
      <span className="text-xs font-semibold tracking-wide uppercase text-[var(--color-ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  )
}
