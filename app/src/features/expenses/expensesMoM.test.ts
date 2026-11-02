import { describe, it, expect } from 'vitest'

const EXPENSE_CATEGORIES = [
  'Labor',
  'Maintenance',
  'Transport',
  'Utilities',
  'Consumables',
  'Rent',
  'Other',
] as const

describe('Expenses MoM Breakdown Logic', () => {
  const formatMoMMonthHeader = (ym: string): string => {
    const [year, monthNum] = ym.split('-')
    const d = new Date(Number(year), Number(monthNum) - 1, 1)
    const monthName = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()
    const normalizedMonth = monthName === 'SEP' ? 'SEPT' : monthName
    const yearShort = String(year).slice(-2)
    return `${normalizedMonth} ${yearShort}`
  }

  it('formats month headers to uppercase short names with 2-digit years', () => {
    expect(formatMoMMonthHeader('2026-07')).toBe('JUL 26')
    expect(formatMoMMonthHeader('2026-08')).toBe('AUG 26')
    expect(formatMoMMonthHeader('2026-09')).toBe('SEPT 26')
    expect(formatMoMMonthHeader('2026-10')).toBe('OCT 26')
  })

  it('correctly aggregates expenses by category and month matrix', () => {
    const mockExpenses = [
      { id: '1', date: '2026-07-15', category: 'Labor', amount: 5000, note: '' },
      { id: '2', date: '2026-07-20', category: 'Maintenance', amount: 1500, note: '' },
      { id: '3', date: '2026-08-05', category: 'Labor', amount: 6000, note: '' },
      { id: '4', date: '2026-08-10', category: 'Transport', amount: 2000, note: '' },
      { id: '5', date: '2026-09-12', category: 'Utilities', amount: 1200, note: '' },
      { id: '6', date: '2026-10-01', category: 'Rent', amount: 10000, note: '' },
    ]

    const months = ['2026-07', '2026-08', '2026-09', '2026-10']
    const matrix: Record<string, Record<string, number>> = {}
    const monthlyTotals: Record<string, number> = {}

    EXPENSE_CATEGORIES.forEach((cat) => {
      matrix[cat] = {}
      months.forEach((m) => {
        matrix[cat][m] = 0
      })
    })

    months.forEach((m) => {
      monthlyTotals[m] = 0
    })

    mockExpenses.forEach((x) => {
      const m = x.date.slice(0, 7)
      if (matrix[x.category]) {
        matrix[x.category][m] = (matrix[x.category][m] || 0) + x.amount
      }
      monthlyTotals[m] = (monthlyTotals[m] || 0) + x.amount
    })

    // Assert Labor
    expect(matrix['Labor']['2026-07']).toBe(5000)
    expect(matrix['Labor']['2026-08']).toBe(6000)
    expect(matrix['Labor']['2026-09']).toBe(0)

    // Assert Maintenance
    expect(matrix['Maintenance']['2026-07']).toBe(1500)

    // Assert Monthly Totals
    expect(monthlyTotals['2026-07']).toBe(6500)
    expect(monthlyTotals['2026-08']).toBe(8000)
    expect(monthlyTotals['2026-09']).toBe(1200)
    expect(monthlyTotals['2026-10']).toBe(10000)

    // Grand total
    const grandTotal = Object.values(monthlyTotals).reduce((sum, v) => sum + v, 0)
    expect(grandTotal).toBe(25700)
  })
})
