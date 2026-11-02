import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import {
  currentMonthStr,
  formatMonthYear,
  shiftMonth,
  SHORT_MONTH_NAMES,
  formatDayMonth,
  todayStr,
} from '../utils/date'

export interface MonthContextValue {
  selectedMonth: string // 'YYYY-MM', 'all', '7days', 'custom:START:END', or 'fy-YYYY'
  setSelectedMonth: (month: string) => void
  prevMonth: () => void
  nextMonth: () => void
  setThisMonth: () => void
  setLastMonth: () => void
  setLast7Days: () => void
  setAllTime: () => void
  setCustomRange: (startDate: string, endDate: string) => void
  setFiscalYear: (fyStartYear?: number) => void
  formattedMonth: string // e.g. "Oct 2026", "Sep 2026", "FY 2026-27", or "All Time"
  dateFilterLabel: string // e.g. "This Month (Oct 2026)", "Last Month (Sep 2026)", "Last 7 Days", "All Time", "01/10 - 15/10"
  isAllTime: boolean
  isCurrentMonth: boolean
  isLastMonth: boolean
  isLast7Days: boolean
  filterByMonth: <T extends { date?: string | null }>(items: T[]) => T[]
}

const MonthContext = createContext<MonthContextValue | undefined>(undefined)

const STORAGE_KEY = 'kasab_global_selected_month'

export function filterItemsByMonth<T extends { date?: string | null }>(items: T[], selectedMonth: string): T[] {
  if (!selectedMonth || selectedMonth === 'all') return items

  const cleanDate = (d?: string | null): string => {
    if (!d) return ''
    const s = String(d).trim()
    return s.includes('T') ? s.split('T')[0] : s.slice(0, 10)
  }

  if (selectedMonth === '7days') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    const cutoff = todayStr(d)
    const todayVal = todayStr()
    return items.filter((item) => {
      const entryDate = cleanDate(item.date)
      return entryDate >= cutoff && entryDate <= todayVal
    })
  }
  if (selectedMonth.startsWith('custom:')) {
    const parts = selectedMonth.split(':')
    const start = parts[1] ? cleanDate(parts[1]) : ''
    const end = parts[2] ? cleanDate(parts[2]) : ''
    return items.filter((item) => {
      const entryDate = cleanDate(item.date)
      if (!entryDate) return false
      if (start && entryDate < start) return false
      if (end && entryDate > end) return false
      return true
    })
  }
  if (selectedMonth.startsWith('fy-')) {
    const fyYear = parseInt(selectedMonth.replace('fy-', ''), 10)
    const start = `${fyYear}-04-01`
    const end = `${fyYear + 1}-03-31`
    return items.filter((item) => {
      const entryDate = cleanDate(item.date)
      return entryDate >= start && entryDate <= end
    })
  }

  // Format: YYYY-MM with exact calendar boundary checks
  const [yStr, mStr] = selectedMonth.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) // 1-12
  if (!isNaN(year) && !isNaN(month)) {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return items.filter((item) => {
      const entryDate = cleanDate(item.date)
      return entryDate >= startOfMonth && entryDate <= endOfMonth
    })
  }

  return items.filter((item) => {
    const entryDate = cleanDate(item.date)
    return entryDate.startsWith(selectedMonth)
  })
}

