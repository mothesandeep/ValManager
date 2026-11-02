import { supabase } from '../supabase'
import type { Receipt, ReceiptWithParty } from '@/features/inward/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { db, getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

import { emitDataChange } from '../events'

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function fetchReceipts(): Promise<ReceiptWithParty[]> {
  let serverData: ReceiptWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*, party:parties(name, default_rola_weight_g)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = ((data ?? []) as ReceiptWithParty[]).map((r) => ({
      ...r,
      net_weight: r.net_weight !== null && r.net_weight !== undefined
        ? Number(r.net_weight)
        : Number(((Number(r.gross_weight) || 0) - (Number(r.tare_weight) || 0)).toFixed(3)),
    }))
    void setCachedData('cachedReceipts', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch receipts from server, falling back to local cache:', err)
    serverData = await getCachedData<ReceiptWithParty>('cachedReceipts')
  }

  const pending = await getPendingMutations<ReceiptWithParty>('receipts')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export type ReceiptPayload = Omit<Receipt, 'id' | 'net_weight' | 'created_at'>

export const VALID_RECEIPT_COLUMNS = new Set([
  'id',
  'party_id',
  'date',
  'color',
  'gross_weight',
  'tare_weight',
  'net_weight',
  'challan_no',
  'rola_count',
  'status',
  'reconciliation_id',
  'created_at',
  'updated_at',
])

export function sanitizeReceiptForServer(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data)) {
    if (VALID_RECEIPT_COLUMNS.has(key) && val !== undefined) {
      clean[key] = val
    }
  }
  return clean
}

export async function insertReceipt(payload: ReceiptPayload): Promise<void> {
  const id = crypto.randomUUID()
  const net_weight = Number(((Number(payload.gross_weight) || 0) - (Number(payload.tare_weight) || 0)).toFixed(3))
  const receiptData: Receipt = { ...payload, id, net_weight, created_at: new Date().toISOString() }

  // Immediately mirror to local cache
  void db.cachedReceipts.put(receiptData).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'INSERT', id, receiptData)
    emitDataChange('receipts', 'INSERT', id)
    return
  }

  try {
    const serverPayload = sanitizeReceiptForServer({
      ...receiptData,
      net_weight: receiptData.net_weight ?? net_weight,
    } as unknown as Record<string, unknown>)

    const { error } = await supabase.from('receipts').insert(serverPayload)
    if (error) throw error
    emitDataChange('receipts', 'INSERT', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'INSERT', id, receiptData)
      emitDataChange('receipts', 'INSERT', id)
      return
    }
    throw err
  }
}

export async function insertReceipts(payloads: ReceiptPayload[]): Promise<void> {
  if (!payloads.length) return

  const now = new Date().toISOString()
  const receiptsData: Receipt[] = payloads.map((payload) => {
    const id = crypto.randomUUID()
    const net_weight = Number(((Number(payload.gross_weight) || 0) - (Number(payload.tare_weight) || 0)).toFixed(3))
    return { ...payload, id, net_weight, created_at: now }
  })

  // Immediately mirror all to local cache
  await Promise.all(receiptsData.map((r) => db.cachedReceipts.put(r).catch(() => {})))

  if (!navigator.onLine) {
    for (const r of receiptsData) {
      await enqueueMutation('receipts', 'INSERT', r.id, r)
    }
    emitDataChange('receipts', 'INSERT', receiptsData[0].id)
    return
  }

  try {
    const serverPayloads = receiptsData.map((r) =>
      sanitizeReceiptForServer({
        ...r,
        net_weight: r.net_weight,
      } as unknown as Record<string, unknown>)
    )

    const { error } = await supabase.from('receipts').insert(serverPayloads)
    if (error) throw error
    for (const r of receiptsData) {
      emitDataChange('receipts', 'INSERT', r.id)
    }
  } catch (err) {
    if (isNetworkError(err)) {
      for (const r of receiptsData) {
        await enqueueMutation('receipts', 'INSERT', r.id, r)
      }
      emitDataChange('receipts', 'INSERT', receiptsData[0].id)
      return
    }
    throw err
  }
}

export async function updateReceipt(
  id: string,
  payload: ReceiptPayload
): Promise<void> {
  const net_weight = Number(((Number(payload.gross_weight) || 0) - (Number(payload.tare_weight) || 0)).toFixed(3))
  const updateData = { ...payload, net_weight }

  // Immediately mirror to local cache
  void db.cachedReceipts.update(id, updateData).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'UPDATE', id, updateData)
    emitDataChange('receipts', 'UPDATE', id)
    return
  }

  try {
    const serverUpdate = sanitizeReceiptForServer({
      ...updateData,
      net_weight,
    } as unknown as Record<string, unknown>)

    const { error } = await supabase
      .from('receipts')
      .update(serverUpdate)
      .eq('id', id)
    if (error) throw error
    emitDataChange('receipts', 'UPDATE', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'UPDATE', id, updateData)
      emitDataChange('receipts', 'UPDATE', id)
      return
    }
    throw err
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  // Immediately prune from local cache
  void db.cachedReceipts.delete(id).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('receipts', 'DELETE', id, null)
    emitDataChange('receipts', 'DELETE', id)
    return
  }

  try {
    const { error } = await supabase.from('receipts').delete().eq('id', id)
    if (error) throw error
    emitDataChange('receipts', 'DELETE', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('receipts', 'DELETE', id, null)
      emitDataChange('receipts', 'DELETE', id)
      return
    }
    throw err
  }
}

