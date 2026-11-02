import { supabase } from '../supabase'
import type { Party } from '../../features/parties/types'
import { getPartyAliases } from '../../features/parties/utils'
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
    serverData = (data ?? []).map((p: any) => ({
      ...p,
      aliases: getPartyAliases(p),
    }))
    // Clear stale cached items so deleted duplicate parties disappear from local cache
    void setCachedData('cachedParties', serverData, true)
  } catch (err) {
    console.warn('[Kasab API] Could not fetch parties from server, falling back to local cache:', err)
    serverData = (await getCachedData<Party>('cachedParties')).map((p) => ({
      ...p,
      aliases: getPartyAliases(p),
    }))
  }

  const pending = await getPendingMutations<Party>('parties')
  return mergePendingMutations(serverData, pending).sort((a, b) => a.name.localeCompare(b.name))
}

export type PartyPayload = {
  name: string
  phone?: string | null
  address?: string | null
  notes?: string | null
  aliases?: string[] | null
  default_rola_weight_g?: number | null
  default_bungari_weight_g?: number | null
}

function preparePayloadWithAliases(payload: Partial<PartyPayload>): {
  withAliases: Record<string, any>
  fallbackWithoutAliases: Record<string, any>
} {
  const { aliases, notes, ...rest } = payload
  let resolvedNotes = notes ?? null

  if (aliases && aliases.length > 0) {
    // If notes does not already include Aliases: ..., format it into notes
    const aliasStr = aliases.filter(Boolean).join(', ')
    if (aliasStr) {
      if (!resolvedNotes) {
        resolvedNotes = `Aliases: ${aliasStr}`
      } else if (!/(?:aliases|alias)\s*:/i.test(resolvedNotes)) {
        resolvedNotes = `${resolvedNotes} (Aliases: ${aliasStr})`
      } else {
        resolvedNotes = resolvedNotes.replace(/(?:aliases|alias)\s*:\s*([^;\n]+)/i, `Aliases: ${aliasStr}`)
      }
    }
  }

  return {
    withAliases: { ...rest, notes: resolvedNotes, ...(aliases ? { aliases } : {}) },
    fallbackWithoutAliases: { ...rest, notes: resolvedNotes },
  }
}

import { emitDataChange } from '../events'
import { db } from '../offline/db'

export async function insertParty(
  payload: PartyPayload
): Promise<Party> {
  const id = crypto.randomUUID()
  const partyData: Party = {
    ...payload,
    id,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    notes: payload.notes ?? null,
    aliases: payload.aliases || [],
    created_at: new Date().toISOString(),
  }

  // Immediately mirror to local cache
  void db.cachedParties.put(partyData).catch(() => {})
  emitDataChange('parties', 'INSERT', id)

  if (!navigator.onLine) {
    await enqueueMutation('parties', 'INSERT', id, partyData)
    return partyData
  }

  const { withAliases, fallbackWithoutAliases } = preparePayloadWithAliases(payload)

  try {
    const { data, error } = await supabase.from('parties').insert({ ...withAliases, id, created_at: partyData.created_at }).select().single()
    if (error) {
      // If error is due to missing 'aliases' column, fallback without it
      if (error.code === 'PGRST204' || error.message?.includes('aliases')) {
        const fallbackRes = await supabase.from('parties').insert({ ...fallbackWithoutAliases, id, created_at: partyData.created_at }).select().single()
        if (fallbackRes.error) throw fallbackRes.error
        const result = { ...fallbackRes.data, aliases: getPartyAliases(fallbackRes.data) }
        void db.cachedParties.put(result).catch(() => {})
        return result
      }
      throw error
    }
    const result = { ...data, aliases: getPartyAliases(data) }
    void db.cachedParties.put(result).catch(() => {})
    return result
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
  // Immediately mirror to local cache
  void db.cachedParties.update(id, payload).catch(() => {})
  emitDataChange('parties', 'UPDATE', id)

  if (!navigator.onLine) {
    await enqueueMutation('parties', 'UPDATE', id, payload)
    return
  }

  const { withAliases, fallbackWithoutAliases } = preparePayloadWithAliases(payload)

  try {
    const { error } = await supabase.from('parties').update(withAliases).eq('id', id)
    if (error) {
      // If error is due to missing 'aliases' column, fallback without it
      if (error.code === 'PGRST204' || error.message?.includes('aliases')) {
        const fallbackRes = await supabase.from('parties').update(fallbackWithoutAliases).eq('id', id)
        if (fallbackRes.error) throw fallbackRes.error
        return
      }
      throw error
    }
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueMutation('parties', 'UPDATE', id, payload)
      return
    }
    throw err
  }
}

export async function deleteParty(id: string): Promise<void> {
  // Immediately prune from local cache
  void db.cachedParties.delete(id).catch(() => {})
  emitDataChange('parties', 'DELETE', id)

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

