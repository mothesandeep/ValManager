import { useMemo } from 'react'
import { useMonth } from '@/context/MonthContext'
import { useData } from '@/hooks/useData'
import { fmtDate } from '@/utils/date'
import type { Expense } from '@/features/expenses/types/expense.types'
import { standardizeCategory } from '@/features/expenses/constants'

function detectExpensePaymentMode(expense: Expense): { mode: string; isUPI: boolean; isBank: boolean } {
  const note = (expense.note || '').toLowerCase()
  if (note.includes('(cash)') || note.includes('cash')) {
    return { mode: 'Cash', isUPI: false, isBank: false }
  }
  if (
    note.includes('(upi)') ||
    note.includes('upi') ||
    note.includes('gpay') ||
    note.includes('phonepe') ||
    note.includes('online')
  ) {
    return { mode: 'UPI', isUPI: true, isBank: false }
  }
  if (
    note.includes('(bank transfer)') ||
    note.includes('neft') ||
    note.includes('rtgs') ||
    note.includes('bank') ||
    note.includes('transfer')
  ) {
    return { mode: 'Bank Transfer', isUPI: false, isBank: true }
  }
  if (note.includes('cheque') || note.includes('chq')) {
    return { mode: 'Cheque', isUPI: false, isBank: true }
  }
  const cat = (expense.category || '').toLowerCase()
  const amt = Number(expense.amount) || 0
  if (cat.includes('rent') || amt >= 10000) {
    return { mode: 'Bank Transfer', isUPI: false, isBank: true }
  }
  if (amt >= 500 && (note.includes('petrol') || note.includes('tyre') || note.includes('bugari'))) {
    return { mode: 'UPI', isUPI: true, isBank: false }
  }
  return { mode: 'Cash', isUPI: false, isBank: false }
}

export interface UseExpenseMetricsParams {
  searchQuery?: string
  selectedCategory?: string
  selectedPaymentMode?: string
  currentPage?: number
  pageSize?: number
}

export function useExpenseMetrics({
  searchQuery = '',
  selectedCategory = 'ALL',
  selectedPaymentMode = 'ALL',
  currentPage = 1,
  pageSize = 10,
}: UseExpenseMetricsParams = {}) {
  const { filterByMonth } = useMonth()
  const { expenses } = useData()

  const filteredExpenses = useMemo<Expense[]>(
    () => filterByMonth(expenses),
    [expenses, filterByMonth]
  )

  const monthTotal = useMemo(
    () => filteredExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [filteredExpenses]
  )

  const categoryCounts = useMemo(() => {
    return filteredExpenses.reduce<Record<string, number>>((acc, x) => {
      const head = standardizeCategory(x.category, x.note)
      acc[head] = (acc[head] || 0) + 1
      return acc
    }, {})
  }, [filteredExpenses])

  const { topCategory, topCategoryAmount } = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const x of filteredExpenses) {
      const head = standardizeCategory(x.category, x.note)
      totals[head] = (totals[head] || 0) + (Number(x.amount) || 0)
    }
    let topCat = '—'
    let maxAmt = 0
    for (const [cat, amt] of Object.entries(totals)) {
      if (amt > maxAmt) {
        maxAmt = amt
        topCat = cat
      }
    }
    return { topCategory: topCat, topCategoryAmount: maxAmt }
  }, [filteredExpenses])

  const displayExpenses = useMemo(() => {
    const list = filteredExpenses.filter((x) => {
      const head = standardizeCategory(x.category, x.note)
      if (selectedCategory !== 'ALL' && head !== selectedCategory) {
        return false
      }
      if (selectedPaymentMode !== 'ALL') {
        const modeInfo = detectExpensePaymentMode(x)
        if (selectedPaymentMode === 'Cash' && modeInfo.mode !== 'Cash') return false
        if (selectedPaymentMode === 'UPI' && !modeInfo.isUPI && modeInfo.mode !== 'UPI') return false
        if (selectedPaymentMode === 'Bank' && !modeInfo.isBank && !['Bank Transfer', 'Cheque'].includes(modeInfo.mode))
          return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const noteMatch = (x.note || '').toLowerCase().includes(q)
      const catMatch = (x.category || '').toLowerCase().includes(q)
      const headMatch = head.toLowerCase().includes(q)
      const amtMatch = String(x.amount).includes(q)
      const dateMatch = fmtDate(x.date).toLowerCase().includes(q)
      return noteMatch || catMatch || headMatch || amtMatch || dateMatch
    })

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [filteredExpenses, selectedCategory, selectedPaymentMode, searchQuery])

  const displayTotal = useMemo(
    () => displayExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [displayExpenses]
  )

  const totalPages = Math.max(1, Math.ceil(displayExpenses.length / pageSize))

  const paginatedExpenses = useMemo(() => {
    return displayExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [displayExpenses, currentPage, pageSize])

  return {
    filteredExpenses,
    monthTotal,
    categoryCounts,
    topCategory,
    topCategoryAmount,
    displayExpenses,
    displayTotal,
    totalPages,
    paginatedExpenses,
  }
}
