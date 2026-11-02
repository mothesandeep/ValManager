import { describe, it, expect } from 'vitest'
import { filterItemsByMonth } from './MonthContext'

describe('MonthContext filterItemsByMonth utility', () => {
  it('filters items correctly within calendar month boundaries', () => {
    const testItems = [
      { id: '1', date: '2026-10-01' }, // boundary start
      { id: '2', date: '2026-10-15' }, // mid-month
      { id: '3', date: '2026-10-31' }, // boundary end
      { id: '4', date: '2026-10-15T18:30:00Z' }, // with timestamp
      { id: '5', date: '2026-09-30' }, // prior month
      { id: '6', date: '2026-11-01' }, // subsequent month
      { id: '7', date: null },
      { id: '8', date: '' },
    ]

    const filtered = filterItemsByMonth(testItems, '2026-10')
    expect(filtered.map((item) => item.id)).toEqual(['1', '2', '3', '4'])
  })

  it('filters items correctly for "all" time', () => {
    const testItems = [
      { id: '1', date: '2026-10-01' },
      { id: '2', date: '2025-05-12' },
      { id: '3', date: null },
    ]

    const filtered = filterItemsByMonth(testItems, 'all')
    expect(filtered.length).toBe(3)
  })

  it('filters items correctly for custom range', () => {
    const testItems = [
      { id: '1', date: '2026-10-04' },
      { id: '2', date: '2026-10-05' },
      { id: '3', date: '2026-10-10' },
      { id: '4', date: '2026-10-20' },
      { id: '5', date: '2026-10-21' },
    ]

    const filtered = filterItemsByMonth(testItems, 'custom:2026-10-05:2026-10-20')
    expect(filtered.map((item) => item.id)).toEqual(['2', '3', '4'])
  })

  it('filters items correctly for fiscal year (fy-YYYY)', () => {
    const testItems = [
      { id: '1', date: '2026-03-31' }, // FY 2025
      { id: '2', date: '2026-04-01' }, // FY 2026 start
      { id: '3', date: '2026-10-15' }, // FY 2026 mid
      { id: '4', date: '2027-03-31' }, // FY 2026 end
      { id: '5', date: '2027-04-01' }, // FY 2027
    ]

    const filtered = filterItemsByMonth(testItems, 'fy-2026')
    expect(filtered.map((item) => item.id)).toEqual(['2', '3', '4'])
  })
})
