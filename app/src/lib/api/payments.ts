import { supabase } from '../supabase'
import type {
  Party,
  PartyStats,
  Receipt,
  ReceiptWithParty,
  ProductionOrder,
  ProductionWithReceipt,
  DispatchWithParty,
  Dispatch,
  RolaReturn,
  RolaReturnWithParty,
  Payment,
  PaymentWithParty,
  Expense,
  GapchaSale,
  GapchaSaleWithParty,
  GapchaReconciliation,
  GapchaReconciliationWithParty,
} from '../../types'


// ── Payments ──────────────────────────────────────────────────────────────────

export type PaymentPayload = Omit<Payment, 'id' | 'created_at'>

export async function fetchPayments(): Promise<PaymentWithParty[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, party:parties(name)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as PaymentWithParty[]
}

export async function insertPayment(payload: PaymentPayload): Promise<void> {
  const { error } = await supabase.from('payments').insert(payload)
  if (error) throw error
}

export async function updatePayment(
  id: string,
  payload: PaymentPayload
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