export async function deleteReceipts(ids: string[]): Promise<void> {
  if (!ids.length) return

  // Prune from local cache
  void Promise.all(ids.map((id) => db.cachedReceipts.delete(id))).catch(() => {})

  if (!navigator.onLine) {
    for (const id of ids) {
      await enqueueMutation('receipts', 'DELETE', id, null)
      emitDataChange('receipts', 'DELETE', id)
    }
    return
  }

  try {
    const { error } = await supabase.from('receipts').delete().in('id', ids)
    if (error) throw error
    for (const id of ids) {
      emitDataChange('receipts', 'DELETE', id)
    }
  } catch (err) {
    if (isNetworkError(err)) {
      for (const id of ids) {
        await enqueueMutation('receipts', 'DELETE', id, null)
        emitDataChange('receipts', 'DELETE', id)
      }
      return
    }
    throw err
  }
}

export async function updateReceiptPartyByChallan(
  challanNo: string,
  newPartyId: string,
  excludeId: string,
  previousPartyId?: string | null
): Promise<number> {
  const cleanChallan = challanNo.trim()
  if (!cleanChallan) return 0

  // 1. Immediately update Dexie cached receipts
  const localSiblings = await db.cachedReceipts
    .filter((r) => {
      const matchParty = previousPartyId ? r.party_id === previousPartyId : true
      return matchParty && (r.challan_no?.trim() || '') === cleanChallan && r.id !== excludeId
    })
    .toArray()

  for (const sibling of localSiblings) {
    await db.cachedReceipts.update(sibling.id, { party_id: newPartyId }).catch(() => {})
  }

  // 2. If offline, enqueue updates
  if (!navigator.onLine) {
    for (const sibling of localSiblings) {
      await enqueueMutation('receipts', 'UPDATE', sibling.id, { party_id: newPartyId })
      emitDataChange('receipts', 'UPDATE', sibling.id)
    }
    return localSiblings.length
  }

  // 3. Online: filter strictly by both challan_no AND previous party_id
  try {
    let query = supabase
      .from('receipts')
      .update({ party_id: newPartyId })
      .eq('challan_no', cleanChallan)
      .neq('id', excludeId)
    if (previousPartyId) {
      query = query.eq('party_id', previousPartyId)
    }
    const { data, error } = await query.select('id')
    if (error) throw error
    const count = data?.length ?? localSiblings.length
    for (const item of data ?? localSiblings) {
      emitDataChange('receipts', 'UPDATE', item.id)
    }
    return count
  } catch (err) {
    if (isNetworkError(err)) {
      for (const sibling of localSiblings) {
        await enqueueMutation('receipts', 'UPDATE', sibling.id, { party_id: newPartyId })
        emitDataChange('receipts', 'UPDATE', sibling.id)
      }
      return localSiblings.length
    }
    throw err
  }
}

export async function updateReceiptDateByChallan(
  challanNo: string,
  newDate: string,
  excludeId: string,
  partyId?: string | null
): Promise<number> {
  const cleanChallan = challanNo.trim()
  if (!cleanChallan) return 0

  // 1. Immediately update Dexie cached receipts
  const localSiblings = await db.cachedReceipts
    .filter((r) => {
      const matchParty = partyId ? r.party_id === partyId : true
      return matchParty && (r.challan_no?.trim() || '') === cleanChallan && r.id !== excludeId
    })
    .toArray()

  for (const sibling of localSiblings) {
    await db.cachedReceipts.update(sibling.id, { date: newDate }).catch(() => {})
  }

  // 2. If offline, enqueue updates
  if (!navigator.onLine) {
    for (const sibling of localSiblings) {
      await enqueueMutation('receipts', 'UPDATE', sibling.id, { date: newDate })
      emitDataChange('receipts', 'UPDATE', sibling.id)
    }
    return localSiblings.length
  }

  // 3. Online: filter strictly by both challan_no AND party_id
  try {
    let query = supabase
      .from('receipts')
      .update({ date: newDate })
      .eq('challan_no', cleanChallan)
      .neq('id', excludeId)
    if (partyId) {
      query = query.eq('party_id', partyId)
    }
    const { data, error } = await query.select('id')
    if (error) throw error
    const count = data?.length ?? localSiblings.length
    for (const item of data ?? localSiblings) {
      emitDataChange('receipts', 'UPDATE', item.id)
    }
    return count
  } catch (err) {
    if (isNetworkError(err)) {
      for (const sibling of localSiblings) {
        await enqueueMutation('receipts', 'UPDATE', sibling.id, { date: newDate })
        emitDataChange('receipts', 'UPDATE', sibling.id)
      }
      return localSiblings.length
    }
    throw err
  }
}
