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

