import { supabase } from '../supabase'
import type { Expense } from '../../features/expenses/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

import { emitDataChange } from '../events'
import { db } from '../offline/db'

// ── Expenses ──────────────────────────────────────────────────────────────────

export type ExpensePayload = Omit<Expense, 'id' | 'created_at'>

export async function fetchExpenses(): Promise<Expense[]> {
  let serverData: Expense[] = []
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = data ?? []
    void setCachedData('cachedExpenses', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch expenses from server, falling back to local cache:', err)
    serverData = await getCachedData<Expense>('cachedExpenses')
  }

  const pending = await getPendingMutations<Expense>('expenses')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertExpense(payload: ExpensePayload): Promise<void> {
  const id = crypto.randomUUID()
  const expenseData: Expense = { ...payload, id, created_at: new Date().toISOString() }

  // Immediately mirror to local cache
  void db.cachedExpenses.put(expenseData).catch(() => {})
  emitDataChange('expenses', 'INSERT', id)

  if (!navigator.onLine) {
    await enqueueMutation('expenses', 'INSERT', id, expenseData)
    return
  }

  try {
    const { error } = await supabase.from('expenses').insert(expenseData)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('expenses', 'INSERT', id, expenseData)
      return
    }
    throw err
  }
}

export const recordExpense = insertExpense

export async function updateExpense(
  id: string,
  payload: ExpensePayload
): Promise<void> {
  // Immediately mirror to local cache
  void db.cachedExpenses.update(id, payload).catch(() => {})
  emitDataChange('expenses', 'UPDATE', id)

  if (!navigator.onLine) {
    await enqueueMutation('expenses', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('expenses', 'UPDATE', id, payload)
      return
    }
    throw err
  }
}

export async function deleteExpense(id: string): Promise<void> {
  // Immediately prune from local cache
  void db.cachedExpenses.delete(id).catch(() => {})
  emitDataChange('expenses', 'DELETE', id)

  if (!navigator.onLine) {
    await enqueueMutation('expenses', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('expenses', 'DELETE', id, null)
      return
    }
    throw err
  }
}
