import { supabase } from '../supabase'
import type { Dispatch, DispatchWithParty } from '@/features/outward/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

import { emitDataChange } from '../events'
import { db } from '../offline/db'

// ── Dispatches ────────────────────────────────────────────────────────────────

export type DispatchPayload = Omit<Dispatch, 'id' | 'created_at'>

export const VALID_DISPATCH_COLUMNS = new Set([
  'id',
  'party_id',
  'date',
  'dispatch_type',
  'challan_no',
  'cord_count',
  'twist_type',
  'bungari_count',
  'bungari_weight_g',
  'bore_gross_weight',
  'net_val_weight',
  'rate_per_kg',
  'amount',
  'rola_count',
  'reconciliation_id',
  'created_at',
  'updated_at',
])

export function sanitizeDispatchForServer(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data)) {
    if (VALID_DISPATCH_COLUMNS.has(key) && val !== undefined) {
      clean[key] = val
    }
  }
  return clean
}

export async function fetchDispatches(): Promise<DispatchWithParty[]> {
  let serverData: DispatchWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('dispatches')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as DispatchWithParty[]
    void setCachedData('cachedDispatches', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch dispatches from server, falling back to local cache:', err)
    serverData = await getCachedData<DispatchWithParty>('cachedDispatches')
  }

  const pending = await getPendingMutations<DispatchWithParty>('dispatches')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertDispatch(payload: DispatchPayload): Promise<void> {
  const id = crypto.randomUUID()
  const dispatchData: Dispatch = { ...payload, id, created_at: new Date().toISOString() }

  // Immediately mirror to local cache
  void db.cachedDispatches.put(dispatchData).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'INSERT', id, dispatchData)
    emitDataChange('dispatches', 'INSERT', id)
    return
  }

  try {
    const serverPayload = sanitizeDispatchForServer(dispatchData as unknown as Record<string, unknown>)
    const { error } = await supabase.from('dispatches').insert(serverPayload)
    if (error) throw error
    emitDataChange('dispatches', 'INSERT', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('dispatches', 'INSERT', id, dispatchData)
      emitDataChange('dispatches', 'INSERT', id)
      return
    }
    throw err
  }
}

export async function insertDispatches(payloads: DispatchPayload[]): Promise<void> {
  if (!payloads.length) return

  const now = new Date().toISOString()
  const dispatchesData: Dispatch[] = payloads.map((payload) => {
    const id = crypto.randomUUID()
    return { ...payload, id, created_at: now }
  })

  // Immediately mirror all to local cache
  await Promise.all(dispatchesData.map((d) => db.cachedDispatches.put(d).catch(() => {})))

  if (!navigator.onLine) {
    for (const d of dispatchesData) {
      await enqueueMutation('dispatches', 'INSERT', d.id, d)
    }
    emitDataChange('dispatches', 'INSERT', dispatchesData[0].id)
    return
  }

  try {
    const serverPayloads = dispatchesData.map((d) =>
      sanitizeDispatchForServer(d as unknown as Record<string, unknown>)
    )
    const { error } = await supabase.from('dispatches').insert(serverPayloads)
    if (error) throw error
    for (const d of dispatchesData) {
      emitDataChange('dispatches', 'INSERT', d.id)
    }
  } catch (err) {
    if (isNetworkError(err)) {
      for (const d of dispatchesData) {
        await enqueueMutation('dispatches', 'INSERT', d.id, d)
      }
      emitDataChange('dispatches', 'INSERT', dispatchesData[0].id)
      return
    }
    throw err
  }
}

export async function updateDispatch(
  id: string,
  payload: DispatchPayload
): Promise<void> {
  // Immediately mirror to local cache
  void db.cachedDispatches.update(id, payload).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'UPDATE', id, payload)
    emitDataChange('dispatches', 'UPDATE', id)
    return
  }

  try {
    const serverUpdate = sanitizeDispatchForServer(payload as unknown as Record<string, unknown>)
    const { error } = await supabase
      .from('dispatches')
      .update(serverUpdate)
      .eq('id', id)
    if (error) throw error
    emitDataChange('dispatches', 'UPDATE', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('dispatches', 'UPDATE', id, payload)
      emitDataChange('dispatches', 'UPDATE', id)
      return
    }
    throw err
  }
}

