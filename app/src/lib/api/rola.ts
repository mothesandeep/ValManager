import { supabase } from '../supabase'
import type { RolaReturn, RolaReturnWithParty } from '../../features/rola/types'


import { enqueueMutation } from '../offline/sync'
import { getPendingMutations, mergePendingMutations } from '../offline/db'

// ── Rola Returns ──────────────────────────────────────────────────────────────

export type RolaReturnPayload = Omit<RolaReturn, 'id' | 'created_at'>

export async function fetchRolaReturns(): Promise<RolaReturnWithParty[]> {
  let serverData: RolaReturnWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('rola_returns')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) throw error
    serverData = (data ?? []) as RolaReturnWithParty[]
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch rola_returns')
    } else {
      throw err
    }
  }

  const pending = await getPendingMutations<RolaReturnWithParty>('rola_returns')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertRolaReturn(payload: RolaReturnPayload): Promise<void> {
  const id = crypto.randomUUID()
  const rolaData = { ...payload, id, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('rola_returns', 'INSERT', id, rolaData)
    return
  }

  try {
    const { error } = await supabase.from('rola_returns').insert(rolaData)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('rola_returns', 'INSERT', id, rolaData)
  }
}

export async function updateRolaReturn(
  id: string,
  payload: RolaReturnPayload
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('rola_returns', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('rola_returns')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('rola_returns', 'UPDATE', id, payload)
  }
}

export async function deleteRolaReturn(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('rola_returns', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('rola_returns').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('rola_returns', 'DELETE', id, null)
  }
}
