import React from 'react'
import { Check, X } from 'lucide-react'

export interface FieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  children: React.ReactNode
}

export function Field({ label, children, className = '', ...props }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`} {...props}>
      <span style={{ color: 'var(--color-ink-soft)' }} className="text-xs font-medium">
        {label}
      </span>
      {children}
    </label>
  )
}

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', style, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`px-3 py-2 rounded-md border bg-white text-sm outline-none transition-shadow ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink)',
        ...style,
      }}
    />
  )
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ children, className = '', style, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`px-3 py-2 rounded-md border bg-white text-sm outline-none transition-shadow ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink)',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  style,
  ...props
}: ButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-brass)',
      color: '#ffffff',
      border: '1px solid transparent',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      background: 'transparent',
      color: 'var(--color-due)',
      border: '1px solid color-mix(in srgb, var(--color-due) 25%, transparent)',
    },
  }

  return (
    <button
      {...props}
      style={{ ...styles[variant], ...style }}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-transform select-none cursor-pointer disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  tone?: 'due' | 'positive' | 'ink'
  loading?: boolean
}

export function KpiCard({ label, value, sub, tone, loading }: KpiCardProps) {
  const toneColor =
    tone === 'due'
      ? 'var(--color-due)'
      : tone === 'positive'
      ? 'var(--color-positive)'
      : 'var(--color-ink)'

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1 min-w-[140px]"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
        {label}
      </span>
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{
          color: loading ? 'var(--color-border)' : toneColor,
          fontFamily: 'var(--font-display)',
        }}
      >
        {loading ? '—' : value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

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

export function ConfirmDelete({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onConfirm}
        className="p-1 rounded cursor-pointer"
        style={{ color: 'var(--color-due)' }}
        title="Confirm delete"
        aria-label="Confirm delete"
      >
        <Check size={15} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded cursor-pointer"
        style={{ color: 'var(--color-ink-soft)' }}
        title="Cancel"
        aria-label="Cancel delete"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </span>
  )
}

export interface TableProps<T> {
  columns: string[]
  rows: T[]
  renderRow: (row: T, index: number) => React.ReactNode
  emptyText: string
}

export function Table<T>({ columns, rows, renderRow, emptyText }: TableProps<T>) {
  if (!rows.length) return <EmptyState text={emptyText} />
  return (
    <div
      className="overflow-x-auto rounded-lg bg-white shadow-xs"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr style={{ background: 'var(--color-border-soft)' }}>
            {columns.map((c, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)] whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  )
}
