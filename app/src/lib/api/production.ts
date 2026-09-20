import { supabase } from '../supabase'
import type {
  ProductionOrder,
  ProductionWithReceipt,
} from '../../features/production/types'


import { enqueueMutation } from '../offline/sync'
import { getPendingMutations, mergePendingMutations } from '../offline/db'

// ── Production Orders ─────────────────────────────────────────────────────────

export type ProductionOrderPayload = Omit<ProductionOrder, 'id' | 'created_at'>

export async function fetchProductionOrders(): Promise<ProductionWithReceipt[]> {
  let serverData: ProductionWithReceipt[] = []
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, receipt:receipts(date, net_weight, color, challan_no, party:parties(name))')
      .order('created_at', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as ProductionWithReceipt[]
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch production_orders')
    } else {
      throw err
    }
  }

  const pending = await getPendingMutations<ProductionWithReceipt>('production_orders')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function insertProductionOrder(
  payload: ProductionOrderPayload
): Promise<void> {
  const id = crypto.randomUUID()
  const prodData = { ...payload, id, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('production_orders', 'INSERT', id, prodData)
    return
  }

  try {
    const { error } = await supabase.from('production_orders').insert(prodData)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('production_orders', 'INSERT', id, prodData)
  }
}

export async function updateProductionOrder(
  id: string,
  payload: ProductionOrderPayload
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('production_orders', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('production_orders')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('production_orders', 'UPDATE', id, payload)
  }
}

export async function deleteProductionOrder(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('production_orders', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('production_orders', 'DELETE', id, null)
  }
}
