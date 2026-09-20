import { supabase } from '../supabase'
import type { Dispatch, DispatchWithParty } from '../../features/dispatch/types'


import { enqueueMutation } from '../offline/sync'
import { getPendingMutations, mergePendingMutations } from '../offline/db'

// ── Dispatches ────────────────────────────────────────────────────────────────

export type DispatchPayload = Omit<Dispatch, 'id' | 'created_at'>

export async function fetchDispatches(): Promise<DispatchWithParty[]> {
  let serverData: DispatchWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('dispatches')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as DispatchWithParty[]
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch dispatches')
    } else {
      throw err
    }
  }

  const pending = await getPendingMutations<DispatchWithParty>('dispatches')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertDispatch(payload: DispatchPayload): Promise<void> {
  const id = crypto.randomUUID()
  const dispatchData = { ...payload, id, created_at: new Date().toISOString() }
  
  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'INSERT', id, dispatchData)
    return
  }

  try {
    const { error } = await supabase.from('dispatches').insert(dispatchData)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('dispatches', 'INSERT', id, dispatchData)
  }
}

export async function insertDispatches(payloads: DispatchPayload[]): Promise<void> {
  if (!payloads.length) return
  for (const payload of payloads) {
    await insertDispatch(payload)
  }
}

export async function updateDispatch(
  id: string,
  payload: DispatchPayload
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('dispatches')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('dispatches', 'UPDATE', id, payload)
  }
}

export async function deleteDispatch(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('dispatches', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('dispatches').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('dispatches', 'DELETE', id, null)
  }
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
