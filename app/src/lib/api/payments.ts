import { supabase } from '../supabase'
import type { Payment, PaymentWithParty } from '../../features/payments/types'


import { enqueueMutation } from '../offline/sync'
import { getPendingMutations, mergePendingMutations } from '../offline/db'

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
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch payments')
    } else {
      throw err
    }
  }

  const pending = await getPendingMutations<PaymentWithParty>('payments')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertPayment(payload: PaymentPayload): Promise<void> {
  const id = crypto.randomUUID()
  const paymentData = { ...payload, id, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('payments', 'INSERT', id, paymentData)
    return
  }

  try {
    const { error } = await supabase.from('payments').insert(paymentData)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('payments', 'INSERT', id, paymentData)
  }
}

export async function updatePayment(
  id: string,
  payload: PaymentPayload
): Promise<void> {
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
    await enqueueMutation('payments', 'UPDATE', id, payload)
  }
}

export async function deletePayment(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('payments', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('payments', 'DELETE', id, null)
  }
}
