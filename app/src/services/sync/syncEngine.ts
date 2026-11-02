import { syncQueueService, type SyncAction } from '@/services/db'
import { supabase } from '@/lib/supabase'
import { emitDataChange } from '@/lib/events'
import { sanitizeDispatchForServer } from '@/lib/api/dispatch'
import { sanitizeReceiptForServer } from '@/lib/api/receipts'
import { Capacitor } from '@capacitor/core'

/** Event target to allow React to listen to sync events */
export const syncEventEmitter = new EventTarget()

export interface SyncState {
  isSyncing: boolean
  lastSyncTime: Date | null
  syncError: string | null
  consecutiveFailures: number
}

const syncState: SyncState = {
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  consecutiveFailures: 0,
}

export function getSyncState(): SyncState {
  return { ...syncState }
}

function emitSyncUpdate() {
  syncEventEmitter.dispatchEvent(new Event('sync-update'))
}

export function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    // If it has a code (e.g. Postgres 23503), it is a DB error, NOT a network error
    if ('code' in err && typeof (err as { code?: unknown }).code === 'string') {
      return false
    }
    // Network abort or timeout
    if (
      'name' in err &&
      ((err as { name?: unknown }).name === 'AbortError' ||
        (err as { name?: unknown }).name === 'TimeoutError')
    ) {
      return true
    }
  }
  // Assume everything else (TypeError: Failed to fetch, offline, etc) is a network error
  return true
}

let retryTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRetry() {
  if (retryTimer) return
  syncState.consecutiveFailures += 1
  // Exponential backoff: 3s, 6s, 12s, 24s up to 60s max
  const delay = Math.min(3000 * Math.pow(2, syncState.consecutiveFailures - 1), 60000)
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (navigator.onLine) {
      void processSyncQueue()
    } else {
      scheduleRetry()
    }
  }, delay)
}

/**
 * Enqueue a database mutation into local Dexie queue and trigger sync if online.
 */
export async function enqueueMutation(
  table: string,
  action: SyncAction,
  record_id: string,
  payload: unknown
) {
  await syncQueueService.enqueue({
    table,
    action,
    record_id,
    payload,
  })

  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }

  emitSyncUpdate()

  // Try to sync immediately if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void processSyncQueue()
  }
}

/**
 * Background Sync Engine Controller:
 * Processes queued local mutations against Supabase with Last-Write-Wins (LWW) conflict resolution.
 */
