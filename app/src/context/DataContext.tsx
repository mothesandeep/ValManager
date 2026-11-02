import React, { createContext, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import type { Party, PartyStats } from '../features/parties/types'
import type { ReceiptWithParty } from '@/features/inward/types'
import type { DispatchWithParty } from '@/features/outward/types'
import type { PaymentWithParty } from '@/features/billing/types'
import type { Expense } from '../features/expenses/types'

import { fetchParties, deleteParty } from '../lib/api/parties'
import { fetchReceipts, deleteReceipt, deleteReceipts } from '../lib/api/receipts'
import { fetchDispatches, deleteDispatch, deleteDispatches } from '../lib/api/dispatch'
import { fetchPayments, deletePayment } from '../lib/api/payments'
import { fetchExpenses, deleteExpense } from '../lib/api/expenses'
import { computePartyStats } from '../lib/api/stats'
import { dataEventEmitter, type DataChangeEvent } from '../lib/events'
import { getCachedData } from '../lib/offline/db'

export interface DataContextValue {
  parties: Party[]
  receipts: ReceiptWithParty[]
  dispatches: DispatchWithParty[]
  payments: PaymentWithParty[]
  expenses: Expense[]
  partyStats: Record<string, PartyStats>
  isLoading: boolean
  loading: boolean
  error: string | null
  refreshData: (tables?: ('parties' | 'receipts' | 'dispatches' | 'payments' | 'expenses')[]) => Promise<void>
  removeReceipt: (id: string) => Promise<void>
  removeReceipts: (ids: string[]) => Promise<void>
  removeDispatch: (id: string) => Promise<void>
  removeDispatches: (ids: string[]) => Promise<void>
  removePayment: (id: string) => Promise<void>
  removeExpense: (id: string) => Promise<void>
  removeParty: (id: string) => Promise<void>
}

export const DataContext = createContext<DataContextValue | null>(null)

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [payments, setPayments] = useState<PaymentWithParty[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tombstones to prevent background server re-fetches from resurrecting optimistically deleted items
  const tombstonedDispatchIds = useRef<Set<string>>(new Set())
  const tombstonedReceiptIds = useRef<Set<string>>(new Set())

  // Real-time recalculation of all party ledger balances & inventory weights
  const partyStats = useMemo(() => {
    return computePartyStats(parties, receipts, dispatches, payments)
  }, [parties, receipts, dispatches, payments])

  const loadAll = useCallback(async () => {
    try {
      setError(null)
      const [p, r, d, py, e] = await Promise.all([
        fetchParties(),
        fetchReceipts(),
        fetchDispatches(),
        fetchPayments(),
        fetchExpenses(),
      ])
      setParties(p)
      setReceipts(
        tombstonedReceiptIds.current.size > 0
          ? r.filter((item) => !tombstonedReceiptIds.current.has(item.id))
          : r
      )
      setDispatches(
        tombstonedDispatchIds.current.size > 0
          ? d.filter((item) => !tombstonedDispatchIds.current.has(item.id))
          : d
      )
      setPayments(py)
      setExpenses(e)
    } catch (err: unknown) {
      console.error('[DataContext] Error loading global store:', err)
      const msg = err instanceof Error ? err.message : 'Failed to load app data'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshData = useCallback(
    async (tables?: ('parties' | 'receipts' | 'dispatches' | 'payments' | 'expenses')[]) => {
      if (!tables || tables.length === 0) {
        await loadAll()
        return
      }

      const tasks: Promise<void>[] = []
      if (tables.includes('parties')) {
        tasks.push(fetchParties().then((data) => setParties(data)))
      }
      if (tables.includes('receipts')) {
        tasks.push(
          fetchReceipts().then((data) => {
            const filtered =
              tombstonedReceiptIds.current.size > 0
                ? data.filter((r) => !tombstonedReceiptIds.current.has(r.id))
                : data
            setReceipts(filtered)
          })
        )
      }
      if (tables.includes('dispatches')) {
        tasks.push(
          fetchDispatches().then((data) => {
            const filtered =
              tombstonedDispatchIds.current.size > 0
                ? data.filter((d) => !tombstonedDispatchIds.current.has(d.id))
                : data
            setDispatches(filtered)
          })
        )
      }
      if (tables.includes('payments')) {
        tasks.push(fetchPayments().then((data) => setPayments(data)))
      }
      if (tables.includes('expenses')) {
        tasks.push(fetchExpenses().then((data) => setExpenses(data)))
      }

      try {
        await Promise.all(tasks)
      } catch (err) {
        console.warn('[DataContext] Partial refresh error:', err)
      }
    },
    [loadAll]
  )

  // Optimistic Mutations with Automatic Rollback
  const removeReceipt = useCallback(
    async (id: string) => {
      tombstonedReceiptIds.current.add(id)
      const backup = receipts
      setReceipts((prev) => prev.filter((r) => r.id !== id))
      try {
        await deleteReceipt(id)
        setTimeout(() => {
          tombstonedReceiptIds.current.delete(id)
        }, 5000)
      } catch (err) {
        tombstonedReceiptIds.current.delete(id)
        setReceipts(backup)
        throw err
      }
    },
    [receipts]
  )

  const removeReceipts = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      const idSet = new Set(ids)
      ids.forEach((id) => tombstonedReceiptIds.current.add(id))
      const backup = receipts
      setReceipts((prev) => prev.filter((r) => !idSet.has(r.id)))
      try {
        await deleteReceipts(ids)
        setTimeout(() => {
          ids.forEach((id) => tombstonedReceiptIds.current.delete(id))
        }, 5000)
      } catch (err) {
        ids.forEach((id) => tombstonedReceiptIds.current.delete(id))
        setReceipts(backup)
        throw err
      }
    },
    [receipts]
  )

  const removeDispatch = useCallback(
    async (id: string) => {
      tombstonedDispatchIds.current.add(id)
      const backup = dispatches
      setDispatches((prev) => prev.filter((d) => d.id !== id))
      try {
        await deleteDispatch(id)
        setTimeout(() => {
          tombstonedDispatchIds.current.delete(id)
        }, 5000)
      } catch (err) {
        tombstonedDispatchIds.current.delete(id)
        setDispatches(backup)
        throw err
      }
    },
    [dispatches]
  )

  const removeDispatches = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      const idSet = new Set(ids)
      ids.forEach((id) => tombstonedDispatchIds.current.add(id))
      const backup = dispatches
      setDispatches((prev) => prev.filter((d) => !idSet.has(d.id)))
      try {
        await deleteDispatches(ids)
        setTimeout(() => {
          ids.forEach((id) => tombstonedDispatchIds.current.delete(id))
        }, 5000)
      } catch (err) {
        ids.forEach((id) => tombstonedDispatchIds.current.delete(id))
        setDispatches(backup)
        throw err
      }
    },
    [dispatches]
  )

  const removePayment = useCallback(
    async (id: string) => {
      const backup = payments
      setPayments((prev) => prev.filter((p) => p.id !== id))
      try {
        await deletePayment(id)
      } catch (err) {
        setPayments(backup)
        throw err
      }
    },
    [payments]
  )

  const removeExpense = useCallback(
    async (id: string) => {
      const backup = expenses
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      try {
        await deleteExpense(id)
      } catch (err) {
        setExpenses(backup)
        throw err
      }
    },
    [expenses]
  )

  const removeParty = useCallback(
    async (id: string) => {
      const backup = parties
      setParties((prev) => prev.filter((p) => p.id !== id))
      try {
        await deleteParty(id)
      } catch (err) {
        setParties(backup)
        throw err
      }
    },
    [parties]
  )

  // Initial load: Hydrate from local offline cache first for zero-flash render, then fetch fresh data
  useEffect(() => {
    Promise.all([
      getCachedData<Party>('cachedParties'),
      getCachedData<ReceiptWithParty>('cachedReceipts'),
      getCachedData<DispatchWithParty>('cachedDispatches'),
      getCachedData<PaymentWithParty>('cachedPayments'),
      getCachedData<Expense>('cachedExpenses'),
    ]).then(([p, r, d, py, e]) => {
      if (p.length > 0) setParties((prev) => (prev.length === 0 ? p : prev))
      if (r.length > 0) setReceipts((prev) => (prev.length === 0 ? r : prev))
      if (d.length > 0) setDispatches((prev) => (prev.length === 0 ? d : prev))
      if (py.length > 0) setPayments((prev) => (prev.length === 0 ? py : prev))
      if (e.length > 0) setExpenses((prev) => (prev.length === 0 ? e : prev))
      if (p.length > 0 || r.length > 0 || d.length > 0) {
        setIsLoading(false)
      }
    }).catch(() => {})

    void loadAll()
  }, [loadAll])

  // React to cross-module data change events (including background sync flush)
  useEffect(() => {
    const handleDataChange = (event: Event) => {
      const customEvent = event as CustomEvent<DataChangeEvent>
      const detail = customEvent.detail
      if (!detail) return

      if (detail.action === 'DELETE' && detail.id) {
        if (detail.table === 'dispatches') {
          tombstonedDispatchIds.current.add(detail.id)
          setDispatches((prev) => prev.filter((d) => d.id !== detail.id))
          return
        }
        if (detail.table === 'receipts') {
          tombstonedReceiptIds.current.add(detail.id)
          setReceipts((prev) => prev.filter((r) => r.id !== detail.id))
          return
        }
      }

      if (detail.table === '*') {
        void loadAll()
      } else {
        void refreshData([detail.table as 'parties' | 'receipts' | 'dispatches' | 'payments' | 'expenses'])
      }
    }

    dataEventEmitter.addEventListener('data-change', handleDataChange)
    return () => {
      dataEventEmitter.removeEventListener('data-change', handleDataChange)
    }
  }, [loadAll, refreshData])

  const contextValue: DataContextValue = useMemo(
    () => ({
      parties,
      receipts,
      dispatches,
      payments,
      expenses,
      partyStats,
      isLoading,
      loading: isLoading,
      error,
      refreshData,
      removeReceipt,
      removeReceipts,
      removeDispatch,
      removeDispatches,
      removePayment,
      removeExpense,
      removeParty,
    }),
    [
      parties,
      receipts,
      dispatches,
      payments,
      expenses,
      partyStats,
      isLoading,
      error,
      refreshData,
      removeReceipt,
      removeReceipts,
      removeDispatch,
      removeDispatches,
      removePayment,
      removeExpense,
      removeParty,
    ]
  )

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
}
