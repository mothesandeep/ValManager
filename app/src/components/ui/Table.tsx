import React from 'react'
import { EmptyState } from './EmptyState'

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
