import { useMemo } from 'react'
import { useMonth } from '@/context/MonthContext'
import { useData } from '@/hooks/useData'
import { fmtDate } from '@/utils/date'
import type { Party } from '@/features/parties/types/party.types'
import type { PaymentWithParty } from '@/features/billing/types/billing.types'

export interface PartyBalanceItem {
  party: Party
  receivable: number
  received: number
  balance: number
}

export function useBillingMetrics(searchQuery = '') {
  const { filterByMonth } = useMonth()
  const { parties, payments, dispatches, partyStats } = useData()

  const partyBalances = useMemo<PartyBalanceItem[]>(() => {
    return parties
      .map((p) => {
        const pStats = partyStats[p.id]
        const receivable = pStats?.receivable || 0
        const received = pStats?.received || 0
        const balance = pStats?.balance || 0
        return {
          party: p,
          receivable,
          received,
          balance,
        }
      })
      .filter((r) => r.receivable > 0 || r.received > 0)
  }, [parties, partyStats])

  const filteredPayments = useMemo<PaymentWithParty[]>(
    () => filterByMonth(payments),
    [filterByMonth, payments]
  )

  const monthCollectedTotal = useMemo(
    () => filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filteredPayments]
  )

  const filteredDispatches = useMemo(
    () => filterByMonth(dispatches),
    [filterByMonth, dispatches]
  )

  const monthBilledTotal = useMemo(
    () => filteredDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [filteredDispatches]
  )

  const totalOutstanding = useMemo(() => {
    return partyBalances.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0)
  }, [partyBalances])

  const filteredPaymentsList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredPayments
    return filteredPayments.filter((p) => {
      const partyMatch = p.party?.name ? p.party.name.toLowerCase().includes(q) : false
      const noteMatch = p.note ? p.note.toLowerCase().includes(q) : false
      const dateMatch = fmtDate(p.date).toLowerCase().includes(q)
      const amtMatch = String(p.amount).includes(q)
      return partyMatch || noteMatch || dateMatch || amtMatch
    })
  }, [filteredPayments, searchQuery])

  const totalReceivedFiltered = useMemo(() => {
    return filteredPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [filteredPaymentsList])

  return {
    partyBalances,
    filteredPayments,
    monthCollectedTotal,
    filteredDispatches,
    monthBilledTotal,
    totalOutstanding,
    filteredPaymentsList,
    totalReceivedFiltered,
  }
}
