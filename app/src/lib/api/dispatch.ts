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


export async function updateDispatchPartyByChallan(
  challanNo: string,
  newPartyId: string,
  excludeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('dispatch')
    .update({ party_id: newPartyId })
    .eq('challan_no', challanNo)
    .neq('id', excludeId)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

export async function updateDispatchDateByChallan(
  challanNo: string,
  newDate: string,
  excludeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('dispatch')
    .update({ date: newDate })
    .eq('challan_no', challanNo)
    .neq('id', excludeId)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}