export async function deleteDispatch(id: string): Promise<void> {
  // Immediately prune from local cache
  void db.cachedDispatches.delete(id).catch(() => {})

  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'DELETE', id, null)
    emitDataChange('dispatches', 'DELETE', id)
    return
  }

  try {
    const { error } = await supabase.from('dispatches').delete().eq('id', id)
    if (error) throw error
    emitDataChange('dispatches', 'DELETE', id)
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('dispatches', 'DELETE', id, null)
      emitDataChange('dispatches', 'DELETE', id)
      return
    }
    throw err
  }
}

export async function deleteDispatches(ids: string[]): Promise<void> {
  if (!ids.length) return

  // Prune from local cache
  void Promise.all(ids.map((id) => db.cachedDispatches.delete(id))).catch(() => {})

  if (!navigator.onLine) {
    for (const id of ids) {
      await enqueueMutation('dispatches', 'DELETE', id, null)
      emitDataChange('dispatches', 'DELETE', id)
    }
    return
  }

  try {
    const { error } = await supabase.from('dispatches').delete().in('id', ids)
    if (error) throw error
    for (const id of ids) {
      emitDataChange('dispatches', 'DELETE', id)
    }
  } catch (err) {
    if (isNetworkError(err)) {
      for (const id of ids) {
        await enqueueMutation('dispatches', 'DELETE', id, null)
        emitDataChange('dispatches', 'DELETE', id)
      }
      return
    }
    throw err
  }
}


export async function updateDispatchPartyByChallan(
  challanNo: string,
  newPartyId: string,
  excludeId: string,
  previousPartyId?: string | null
): Promise<number> {
  const cleanChallan = challanNo.trim()
  if (!cleanChallan) return 0

  // 1. Immediately update Dexie cached dispatches
  const localSiblings = await db.cachedDispatches
    .filter((d) => {
      const matchParty = previousPartyId ? d.party_id === previousPartyId : true
      return matchParty && (d.challan_no?.trim() || '') === cleanChallan && d.id !== excludeId
    })
    .toArray()

  for (const sibling of localSiblings) {
    await db.cachedDispatches.update(sibling.id, { party_id: newPartyId }).catch(() => {})
  }

  // 2. If offline, enqueue updates
  if (!navigator.onLine) {
    for (const sibling of localSiblings) {
      await enqueueMutation('dispatches', 'UPDATE', sibling.id, { party_id: newPartyId })
      emitDataChange('dispatches', 'UPDATE', sibling.id)
    }
    return localSiblings.length
  }

  // 3. Online: filter strictly by both challan_no AND previous party_id
  try {
    let query = supabase
      .from('dispatches')
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
      emitDataChange('dispatches', 'UPDATE', item.id)
    }
    return count
  } catch (err) {
    if (isNetworkError(err)) {
      for (const sibling of localSiblings) {
        await enqueueMutation('dispatches', 'UPDATE', sibling.id, { party_id: newPartyId })
        emitDataChange('dispatches', 'UPDATE', sibling.id)
      }
      return localSiblings.length
    }
    throw err
  }
}

export async function updateDispatchDateByChallan(
  challanNo: string,
  newDate: string,
  excludeId: string,
  partyId?: string | null
): Promise<number> {
  const cleanChallan = challanNo.trim()
  if (!cleanChallan) return 0

  // 1. Immediately update Dexie cached dispatches
  const localSiblings = await db.cachedDispatches
    .filter((d) => {
      const matchParty = partyId ? d.party_id === partyId : true
      return matchParty && (d.challan_no?.trim() || '') === cleanChallan && d.id !== excludeId
    })
    .toArray()

  for (const sibling of localSiblings) {
    await db.cachedDispatches.update(sibling.id, { date: newDate }).catch(() => {})
  }

  // 2. If offline, enqueue updates
  if (!navigator.onLine) {
    for (const sibling of localSiblings) {
      await enqueueMutation('dispatches', 'UPDATE', sibling.id, { date: newDate })
      emitDataChange('dispatches', 'UPDATE', sibling.id)
    }
    return localSiblings.length
  }

  // 3. Online: filter strictly by both challan_no AND party_id
  try {
    let query = supabase
      .from('dispatches')
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
      emitDataChange('dispatches', 'UPDATE', item.id)
    }
    return count
  } catch (err) {
    if (isNetworkError(err)) {
      for (const sibling of localSiblings) {
        await enqueueMutation('dispatches', 'UPDATE', sibling.id, { date: newDate })
        emitDataChange('dispatches', 'UPDATE', sibling.id)
      }
      return localSiblings.length
    }
    throw err
  }
}
