import { db } from './db'
import type { SyncAction } from './db'
import { supabase } from '../supabase'

/** Event target to allow React to listen to sync events */
export const syncEventEmitter = new EventTarget()

function emitSyncUpdate() {
  syncEventEmitter.dispatchEvent(new Event('sync-update'))
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
      } catch (err) {
        console.error(`Sync failed for operation ${op.id} on ${op.table}:`, err)
        // Stop processing further to maintain order on failure
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
