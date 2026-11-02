import { useMemo } from 'react'
import { useMonth } from '@/context/MonthContext'
import { useData } from '@/hooks/useData'
import type { ReceiptWithParty } from '@/features/inward/types/inward.types'
import type { DispatchWithParty } from '@/features/outward/types/outward.types'
import { isRolaEntry } from '@/utils/calculations'

export type ReceiptGroup = {
  key: string
  challanNo: string | null
  date: string
  partyId: string | null
  partyName: string
  entries: ReceiptWithParty[]
  totalNet: number
  totalRolaCount: number
}

export type ChallanGroup = {
  key: string
  challanNo: string | null
  date: string
  partyId: string | null
  partyName: string
  entries: DispatchWithParty[]
  totalGross: number
  totalNet: number
  totalValNet: number
  totalRolaGross: number
  totalRolaCount: number
  totalAmount: number
  hasVal: boolean
  hasRola: boolean
}

export function useDashboardMetrics() {
  const { filterByMonth, isAllTime, formattedMonth, setAllTime } = useMonth()
  const { parties, receipts, dispatches, expenses, partyStats: stats, isLoading: loading, refreshData } = useData()

  const totalDue = useMemo(
    () =>
      Object.values(stats).reduce(
        (sum, x) => sum + (x.balance > 0 ? x.balance : 0),
        0
      ),
    [stats]
  )

  const rolaPending = useMemo(
    () =>
      Object.values(stats).reduce(
        (sum, x) => sum + (x.rolaPending > 0 ? x.rolaPending : 0),
        0
      ),
    [stats]
  )

  const monthExpenses = useMemo(
    () =>
      filterByMonth(expenses).reduce(
        (sum, x) => sum + (Number(x.amount) || 0),
        0
      ),
    [filterByMonth, expenses]
  )

  const monthDispatches = useMemo(
    () => filterByMonth(dispatches),
    [filterByMonth, dispatches]
  )

  const monthDispatchNet = useMemo(
    () =>
      monthDispatches.reduce(
        (sum, d) => sum + (Number(d.net_val_weight) || 0),
        0
      ),
    [monthDispatches]
  )

  const monthReceipts = useMemo(
    () => filterByMonth(receipts),
    [filterByMonth, receipts]
  )

  const monthReceivedNet = useMemo(
    () =>
      monthReceipts.reduce((sum, r) => sum + (Number(r.net_weight) || 0), 0),
    [monthReceipts]
  )

  const monthRevenue = useMemo(
    () =>
      monthDispatches.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [monthDispatches]
  )

  const recentChallanGroups = useMemo((): ChallanGroup[] => {
    const grouped: Map<string, DispatchWithParty[]> = new Map()
    for (const d of monthDispatches) {
      const key = d.challan_no
        ? `ch:${d.challan_no}:${d.party_id}`
        : `id:${d.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }

    const list = Array.from(grouped.entries()).map(([key, rawEntries]) => {
      const entries = [...rawEntries].sort((a, b) => {
        const aIsRola = isRolaEntry(a) ? 1 : 0
        const bIsRola = isRolaEntry(b) ? 1 : 0
        return aIsRola - bIsRola
      })
      const first = entries[0]
      const totalGross = entries.reduce((s, e) => s + (Number(e.bore_gross_weight) || 0), 0)
      const totalValNet = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (!isR ? (Number(e.net_val_weight) || 0) : 0)
      }, 0)
      const totalRolaGross = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.bore_gross_weight) || 0) : 0)
      }, 0)
      const totalRolaCount = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.rola_count) || 0) : 0)
      }, 0)
      const totalNet = totalValNet + totalRolaGross
      const totalAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id,
        partyName: first.party?.name ?? '—',
        entries,
        totalGross,
        totalNet,
        totalValNet,
        totalRolaGross,
        totalRolaCount,
        totalAmount,
        hasVal: entries.some((e) => !isRolaEntry(e)),
        hasRola: entries.some((e) => isRolaEntry(e)),
      }
    })

    return list
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  }, [monthDispatches])

  const recentReceiptGroups = useMemo((): ReceiptGroup[] => {
    const grouped: Map<string, ReceiptWithParty[]> = new Map()
    for (const r of monthReceipts) {
      const key = r.challan_no
        ? `ch:${r.challan_no}:${r.party_id}`
        : `id:${r.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }

    const list = Array.from(grouped.entries()).map(([key, rawEntries]) => {
      const entries = [...rawEntries]
      const first = entries[0]
      const totalNet = entries.reduce((s, e) => s + (Number(e.net_weight) || 0), 0)
      const totalRolaCount = entries.reduce((s, e) => s + (Number(e.rola_count) || 0), 0)
      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id,
        partyName: first.party?.name ?? '—',
        entries,
        totalNet,
        totalRolaCount,
      }
    })

    return list
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  }, [monthReceipts])

  return {
    parties,
    receipts,
    dispatches,
    expenses,
    stats,
    loading,
    refreshData,
    filterByMonth,
    isAllTime,
    formattedMonth,
    setAllTime,
    totalDue,
    rolaPending,
    monthExpenses,
    monthDispatches,
    monthDispatchNet,
    monthReceipts,
    monthReceivedNet,
    monthRevenue,
    recentChallanGroups,
    recentReceiptGroups,
  }
}
