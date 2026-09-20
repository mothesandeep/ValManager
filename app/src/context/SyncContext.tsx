import React, { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../lib/offline/db'
import { syncEventEmitter, processSyncQueue } from '../lib/offline/sync'

interface SyncContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
}

const SyncContext = createContext<SyncContextType>({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
})

export const useSync = () => useContext(SyncContext)

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const updateState = async () => {
    setIsOnline(navigator.onLine)
    const count = await db.syncQueue.count()
    setPendingCount(count)
    // simplistic way to track sync state
    setIsSyncing(navigator.onLine && count > 0)
  }

  useEffect(() => {
    updateState()
    
    // Check initial queue
    if (navigator.onLine) {
      void processSyncQueue()
    }

    const onUpdate = () => updateState()
    
    window.addEventListener('online', onUpdate)
    window.addEventListener('offline', onUpdate)
    syncEventEmitter.addEventListener('sync-update', onUpdate)

    // Polling fallback to check if queue processed
    const interval = setInterval(onUpdate, 2000)

    return () => {
      window.removeEventListener('online', onUpdate)
      window.removeEventListener('offline', onUpdate)
      syncEventEmitter.removeEventListener('sync-update', onUpdate)
      clearInterval(interval)
    }
  }, [])

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount }}>
      {children}
    </SyncContext.Provider>
  )
}
