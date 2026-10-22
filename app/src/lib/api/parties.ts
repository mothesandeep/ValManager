import { supabase } from '../supabase'
import type { Party } from '../../features/parties/types'


import { enqueueMutation, isNetworkError } from '../offline/sync'
import { getPendingMutations, mergePendingMutations, setCachedData, getCachedData } from '../offline/db'

// ── Parties ───────────────────────────────────────────────────────────────────

export async function fetchParties(): Promise<Party[]> {
  let serverData: Party[] = []
  try {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('name')
    if (error) throw error
    serverData = data ?? []
    void setCachedData('cachedParties', serverData)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch parties from server, falling back to local cache:', err)
    serverData = await getCachedData<Party>('cachedParties')
  }

  const pending = await getPendingMutations<Party>('parties')
  return mergePendingMutations(serverData, pending).sort((a, b) => a.name.localeCompare(b.name))
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
  const id = crypto.randomUUID()
  const partyData = { ...payload, id, created_at: new Date().toISOString() } as Party
  
  if (!navigator.onLine) {
    await enqueueMutation('parties', 'INSERT', id, partyData)
    return partyData
  }

  try {
    const { data, error } = await supabase.from('parties').insert(partyData).select().single()
    if (error) throw error
    return data
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('parties', 'INSERT', id, partyData)
      return partyData
    }
    throw err
  }
}

export async function updateParty(
  id: string,
  payload: Partial<PartyPayload>
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('parties', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase.from('parties').update(payload).eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('parties', 'UPDATE', id, payload)
      return
    }
    throw err
  }
}

export async function deleteParty(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('parties', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('parties').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('parties', 'DELETE', id, null)
      return
    }
    throw err
  }
}

