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


// ── Receipts ──────────────────────────────────────────────────────────────────

export async function fetchReceipts(): Promise<ReceiptWithParty[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, party:parties(name, default_rola_weight_g)')
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


export async function updateReceiptPartyByChallan(
  challanNo: string,
  newPartyId: string,
  excludeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('receipts')
    .update({ party_id: newPartyId })
    .eq('challan_no', challanNo)
    .neq('id', excludeId)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

export async function updateReceiptDateByChallan(
  challanNo: string,
  newDate: string,
  excludeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('receipts')
    .update({ date: newDate })
    .eq('challan_no', challanNo)
    .neq('id', excludeId)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}
