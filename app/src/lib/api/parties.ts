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

