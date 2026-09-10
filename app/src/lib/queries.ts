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
  GapchaSale,
  GapchaSaleWithParty,
  GapchaReconciliation,
  GapchaReconciliationWithParty,
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

export type PartyPayload = {
  name: string
  phone?: string | null
  address?: string | null
  notes?: string | null
  default_rola_weight_g?: number | null
  default_bungari_weight_g?: number | null
}

export async function insertParty(
  payload: PartyPayload
): Promise<Party> {
  const { data, error } = await supabase.from('parties').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateParty(
  id: string,
  payload: Partial<PartyPayload>
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

export async function insertDispatches(payloads: DispatchPayload[]): Promise<void> {
  if (!payloads.length) return
  const { error } = await supabase.from('dispatches').insert(payloads)
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

// ── Gapcha Sales ──────────────────────────────────────────────────────────────

export type GapchaSalePayload = Omit<GapchaSale, 'id' | 'created_at'>

export async function fetchGapchaSales(): Promise<GapchaSaleWithParty[]> {
  try {
    const { data, error } = await supabase
      .from('gapcha_sales')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) {
      console.warn('fetchGapchaSales error:', error.message)
      return []
    }
    return (data ?? []) as GapchaSaleWithParty[]
  } catch (err) {
    console.warn('fetchGapchaSales exception:', err)
    return []
  }
}

export async function insertGapchaSale(payload: GapchaSalePayload): Promise<void> {
  const { error } = await supabase.from('gapcha_sales').insert(payload)
  if (error) throw error
}

export async function updateGapchaSale(
  id: string,
  payload: GapchaSalePayload
): Promise<void> {
  const { error } = await supabase
    .from('gapcha_sales')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteGapchaSale(id: string): Promise<void> {
  const { error } = await supabase.from('gapcha_sales').delete().eq('id', id)
  if (error) throw error
}

// ── Gapcha Batch Reconciliations ──────────────────────────────────────────────

export type GapchaReconciliationPayload = Omit<GapchaReconciliation, 'id' | 'created_at'>

export async function fetchReconciliations(): Promise<GapchaReconciliationWithParty[]> {
  try {
    const { data, error } = await supabase
      .from('gapcha_reconciliations')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) {
      console.warn('fetchReconciliations error:', error.message)
      return []
    }
    return (data ?? []) as GapchaReconciliationWithParty[]
  } catch (err) {
    console.warn('fetchReconciliations exception:', err)
    return []
  }
}

export async function createReconciliation(
  payload: GapchaReconciliationPayload,
  receiptIds: string[],
  dispatchIds: string[]
): Promise<void> {
  // 1. Insert reconciliation record
  const { data, error } = await supabase
    .from('gapcha_reconciliations')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  const reconId = data.id

  // 2. Link receipts
  if (receiptIds.length > 0) {
    const { error: rErr } = await supabase
      .from('receipts')
      .update({ reconciliation_id: reconId, status: 'Reconciled' })
      .in('id', receiptIds)
    if (rErr) console.warn('Error linking receipts to reconciliation:', rErr)
  }

  // 3. Link dispatches
  if (dispatchIds.length > 0) {
    const { error: dErr } = await supabase
      .from('dispatches')
      .update({ reconciliation_id: reconId })
      .in('id', dispatchIds)
    if (dErr) console.warn('Error linking dispatches to reconciliation:', dErr)
  }
}

export async function deleteReconciliation(id: string): Promise<void> {
  // 1. Unlink receipts
  await supabase
    .from('receipts')
    .update({ reconciliation_id: null, status: 'Pending' })
    .eq('reconciliation_id', id)

  // 2. Unlink dispatches
  await supabase
    .from('dispatches')
    .update({ reconciliation_id: null })
    .eq('reconciliation_id', id)

  // 3. Delete reconciliation
  const { error } = await supabase
    .from('gapcha_reconciliations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export type GapchaSurplusPayload = {
  party_id: string
  date: string
  gapcha_weight: number
  note?: string | null
}

export async function insertGapchaSurplus(payload: GapchaSurplusPayload): Promise<void> {
  const { error } = await supabase.from('gapcha_reconciliations').insert({
    party_id: payload.party_id,
    date: payload.date,
    gapcha_weight: payload.gapcha_weight,
    input_kasab_weight: 0,
    output_val_weight: 0,
    output_kali_weight: 0,
    reconciled_output: 0,
    note: payload.note || null,
  })
  if (error) throw error
}

export async function deleteGapchaSurplus(id: string): Promise<void> {
  const { error } = await supabase.from('gapcha_reconciliations').delete().eq('id', id)
  if (error) throw error
}

// ── Derived stats & aggregate helper ──────────────────────────────────────────

export function computePartyStats(
  parties: Party[],
  receipts: Receipt[],
  rolaReturns: RolaReturn[],
  dispatches: Dispatch[],
  payments: Payment[],
  gapchaSales: GapchaSale[] = [],
  reconciliations: GapchaReconciliation[] = []
): Record<string, PartyStats> {
  const stats: Record<string, PartyStats> = {}

  for (const p of parties) {
    const rolaReceived = receipts
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const rolaReturned = rolaReturns
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const partyReceipts = receipts.filter((r) => r.party_id === p.id)
    const totalReceivedWeight = partyReceipts.reduce(
      (sum, r) => sum + (Number(r.net_weight) || 0),
      0
    )

    const partyDispatches = dispatches.filter((d) => d.party_id === p.id)
    const totalDispatchWeight = partyDispatches.reduce((sum, d) => {
      const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
      const wt = isRola
        ? Number(d.bore_gross_weight) || 0
        : Number(d.net_val_weight) || 0
      return sum + wt
    }, 0)

    const partyReconciliations = reconciliations.filter((rc) => rc.party_id === p.id)
    const reconciledInputWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.input_kasab_weight) || 0),
      0
    )
    const reconciledOutputWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.reconciled_output) || 0),
      0
    )

    // Unprocessed/Outstanding material currently pending in workshop: Received - Returned
    const unprocessedKasabWeight = Math.max(
      0,
      totalReceivedWeight - totalDispatchWeight
    )

    const totalDispatchValue = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    )

    const received = payments
      .filter((pay) => pay.party_id === p.id)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0)

    // Gapcha is strictly computed from created/logged surplus records
    const gapchaWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
      0
    )

    const partyGapchaSales = gapchaSales.filter((s) => s.party_id === p.id)
    const gapchaSold = partyGapchaSales.reduce(
      (sum, s) => sum + (Number(s.weight_kg) || 0),
      0
    )

    const remainingGapcha = Math.max(0, gapchaWeight - gapchaSold)

    stats[p.id] = {
      rolaPending: rolaReceived - rolaReturned,
      receivable: totalDispatchValue,
      received,
      balance: totalDispatchValue - received,
      totalReceivedWeight,
      unprocessedKasabWeight,
      reconciledInputWeight,
      reconciledOutputWeight,
      totalDispatchWeight,
      totalDispatchValue,
      gapchaWeight,
      gapchaSold,
      remainingGapcha,
    }
  }

  return stats
}
