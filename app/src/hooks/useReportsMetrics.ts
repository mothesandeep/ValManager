import { useMemo } from 'react'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { standardizeCategory, EXPENSE_CATEGORIES } from '@/features/expenses/constants'
import type { Party } from '@/features/parties/types/party.types'

export interface PartyReportRow {
  party: Party
  totalReceivedWeight: number
  totalDispatchWeight: number
  totalDispatchValue: number
  received: number
  balance: number
  periodNet: number
  hasActivity: boolean
}

export function useReportsMetrics() {
  const { parties, receipts, dispatches, payments, expenses, partyStats: stats } = useData()
  const { filterByMonth } = useMonth()

  const filteredReceipts = useMemo(
    () => filterByMonth(receipts),
    [receipts, filterByMonth]
  )

  const filteredDispatches = useMemo(
    () => filterByMonth(dispatches),
    [dispatches, filterByMonth]
  )

  const filteredExpenses = useMemo(
    () => filterByMonth(expenses),
    [expenses, filterByMonth]
  )

  const filteredPayments = useMemo(
    () => filterByMonth(payments),
    [payments, filterByMonth]
  )

  const periodReceived = useMemo(
    () => filteredReceipts.reduce((s, r) => s + (Number(r.net_weight) || 0), 0),
    [filteredReceipts]
  )

  const periodDispatched = useMemo(
    () => filteredDispatches.reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0),
    [filteredDispatches]
  )

  const periodExpenses = useMemo(
    () => filteredExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [filteredExpenses]
  )

  const periodRevenue = useMemo(
    () => filteredDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [filteredDispatches]
  )

  const periodProfit = periodRevenue - periodExpenses
  const profitMargin =
    periodRevenue > 0 ? Math.max(0, (periodProfit / periodRevenue) * 100).toFixed(1) : '0.0'

  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {}
    EXPENSE_CATEGORIES.forEach((cat) => {
      map[cat] = 0
    })

    filteredExpenses.forEach((x) => {
      const cat = standardizeCategory(x.category, x.note)
      map[cat] = (map[cat] || 0) + (Number(x.amount) || 0)
    })

    return EXPENSE_CATEGORIES.map((cat) => ({
      category: cat,
      amount: map[cat] || 0,
      percentage: periodExpenses > 0 ? (((map[cat] || 0) / periodExpenses) * 100).toFixed(1) : '0.0',
    }))
  }, [filteredExpenses, periodExpenses])

  const activeCategories = useMemo(
    () =>
      categoryExpenses
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [categoryExpenses]
  )

  const allPartyRows = useMemo<PartyReportRow[]>(() => {
    return parties
      .map((p) => {
        const pReceipts = filteredReceipts.filter((r) => r.party_id === p.id)
        const pDispatches = filteredDispatches.filter((d) => d.party_id === p.id)
        const pPayments = filteredPayments.filter((py) => py.party_id === p.id)

        const totalReceivedWeight = pReceipts.reduce((s, r) => s + (Number(r.net_weight) || 0), 0)
        const totalDispatchWeight = pDispatches.reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0)
        const totalDispatchValue = pDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0)
        const received = pPayments.reduce((s, py) => s + (Number(py.amount) || 0), 0)
        const allTimeBalance = stats[p.id]?.balance || 0

        const hasActivity = totalDispatchWeight > 0 || totalDispatchValue > 0 || totalReceivedWeight > 0

        return {
          party: p,
          totalReceivedWeight,
          totalDispatchWeight,
          totalDispatchValue,
          received,
          balance: allTimeBalance,
          periodNet: totalDispatchValue - received,
          hasActivity,
        }
      })
      .sort((a, b) => {
        if (a.hasActivity && !b.hasActivity) return -1
        if (!a.hasActivity && b.hasActivity) return 1
        return (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0)
      })
  }, [parties, filteredReceipts, filteredDispatches, filteredPayments, stats])

  const activePartiesCount = useMemo(
    () => allPartyRows.filter((p) => p.hasActivity).length,
    [allPartyRows]
  )

  return {
    filteredReceipts,
    filteredDispatches,
    filteredExpenses,
    filteredPayments,
    periodReceived,
    periodDispatched,
    periodExpenses,
    periodRevenue,
    periodProfit,
    profitMargin,
    categoryExpenses,
    activeCategories,
    allPartyRows,
    activePartiesCount,
  }
}