export async function processSyncQueue(): Promise<void> {
  if (syncState.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  syncState.isSyncing = true
  emitSyncUpdate()

  let hadSuccess = false

  try {
    const allQueue = await syncQueueService.getAll()
    const queue = allQueue.filter((op) => op.status !== 'failed')

    if (queue.length === 0) {
      const failedCount = allQueue.filter((op) => op.status === 'failed').length
      if (failedCount > 0) {
        syncState.syncError = `${failedCount} unsynced change(s) have database errors and are safely retained offline.`
      } else {
        syncState.syncError = null
      }
      syncState.consecutiveFailures = 0
      return
    }

    for (const op of queue) {
      // Process one by one to maintain sequential order
      try {
        let payloadObj = (op.payload && typeof op.payload === 'object' ? op.payload : {}) as Record<string, unknown>
        if (op.table === 'dispatches') {
          payloadObj = sanitizeDispatchForServer(payloadObj)
        } else if (op.table === 'receipts') {
          payloadObj = sanitizeReceiptForServer(payloadObj)
        }

        if (op.action === 'INSERT') {
          const insertPayload = {
            ...payloadObj,
            updated_at: payloadObj.updated_at || op.created_at || new Date().toISOString(),
          }
          let { error } = await supabase.from(op.table).insert(insertPayload)
          if (error && (error.code === 'PGRST204' || error.message?.includes('updated_at'))) {
            const fallbackRes = await supabase.from(op.table).insert(payloadObj)
            error = fallbackRes.error
          }
          // 23505 is Postgres unique violation — safe to ignore idempotent insert
          if (error && error.code !== '23505') throw error
        } else if (op.action === 'UPDATE') {
          // Last-Write-Wins (LWW) Conflict Resolution:
          let shouldApplyUpdate = true
          try {
            const { data: serverRecord, error: fetchErr } = await supabase
              .from(op.table)
              .select('id, created_at, updated_at')
              .eq('id', op.record_id)
              .maybeSingle()

            if (!fetchErr && serverRecord) {
              const recordObj = serverRecord as { updated_at?: string; created_at?: string }
              const serverTs = recordObj.updated_at || recordObj.created_at
              const localTs = op.created_at
              if (serverTs && localTs) {
                const serverTime = new Date(serverTs).getTime()
                const localTime = new Date(localTs).getTime()
                // If server modification is newer than our local offline mutation, server wins!
                if (serverTime > localTime) {
                  console.warn(
                    `[LWW Conflict] Record ${op.record_id} on ${op.table} was modified on server (${serverTs}) after offline mutation (${localTs}). Server wins.`
                  )
                  shouldApplyUpdate = false
                }
              }
            } else if (!fetchErr && !serverRecord) {
              // Record was deleted on server while we were offline - discard stale update
              console.warn(
                `[LWW Conflict] Record ${op.record_id} on ${op.table} was deleted on server. Discarding stale update.`
              )
              shouldApplyUpdate = false
            }
          } catch (conflictCheckErr) {
            if (isNetworkError(conflictCheckErr)) throw conflictCheckErr
          }

          if (shouldApplyUpdate) {
            const updateWithTs = {
              ...payloadObj,
              updated_at: new Date().toISOString(),
            }
            let { error } = await supabase.from(op.table).update(updateWithTs).eq('id', op.record_id)
            if (error && (error.code === 'PGRST204' || error.message?.includes('updated_at'))) {
              const fallbackRes = await supabase.from(op.table).update(payloadObj).eq('id', op.record_id)
              error = fallbackRes.error
            }
            if (error) throw error
          }
        } else if (op.action === 'DELETE') {
          const { error } = await supabase.from(op.table).delete().eq('id', op.record_id)
          if (error) throw error
        }

        // Remove from queue after success
        if (op.id) await syncQueueService.delete(op.id)
        hadSuccess = true
      } catch (err: unknown) {
        console.error(`Sync failed for operation ${op.id} on ${op.table}:`, err)

        // If it's a Supabase/Postgres rejection error (has a code), retain in queue with 'failed' status to prevent data loss
        if (err && typeof err === 'object' && 'code' in err) {
          const dbErr = err as { code?: string; message?: string }
          console.warn(`DB error ${dbErr.code} for operation ${op.id}. Retaining in queue to prevent data loss.`)

          // Log failure to the database so audit trail is preserved
          try {
            await supabase.from('sync_failures').insert({
              table_name: op.table,
              record_id: op.record_id,
              error: dbErr.message || dbErr.code || 'Unknown DB error',
            })
          } catch (e) {
            console.error('Failed to log sync failure to DB:', e)
          }

          // Retain failed operation in Dexie (DO NOT DELETE)
          if (op.id) {
            await syncQueueService.update(op.id, {
              status: 'failed',
              error: dbErr.message || dbErr.code || 'Database error',
              error_code: dbErr.code,
              failed_at: new Date().toISOString(),
            })
          }
          syncState.syncError = `Unsynced change on ${op.table}: ${dbErr.message || dbErr.code || 'Database error'}`
          continue
        }

        // Network or timeout failure — record error, break and schedule retry
        const msg = err instanceof Error ? err.message : 'Network error during sync'
        syncState.syncError = msg
        scheduleRetry()
        break
      }
    }

    // Check remaining queue
    const remainingAll = await syncQueueService.getAll()
    const remainingPending = remainingAll.filter((op) => op.status !== 'failed').length
    const failedItems = remainingAll.filter((op) => op.status === 'failed')
    if (remainingPending === 0) {
      if (failedItems.length > 0) {
        syncState.syncError = `${failedItems.length} unsynced change(s) encountered database errors and are retained offline.`
      } else {
        syncState.syncError = null
      }
      syncState.consecutiveFailures = 0
      syncState.lastSyncTime = new Date()
    }
  } finally {
    syncState.isSyncing = false
    emitSyncUpdate()
    if (hadSuccess) {
      emitDataChange('*', 'SYNC')
    }
  }
}

/** Resets failed status on all retained offline operations and re-attempts sync */
export async function retryFailedSyncOperations(): Promise<void> {
  await syncQueueService.resetFailed()
  syncState.syncError = null
  emitSyncUpdate()
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void processSyncQueue()
  }
}

// Global handler for coming online with dual-pass settling
export function triggerOnlineSync() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  syncState.syncError = null
  emitSyncUpdate()
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void processSyncQueue()
  }
  // Secondary check 1.5s later to handle transient mobile DNS / cellular settling
  setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && !syncState.isSyncing) {
      void processSyncQueue()
    }
  }, 1500)
}

// Event listeners setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', triggerOnlineSync)

  window.addEventListener('offline', () => {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    emitSyncUpdate()
  })

  window.addEventListener('focus', () => {
    if (navigator.onLine && !syncState.isSyncing) {
      void processSyncQueue()
    }
  })

  // Listen to Capacitor native app resume ONLY if running on native platform
  if (Capacitor.isNativePlatform()) {
    try {
      import('@capacitor/app')
        .then(({ App }) => {
          App.addListener('appStateChange', (state) => {
            if (state.isActive && navigator.onLine && !syncState.isSyncing) {
              void processSyncQueue()
            }
          })
        })
        .catch(() => {})
    } catch {}
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !syncState.isSyncing) {
      void processSyncQueue()
    }
  })
}