export const MonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    try {
      // Clear legacy localStorage to ensure fresh default to current calendar month
      localStorage.removeItem(STORAGE_KEY)
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (
        saved &&
        (saved === 'all' ||
          saved === '7days' ||
          saved.startsWith('custom:') ||
          /^\d{4}-\d{2}$/.test(saved) ||
          /^fy-\d{4}$/.test(saved))
      ) {
        return saved
      }
    } catch {
      // ignore
    }
    return currentMonthStr(new Date())
  })

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month)
    try {
      sessionStorage.setItem(STORAGE_KEY, month)
    } catch {
      // ignore
    }
  }, [])

  const prevMonth = useCallback(() => {
    setSelectedMonthState((prev) => {
      if (prev.startsWith('fy-')) {
        const y = parseInt(prev.replace('fy-', ''), 10) - 1
        const next = `fy-${y}`
        try {
          sessionStorage.setItem(STORAGE_KEY, next)
        } catch {
          // ignore
        }
        return next
      }
      const next = shiftMonth(prev, -1)
      try {
        sessionStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const nextMonth = useCallback(() => {
    setSelectedMonthState((prev) => {
      if (prev.startsWith('fy-')) {
        const y = parseInt(prev.replace('fy-', ''), 10) + 1
        const next = `fy-${y}`
        try {
          sessionStorage.setItem(STORAGE_KEY, next)
        } catch {
          // ignore
        }
        return next
      }
      const next = shiftMonth(prev, 1)
      try {
        sessionStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const setThisMonth = useCallback(() => {
    const cur = currentMonthStr(new Date())
    setSelectedMonthState(cur)
    try {
      sessionStorage.setItem(STORAGE_KEY, cur)
    } catch {
      // ignore
    }
  }, [])

  const setLastMonth = useCallback(() => {
    const last = shiftMonth(currentMonthStr(new Date()), -1)
    setSelectedMonthState(last)
    try {
      sessionStorage.setItem(STORAGE_KEY, last)
    } catch {
      // ignore
    }
  }, [])

  const setLast7Days = useCallback(() => {
    setSelectedMonthState('7days')
    try {
      sessionStorage.setItem(STORAGE_KEY, '7days')
    } catch {
      // ignore
    }
  }, [])

  const setAllTime = useCallback(() => {
    setSelectedMonthState('all')
    try {
      sessionStorage.setItem(STORAGE_KEY, 'all')
    } catch {
      // ignore
    }
  }, [])

  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    const val = `custom:${startDate || ''}:${endDate || ''}`
    setSelectedMonthState(val)
    try {
      sessionStorage.setItem(STORAGE_KEY, val)
    } catch {
      // ignore
    }
  }, [])

  const setFiscalYear = useCallback((fyStartYear?: number) => {
    const now = new Date()
    const y = fyStartYear ?? (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1)
    const val = `fy-${y}`
    setSelectedMonthState(val)
    try {
      sessionStorage.setItem(STORAGE_KEY, val)
    } catch {
      // ignore
    }
  }, [])

  const filterByMonth = useCallback(
    <T extends { date?: string | null }>(items: T[]): T[] => {
      return filterItemsByMonth(items, selectedMonth)
    },
    [selectedMonth]
  )

  const now = new Date()
  const curMonth = currentMonthStr(now)
  const prevMonthStr = shiftMonth(curMonth, -1)
  const curMonthName = SHORT_MONTH_NAMES[now.getMonth()]
  const curYear = now.getFullYear()
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthName = SHORT_MONTH_NAMES[prevDate.getMonth()]
  const prevYear = prevDate.getFullYear()

  const formattedMonth = useMemo(() => {
    if (selectedMonth === 'all') return 'All Time'
    if (selectedMonth === '7days') return 'Last 7 Days'
    if (selectedMonth === curMonth) return `${curMonthName} ${curYear}`
    if (selectedMonth === prevMonthStr) return `${prevMonthName} ${prevYear}`
    return formatMonthYear(selectedMonth)
  }, [selectedMonth, curMonth, prevMonthStr, curMonthName, curYear, prevMonthName, prevYear])

  const dateFilterLabel = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return 'All Time'
    if (selectedMonth === '7days') return 'Last 7 Days'
    if (selectedMonth === curMonth) return `This Month (${curMonthName} ${curYear})`
    if (selectedMonth === prevMonthStr) return `Last Month (${prevMonthName} ${prevYear})`
    if (selectedMonth.startsWith('custom:')) {
      const parts = selectedMonth.split(':')
      const start = parts[1]
      const end = parts[2]
      if (start && end) return `${formatDayMonth(start)} - ${formatDayMonth(end)}`
      if (start) return `From ${formatDayMonth(start)}`
      if (end) return `Until ${formatDayMonth(end)}`
      return 'Custom Range'
    }
    if (selectedMonth.startsWith('fy-')) {
      const y = parseInt(selectedMonth.replace('fy-', ''), 10)
      return `FY ${y}-${String(y + 1).slice(-2)}`
    }
    return formatMonthYear(selectedMonth)
  }, [selectedMonth, curMonth, prevMonthStr, curMonthName, curYear, prevMonthName, prevYear])

  const isAllTime = selectedMonth === 'all'
  const isCurrentMonth = selectedMonth === curMonth
  const isLastMonth = selectedMonth === prevMonthStr
  const isLast7Days = selectedMonth === '7days'

  const value = useMemo<MonthContextValue>(
    () => ({
      selectedMonth,
      setSelectedMonth,
      prevMonth,
      nextMonth,
      setThisMonth,
      setLastMonth,
      setLast7Days,
      setAllTime,
      setCustomRange,
      setFiscalYear,
      formattedMonth,
      dateFilterLabel,
      isAllTime,
      isCurrentMonth,
      isLastMonth,
      isLast7Days,
      filterByMonth,
    }),
    [
      selectedMonth,
      setSelectedMonth,
      prevMonth,
      nextMonth,
      setThisMonth,
      setLastMonth,
      setLast7Days,
      setAllTime,
      setCustomRange,
      setFiscalYear,
      formattedMonth,
      dateFilterLabel,
      isAllTime,
      isCurrentMonth,
      isLastMonth,
      isLast7Days,
      filterByMonth,
    ]
  )

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}

export function useMonth(): MonthContextValue {
  const context = useContext(MonthContext)
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider')
  }
  return context
}
