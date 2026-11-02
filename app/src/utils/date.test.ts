import { describe, it, expect } from 'vitest'
import {
  SHORT_MONTH_NAMES,
  formatMonthYear,
  formatDayMonth,
  shiftMonth,
  currentMonthStr,
  todayStr,
  isThisMonth,
} from './date'

describe('Date & Month Filter Formatting Utilities', () => {
  it('has 12 standardized 3-letter month abbreviations without locale ambiguity', () => {
    expect(SHORT_MONTH_NAMES).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ])
  })

  it('formats month year correctly with Sep 2026 for September', () => {
    expect(formatMonthYear('2026-09')).toBe('Sep 2026')
    expect(formatMonthYear('2026-10')).toBe('Oct 2026')
    expect(formatMonthYear('2026-01')).toBe('Jan 2026')
  })

  it('formats special filters: All Time and Last 7 Days', () => {
    expect(formatMonthYear('all')).toBe('All Time')
    expect(formatMonthYear(null)).toBe('All Time')
    expect(formatMonthYear('')).toBe('All Time')
    expect(formatMonthYear('7days')).toBe('Last 7 Days')
  })

  it('formats custom date range as DD/MM - DD/MM', () => {
    expect(formatMonthYear('custom:2026-10-01:2026-10-15')).toBe('01/10 - 15/10')
    expect(formatMonthYear('custom:2026-09-05:')).toBe('From 05/09')
    expect(formatMonthYear('custom::2026-09-20')).toBe('Until 20/09')
    expect(formatMonthYear('custom::')).toBe('Custom Range')
  })

  it('formats day/month from ISO date string', () => {
    expect(formatDayMonth('2026-10-05')).toBe('05/10')
    expect(formatDayMonth('2026-01-31')).toBe('31/01')
    expect(formatDayMonth('')).toBe('')
  })

  it('shifts month backward and forward', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-09', 1)).toBe('2026-10')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
  })

  it('returns valid YYYY-MM format from currentMonthStr()', () => {
    const cur = currentMonthStr()
    expect(cur).toMatch(/^\d{4}-\d{2}$/)
  })

  it('produces local YYYY-MM-DD from todayStr without UTC day-shifting', () => {
    const testDate = new Date(2026, 9, 15) // Oct 15, 2026 local time
    expect(todayStr(testDate)).toBe('2026-10-15')
    const startOfYear = new Date(2026, 0, 1) // Jan 1, 2026 local time
    expect(todayStr(startOfYear)).toBe('2026-01-01')
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('checks if date belongs to this calendar month correctly', () => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0')
    expect(isThisMonth(`${thisYear}-${thisMonth}-10`)).toBe(true)
    expect(isThisMonth(`${thisYear}-${thisMonth}-10T14:30:00Z`)).toBe(true)
    expect(isThisMonth('2020-01-01')).toBe(false)
    expect(isThisMonth(null)).toBe(false)
    expect(isThisMonth('')).toBe(false)
  })
})

