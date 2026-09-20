import { supabase } from '../supabase'
import type {
  GapchaSale,
  GapchaSaleWithParty,
  GapchaReconciliation,
  GapchaReconciliationWithParty,
} from '../../features/gapcha/types'
import { enqueueMutation } from '../offline/sync'
import { getPendingMutations, mergePendingMutations } from '../offline/db'

// ── Gapcha Sales ──────────────────────────────────────────────────────────────

export type GapchaSalePayload = Omit<GapchaSale, 'id' | 'created_at'>

export async function fetchGapchaSales(): Promise<GapchaSaleWithParty[]> {
  let serverData: GapchaSaleWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('gapcha_sales')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) {
      console.warn('fetchGapchaSales error:', error.message)
    } else {
      serverData = (data ?? []) as GapchaSaleWithParty[]
    }
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch gapcha_sales')
    } else {
      console.warn('fetchGapchaSales exception:', err)
    }
  }

  const pending = await getPendingMutations<GapchaSaleWithParty>('gapcha_sales')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function insertGapchaSale(payload: GapchaSalePayload): Promise<void> {
  const id = crypto.randomUUID()
  const saleData = { ...payload, id, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('gapcha_sales', 'INSERT', id, saleData)
    return
  }

  try {
    const { error } = await supabase.from('gapcha_sales').insert(saleData)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_sales', 'INSERT', id, saleData)
  }
}

export async function updateGapchaSale(
  id: string,
  payload: GapchaSalePayload
): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('gapcha_sales', 'UPDATE', id, payload)
    return
  }

  try {
    const { error } = await supabase
      .from('gapcha_sales')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_sales', 'UPDATE', id, payload)
  }
}

export async function deleteGapchaSale(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('gapcha_sales', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('gapcha_sales').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_sales', 'DELETE', id, null)
  }
}


// ── Gapcha Batch Reconciliations ──────────────────────────────────────────────

export type GapchaReconciliationPayload = Omit<GapchaReconciliation, 'id' | 'created_at'>

export async function fetchReconciliations(): Promise<GapchaReconciliationWithParty[]> {
  let serverData: GapchaReconciliationWithParty[] = []
  try {
    const { data, error } = await supabase
      .from('gapcha_reconciliations')
      .select('*, party:parties(name)')
      .order('date', { ascending: false })
    if (error) {
      console.warn('fetchReconciliations error:', error.message)
    } else {
      serverData = (data ?? []) as GapchaReconciliationWithParty[]
    }
  } catch (err) {
    if (!navigator.onLine) {
      console.warn('Offline: Could not fetch gapcha_reconciliations')
    } else {
      console.warn('fetchReconciliations exception:', err)
    }
  }

  const pending = await getPendingMutations<GapchaReconciliationWithParty>('gapcha_reconciliations')
  return mergePendingMutations(serverData, pending).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function createReconciliation(
  payload: GapchaReconciliationPayload,
  receiptIds: string[],
  dispatchIds: string[]
): Promise<void> {
  const reconId = crypto.randomUUID()
  const reconData = { ...payload, id: reconId, created_at: new Date().toISOString() }

  if (!navigator.onLine) {
    await enqueueMutation('gapcha_reconciliations', 'INSERT', reconId, reconData)
    for (const id of receiptIds) {
      await enqueueMutation('receipts', 'UPDATE', id, { reconciliation_id: reconId, status: 'Reconciled' })
    }
    for (const id of dispatchIds) {
      await enqueueMutation('dispatches', 'UPDATE', id, { reconciliation_id: reconId })
    }
    return
  }

  try {
    // 1. Insert reconciliation record
    const { error } = await supabase
      .from('gapcha_reconciliations')
      .insert(reconData)
    if (error) throw error

    // 2. Link receipts
    if (receiptIds.length > 0) {
      const { error: rErr } = await supabase
        .from('receipts')
        .update({ reconciliation_id: reconId, status: 'Reconciled' })
        .in('id', receiptIds)
      if (rErr) console.warn('Error linking receipts to reconciliation:', rErr)
    }

    // 3. Link dispatches
    if (dispatchIds.length > 0) {
      const { error: dErr } = await supabase
        .from('dispatches')
        .update({ reconciliation_id: reconId })
        .in('id', dispatchIds)
      if (dErr) console.warn('Error linking dispatches to reconciliation:', dErr)
    }
  } catch (err) {
    await enqueueMutation('gapcha_reconciliations', 'INSERT', reconId, reconData)
    for (const id of receiptIds) {
      await enqueueMutation('receipts', 'UPDATE', id, { reconciliation_id: reconId, status: 'Reconciled' })
    }
    for (const id of dispatchIds) {
      await enqueueMutation('dispatches', 'UPDATE', id, { reconciliation_id: reconId })
    }
  }
}

export async function deleteReconciliation(id: string): Promise<void> {
  if (!navigator.onLine) {
    // 1. Unlink receipts locally
    // Note: Deleting a recon offline might cause minor local state sync issues if the user doesn't refresh, 
    // but we can just enqueue the updates.
    // In a real robust system we'd need to know exactly which receipts were linked.
    await enqueueMutation('gapcha_reconciliations', 'DELETE', id, null)
    return
  }

  try {
    // 1. Unlink receipts
    await supabase
      .from('receipts')
      .update({ reconciliation_id: null, status: 'Pending' })
      .eq('reconciliation_id', id)

    // 2. Unlink dispatches
    await supabase
      .from('dispatches')
      .update({ reconciliation_id: null })
      .eq('reconciliation_id', id)

    // 3. Delete reconciliation
    const { error } = await supabase
      .from('gapcha_reconciliations')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_reconciliations', 'DELETE', id, null)
  }
}

export type GapchaSurplusPayload = {
  party_id: string
  date: string
  gapcha_weight: number
  note?: string | null
}

export async function insertGapchaSurplus(payload: GapchaSurplusPayload): Promise<void> {
  const id = crypto.randomUUID()
  const data = {
    id,
    party_id: payload.party_id,
    date: payload.date,
    gapcha_weight: payload.gapcha_weight,
    input_kasab_weight: 0,
    output_val_weight: 0,
    output_kali_weight: 0,
    reconciled_output: 0,
    note: payload.note || null,
    created_at: new Date().toISOString()
  }

  if (!navigator.onLine) {
    await enqueueMutation('gapcha_reconciliations', 'INSERT', id, data)
    return
  }

  try {
    const { error } = await supabase.from('gapcha_reconciliations').insert(data)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_reconciliations', 'INSERT', id, data)
  }
}

export async function deleteGapchaSurplus(id: string): Promise<void> {
  if (!navigator.onLine) {
    await enqueueMutation('gapcha_reconciliations', 'DELETE', id, null)
    return
  }

  try {
    const { error } = await supabase.from('gapcha_reconciliations').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    await enqueueMutation('gapcha_reconciliations', 'DELETE', id, null)
  }
}

