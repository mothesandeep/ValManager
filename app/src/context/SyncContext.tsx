import React, { createContext, useCallback, useEffect, useState } from 'react'
import { syncQueueService } from '@/services/db'
import { syncEventEmitter, processSyncQueue, getSyncState } from '@/services/sync'

export interface SyncContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: Date | null
  syncError: string | null
  triggerSync: () => Promise<void>
}

export const SyncContext = createContext<SyncContextType>({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncError: null,
  triggerSync: async () => {},
})

// Re-export useSync for backward compatibility
export { useSync } from '../hooks/useSync'

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const updateState = useCallback(async () => {
    const currentOnline = navigator.onLine
    setIsOnline(currentOnline)
    try {
      const count = await syncQueueService.getCount()
      const syncMeta = getSyncState()
      setPendingCount(count)
      setIsSyncing(syncMeta.isSyncing)
      setLastSyncTime(syncMeta.lastSyncTime)
      setSyncError(syncMeta.syncError)
    } catch {
      // Ignore Dexie read errors during unmount or transition
    }
  }, [])

  const triggerSync = useCallback(async () => {
    if (navigator.onLine) {
      await processSyncQueue()
    }
    await updateState()
  }, [updateState])

  useEffect(() => {
    // Initial fetch of queue count
    void updateState()

    if (navigator.onLine) {
      void processSyncQueue()
    }

    const onUpdate = () => {
      void updateState()
    }

    window.addEventListener('online', onUpdate)
    window.addEventListener('offline', onUpdate)
    syncEventEmitter.addEventListener('sync-update', onUpdate)

    // Polling fallback every 3 seconds to catch external/tab updates AND flush pending queue if online
    const interval = setInterval(async () => {
      void updateState()
      if (navigator.onLine) {
        try {
          const pending = await syncQueueService.getPendingCount()
          if (pending > 0) {
            void processSyncQueue()
          }
        } catch {
          // ignore transient Dexie count errors
        }
      }
    }, 3000)

    return () => {
      window.removeEventListener('online', onUpdate)
      window.removeEventListener('offline', onUpdate)
      syncEventEmitter.removeEventListener('sync-update', onUpdate)
      clearInterval(interval)
    }
  }, [updateState])

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        syncError,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
