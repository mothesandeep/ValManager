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

