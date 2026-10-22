import { supabase } from '../supabase'
import type { Receipt, ReceiptWithParty } from '../../features/receiving/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function fetchReceipts(): Promise<ReceiptWithParty[]> {
  let serverData: ReceiptWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*, party:parties(name, default_rola_weight_g)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as ReceiptWithParty[]
    void setCachedData('cachedReceipts', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch receipts from server, falling back to local cache:', err)
    serverData = await getCachedData<ReceiptWithParty>('cachedReceipts')
  }

  const pending = await getPendingMutations<ReceiptWithParty>('receipts')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export type ReceiptPayload = Omit<Receipt, 'id' | 'net_weight' | 'created_at'>

export async function insertReceipt(payload: ReceiptPayload): Promise<void> {
  const id = crypto.randomUUID()
  const net_weight = payload.gross_weight - payload.tare_weight
  const receiptData = { ...payload, id, net_weight, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'INSERT', id, receiptData)
    return
  }

  try {
    const { error } = await supabase.from('receipts').insert(receiptData)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'INSERT', id, receiptData)
      return
    }
    throw err
  }
}

export async function insertReceipts(payloads: ReceiptPayload[]): Promise<void> {
  if (!payloads.length) return
  for (const payload of payloads) {
    await insertReceipt(payload)
  }
}

export async function updateReceipt(
  id: string,
  payload: ReceiptPayload
): Promise<void> {
  const net_weight = payload.gross_weight - payload.tare_weight
  const updateData = { ...payload, net_weight }

  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'UPDATE', id, updateData)
    return
  }

  try {
    const { error } = await supabase.from('receipts').update(updateData).eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'UPDATE', id, updateData)
      return
    }
    throw err
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('receipts').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'DELETE', id, null)
      return
    }
    throw err
  }
}

export async function updateReceiptPartyByChallan(
  challanNo: string,
  newPartyId: string,
  excludeId: string
): Promise<number> {
  // Not fully offline-capable because it requires filtering by challan_no, 
  // but this is an edge case helper mostly used during online ops.
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
