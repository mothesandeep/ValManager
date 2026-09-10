import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { currentMonthStr, formatMonthYear, shiftMonth } from '../types'

export interface MonthContextValue {
  selectedMonth: string // 'YYYY-MM' (e.g. '2026-09') or 'all'
  setSelectedMonth: (month: string) => void
  prevMonth: () => void
  nextMonth: () => void
  setThisMonth: () => void
  setAllTime: () => void
  formattedMonth: string // e.g. "September 2026" or "All Time"
  isAllTime: boolean
  isCurrentMonth: boolean
  filterByMonth: <T extends { date?: string | null }>(items: T[]) => T[]
}

const MonthContext = createContext<MonthContextValue | undefined>(undefined)

const STORAGE_KEY = 'kasab_global_selected_month'

export const MonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && (saved === 'all' || /^\d{4}-\d{2}$/.test(saved))) {
        return saved
      }
    } catch {
      // ignore
    }
    return currentMonthStr()
  })

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month)
    try {
      localStorage.setItem(STORAGE_KEY, month)
    } catch {
      // ignore
    }
  }, [])

  const prevMonth = useCallback(() => {
    setSelectedMonthState((prev) => {
      const next = shiftMonth(prev, -1)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const nextMonth = useCallback(() => {
    setSelectedMonthState((prev) => {
      const next = shiftMonth(prev, 1)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const setThisMonth = useCallback(() => {
    const cur = currentMonthStr()
    setSelectedMonthState(cur)
    try {
      localStorage.setItem(STORAGE_KEY, cur)
    } catch {
      // ignore
    }
  }, [])

  const setAllTime = useCallback(() => {
    setSelectedMonthState('all')
    try {
      localStorage.setItem(STORAGE_KEY, 'all')
    } catch {
      // ignore
    }
  }, [])

  const filterByMonth = useCallback(
    <T extends { date?: string | null }>(items: T[]): T[] => {
      if (!selectedMonth || selectedMonth === 'all') return items
      return items.filter((item) => item.date && item.date.startsWith(selectedMonth))
    },
    [selectedMonth]
  )

  const formattedMonth = useMemo(() => formatMonthYear(selectedMonth), [selectedMonth])
  const isAllTime = selectedMonth === 'all'
  const isCurrentMonth = selectedMonth === currentMonthStr()

  const value = useMemo<MonthContextValue>(
    () => ({
      selectedMonth,
      setSelectedMonth,
      prevMonth,
      nextMonth,
      setThisMonth,
      setAllTime,
      formattedMonth,
      isAllTime,
      isCurrentMonth,
      filterByMonth,
    }),
    [
      selectedMonth,
      setSelectedMonth,
      prevMonth,
      nextMonth,
      setThisMonth,
      setAllTime,
      formattedMonth,
      isAllTime,
      isCurrentMonth,
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
