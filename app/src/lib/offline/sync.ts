import { db } from './db'
import type { SyncAction } from './db'
import { supabase } from '../supabase'

/** Event target to allow React to listen to sync events */
export const syncEventEmitter = new EventTarget()

function emitSyncUpdate() {
  syncEventEmitter.dispatchEvent(new Event('sync-update'))
}

export function isNetworkError(err: any): boolean {
  // If it has a code (e.g. Postgres 23503), it is a DB error, NOT a network error
  if (err && typeof err === 'object' && 'code' in err) {
    return false
  }
  // Assume everything else (TypeError: Failed to fetch, etc) is a network error
  return true
}

export async function enqueueMutation(
  table: string,
  action: SyncAction,
  record_id: string,
  payload: any
) {
  await db.syncQueue.add({
    table,
    action,
    record_id,
    payload,
    created_at: new Date().toISOString()
  })
  emitSyncUpdate()
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    void processSyncQueue()
  }
}

let isSyncing = false

export async function processSyncQueue() {
  if (isSyncing || !navigator.onLine) return
  isSyncing = true
  emitSyncUpdate()

  try {
    const queue = await db.syncQueue.orderBy('id').toArray()
    if (queue.length === 0) return

    for (const op of queue) {
      // Process one by one to maintain order
      try {
        if (op.action === 'INSERT') {
          const { error } = await supabase.from(op.table).insert(op.payload)
          // If conflict (already inserted), we can ignore and delete from queue
          // 23505 is Postgres unique violation
          if (error && error.code !== '23505') throw error 
        } else if (op.action === 'UPDATE') {
          const { error } = await supabase.from(op.table).update(op.payload).eq('id', op.record_id)
          if (error) throw error
        } else if (op.action === 'DELETE') {
          const { error } = await supabase.from(op.table).delete().eq('id', op.record_id)
          if (error) throw error
        }
        
        // Remove from queue after success
        if (op.id) await db.syncQueue.delete(op.id)
      } catch (err: any) {
        console.error(`Sync failed for operation ${op.id} on ${op.table}:`, err)
        
        // If it's a Supabase/Postgres error (has a code), it's a permanent rejection by the DB.
        // We must discard this operation so it doesn't block the queue forever.
        // Network errors typically don't have a 'code' (e.g. TypeError: Failed to fetch).
        if (err && typeof err === 'object' && 'code' in err) {
          console.warn(`Permanent DB error ${err.code} for operation ${op.id}, discarding to unblock queue.`)
          
          // Log permanent failure to the database so data is not silently lost
          try {
            await supabase.from('sync_failures').insert({
              table_name: op.table,
              record_id: op.record_id,
              error: err.message || err.code || 'Unknown DB error'
            })
          } catch (e) {
            console.error('Failed to log sync failure to DB:', e)
          }

          if (op.id) await db.syncQueue.delete(op.id)
          continue
        }

        // Stop processing further to maintain order on network/temporary failure
        break 
      }
    }
  } finally {
    isSyncing = false
    emitSyncUpdate()
  }
}

// Global listener for coming online
window.addEventListener('online', () => {
  emitSyncUpdate()
  void processSyncQueue()
})
window.addEventListener('offline', () => {
  emitSyncUpdate()
})
