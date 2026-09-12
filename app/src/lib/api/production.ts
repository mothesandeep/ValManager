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

