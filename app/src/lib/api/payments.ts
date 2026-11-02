import { supabase } from '../supabase'
import type { Payment, PaymentWithParty } from '@/features/billing/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

import { emitDataChange } from '../events'
import { db } from '../offline/db'

// ── Payments ──────────────────────────────────────────────────────────────────

export type PaymentPayload = Omit<Payment, 'id' | 'created_at'>

export async function fetchPayments(): Promise<PaymentWithParty[]> {
  let serverData: PaymentWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as PaymentWithParty[]
    void setCachedData('cachedPayments', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch payments from server, falling back to local cache:', err)
    serverData = await getCachedData<PaymentWithParty>('cachedPayments')
  }

  const pending = await getPendingMutations<PaymentWithParty>('payments')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertPayment(payload: PaymentPayload, customId?: string): Promise<void> {
  const id = customId || crypto.randomUUID()
  const paymentData: Payment = { ...payload, id, created_at: new Date().toISOString() }

  // Immediately mirror to local cache
  void db.cachedPayments.put(paymentData).catch(() => {})
  emitDataChange('payments', 'INSERT', id)

  if (!navigator.onLine) {
    await enqueueMutation('payments', 'INSERT', id, paymentData)
    return
  }

  try {
    const { error } = await supabase.from('payments').insert(paymentData)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('payments', 'INSERT', id, paymentData)
      return
    }
    throw err
  }
}

export const recordPayment = insertPayment

export async function updatePayment(
  id: string,
  payload: PaymentPayload
): Promise<void> {
  // Immediately mirror to local cache
  void db.cachedPayments.update(id, payload).catch(() => {})
  emitDataChange('payments', 'UPDATE', id)

  if (!navigator.onLine) {
    await enqueueMutation('payments', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('payments')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('payments', 'UPDATE', id, payload)
      return
    }
    throw err
  }
}

export async function deletePayment(id: string): Promise<void> {
  // Immediately prune from local cache
  void db.cachedPayments.delete(id).catch(() => {})
  emitDataChange('payments', 'DELETE', id)

  if (!navigator.onLine) {
    await enqueueMutation('payments', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('payments', 'DELETE', id, null)
      return
    }
    throw err
  }
}
