import { supabase } from './supabase'
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
} from '../types'

// ── Parties ───────────────────────────────────────────────────────────────────

export async function fetchParties(): Promise<Party[]> {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function insertParty(
  payload: Pick<Party, 'name' | 'phone' | 'address' | 'notes'>
): Promise<Party> {
  const { data, error } = await supabase.from('parties').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateParty(
  id: string,
  payload: Partial<Pick<Party, 'name' | 'phone' | 'address' | 'notes'>>
): Promise<void> {
  const { error } = await supabase.from('parties').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteParty(id: string): Promise<void> {
  const { error } = await supabase.from('parties').delete().eq('id', id)
  if (error) throw error
}

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function fetchReceipts(): Promise<ReceiptWithParty[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, party:parties(name)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReceiptWithParty[]
}

export type ReceiptPayload = Omit<Receipt, 'id' | 'net_weight' | 'created_at'>

export async function insertReceipt(payload: ReceiptPayload): Promise<void> {
  const { error } = await supabase.from('receipts').insert(payload)
  if (error) throw error
}

export async function insertReceipts(payloads: ReceiptPayload[]): Promise<void> {
  if (!payloads.length) return
  const { error } = await supabase.from('receipts').insert(payloads)
  if (error) throw error
}

export async function updateReceipt(
  id: string,
  payload: ReceiptPayload
): Promise<void> {
  const { error } = await supabase.from('receipts').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteReceipt(id: string): Promise<void> {
  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) throw error
}

// ── Production Orders ─────────────────────────────────────────────────────────

export type ProductionOrderPayload = Omit<ProductionOrder, 'id' | 'created_at'>

export async function fetchProductionOrders(): Promise<ProductionWithReceipt[]> {
  const { data, error } = await supabase
    .from('production_orders')
    .select('*, receipt:receipts(date, net_weight, color, challan_no, party:parties(name))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProductionWithReceipt[]
}

export async function insertProductionOrder(
  payload: ProductionOrderPayload
): Promise<void> {
  const { error } = await supabase.from('production_orders').insert(payload)
  if (error) throw error
}

export async function updateProductionOrder(
  id: string,
  payload: ProductionOrderPayload
): Promise<void> {
  const { error } = await supabase
    .from('production_orders')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteProductionOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('production_orders')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Dispatches ────────────────────────────────────────────────────────────────

export type DispatchPayload = Omit<Dispatch, 'id' | 'created_at'>

export async function fetchDispatches(): Promise<DispatchWithParty[]> {
  const { data, error } = await supabase
    .from('dispatches')
    .select('*, party:parties(name)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as DispatchWithParty[]
}

export async function insertDispatch(payload: DispatchPayload): Promise<void> {
  const { error } = await supabase.from('dispatches').insert(payload)
  if (error) throw error
}

export async function updateDispatch(
  id: string,
  payload: DispatchPayload
): Promise<void> {
  const { error } = await supabase
    .from('dispatches')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteDispatch(id: string): Promise<void> {
  const { error } = await supabase.from('dispatches').delete().eq('id', id)
  if (error) throw error
}

// ── Rola Returns ──────────────────────────────────────────────────────────────

export type RolaReturnPayload = Omit<RolaReturn, 'id' | 'created_at'>

export async function fetchRolaReturns(): Promise<RolaReturnWithParty[]> {
  const { data, error } = await supabase
    .from('rola_returns')
    .select('*, party:parties(name)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as RolaReturnWithParty[]
}

export async function insertRolaReturn(payload: RolaReturnPayload): Promise<void> {
  const { error } = await supabase.from('rola_returns').insert(payload)
  if (error) throw error
}

export async function updateRolaReturn(
  id: string,
  payload: RolaReturnPayload
): Promise<void> {
  const { error } = await supabase
    .from('rola_returns')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteRolaReturn(id: string): Promise<void> {
  const { error } = await supabase.from('rola_returns').delete().eq('id', id)
  if (error) throw error
}

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

// ── Expenses ──────────────────────────────────────────────────────────────────

export type ExpensePayload = Omit<Expense, 'id' | 'created_at'>

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertExpense(payload: ExpensePayload): Promise<void> {
  const { error } = await supabase.from('expenses').insert(payload)
  if (error) throw error
}

export async function updateExpense(
  id: string,
  payload: ExpensePayload
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ── Derived stats & aggregate helper ──────────────────────────────────────────

export function computePartyStats(
  parties: Party[],
  receipts: Receipt[],
  rolaReturns: RolaReturn[],
  dispatches: Dispatch[],
  payments: Payment[]
): Record<string, PartyStats> {
  const stats: Record<string, PartyStats> = {}

  for (const p of parties) {
    const rolaReceived = receipts
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const rolaReturned = rolaReturns
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const partyDispatches = dispatches.filter((d) => d.party_id === p.id)
    const totalDispatchWeight = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.net_val_weight) || 0),
      0
    )
    const totalDispatchValue = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    )

    const received = payments
      .filter((pay) => pay.party_id === p.id)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0)

    stats[p.id] = {
      rolaPending: rolaReceived - rolaReturned,
      receivable: totalDispatchValue,
      received,
      balance: totalDispatchValue - received,
      totalDispatchWeight,
      totalDispatchValue,
    }
  }

  return stats
}
