/**
 * autoBackupService.ts
 * 
 * Provides automated rolling daily safety snapshots and 1-click "Oops" restoration.
 * Designed so that accidental user deletions or buggy software updates can be undone
 * instantly from recent local snapshots without waiting for remote server restores.
 */

import { type FullBackupPayload, getGlobalSettings, getTarRates, getPartyBigRolaMap, getCompanySettings, importDatabaseBackup } from '@/features/settings/utils'
import { db } from '@/lib/offline/db'

export const STORAGE_KEY_LATEST_SNAPSHOT = 'KASAB_AUTO_SNAPSHOT_LATEST'
export const STORAGE_KEY_PREVIOUS_SNAPSHOT = 'KASAB_AUTO_SNAPSHOT_PREVIOUS'
export const STORAGE_KEY_LAST_SNAPSHOT_DATE = 'KASAB_AUTO_SNAPSHOT_LAST_DATE'

export interface AutoSnapshotSummary {
  id: string
  slot: 'latest' | 'previous'
  createdAt: string
  reason: 'daily_auto' | 'manual_checkpoint' | 'pre_update'
  counts: {
    parties: number
    receipts: number
    dispatches: number
    expenses: number
    payments: number
  }
}

interface StoredSnapshotRecord {
  summary: AutoSnapshotSummary
  payload: FullBackupPayload
}

/**
 * Creates a complete snapshot of local Dexie tables and settings.
 * Rolls the previous "latest" snapshot into "previous" (keeping today and yesterday).
 */
export async function takeAutoSnapshot(reason: 'daily_auto' | 'manual_checkpoint' | 'pre_update' = 'manual_checkpoint'): Promise<AutoSnapshotSummary> {
  const [parties, receipts, dispatches, expenses, payments] = await Promise.all([
    db.cachedParties.toArray().catch(() => []),
    db.cachedReceipts.toArray().catch(() => []),
    db.cachedDispatches.toArray().catch(() => []),
    db.cachedExpenses.toArray().catch(() => []),
    db.cachedPayments.toArray().catch(() => []),
  ])

  const payload: FullBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'ValManager',
    settings: {
      globalSettings: getGlobalSettings(),
      tarRates: getTarRates(),
      partyBigRolaMap: getPartyBigRolaMap(),
      companySettings: getCompanySettings(),
    },
    dexieData: {
      parties,
      receipts,
      dispatches,
      expenses,
      payments,
    },
  }

  const nowIso = new Date().toISOString()
  const summary: AutoSnapshotSummary = {
    id: `snap_${Date.now()}`,
    slot: 'latest',
    createdAt: nowIso,
    reason,
    counts: {
      parties: parties.length,
      receipts: receipts.length,
      dispatches: dispatches.length,
      expenses: expenses.length,
      payments: payments.length,
    },
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Roll current latest into previous slot
      const existingLatestRaw = localStorage.getItem(STORAGE_KEY_LATEST_SNAPSHOT)
      if (existingLatestRaw) {
        const parsed = JSON.parse(existingLatestRaw) as StoredSnapshotRecord
        parsed.summary.slot = 'previous'
        localStorage.setItem(STORAGE_KEY_PREVIOUS_SNAPSHOT, JSON.stringify(parsed))
      }

      // Save new latest snapshot
      const newRecord: StoredSnapshotRecord = { summary, payload }
      localStorage.setItem(STORAGE_KEY_LATEST_SNAPSHOT, JSON.stringify(newRecord))
      localStorage.setItem(STORAGE_KEY_LAST_SNAPSHOT_DATE, new Date().toISOString().slice(0, 10))
    } catch (err) {
      console.warn('[AutoBackup] Failed writing snapshot to localStorage:', err)
    }
  }

  return summary
}

/**
 * Returns metadata summary for the latest automatic safety snapshot.
 */
export function getLatestAutoSnapshot(): AutoSnapshotSummary | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LATEST_SNAPSHOT)
    if (!raw) return null
    const record = JSON.parse(raw) as StoredSnapshotRecord
    return record.summary || null
  } catch {
    return null
  }
}

/**
 * Returns metadata summary for yesterday's / previous safety snapshot.
 */
export function getPreviousAutoSnapshot(): AutoSnapshotSummary | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREVIOUS_SNAPSHOT)
    if (!raw) return null
    const record = JSON.parse(raw) as StoredSnapshotRecord
    return record.summary || null
  } catch {
    return null
  }
}

/**
 * "The Oops Button": Restores the designated snapshot (defaults to latest)
 * back into Dexie offline database and application state.
 */
export async function restoreAutoSnapshot(
  slot: 'latest' | 'previous' = 'latest'
): Promise<{ success: boolean; message: string; restoredCounts?: Record<string, number> }> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, message: 'Storage not accessible.' }
  }

  try {
    const key = slot === 'latest' ? STORAGE_KEY_LATEST_SNAPSHOT : STORAGE_KEY_PREVIOUS_SNAPSHOT
    const raw = localStorage.getItem(key)
    if (!raw) {
      return { success: false, message: `No ${slot} snapshot found to restore.` }
    }

    const record = JSON.parse(raw) as StoredSnapshotRecord
    if (!record.payload) {
      return { success: false, message: 'Corrupt snapshot record.' }
    }

    // Call standard import utility
    const result = await importDatabaseBackup(JSON.stringify(record.payload))
    if (!result.success) {
      return result
    }

    // Dispatch event to trigger state refreshes across React contexts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('valmanager-data-restored', { detail: { slot, summary: record.summary } }))
    }

    return {
      success: true,
      message: `Successfully restored ${slot} safety snapshot from ${new Date(record.summary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
      restoredCounts: record.summary.counts,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Oops restore failed: ${msg}` }
  }
}

/**
 * Automatically triggers a rolling daily snapshot if none was taken today.
 * Non-blocking, safe to call during app startup.
 */
export async function checkAndRunDailyAutoSnapshot(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_SNAPSHOT_DATE)

    if (lastDate !== today) {
      await takeAutoSnapshot('daily_auto')
      return true
    }
  } catch (err) {
    console.warn('[AutoBackup] Error running daily snapshot check:', err)
  }
  return false
}

/**
 * Triggers a browser download of the stored snapshot as a .json file.
 */
export function downloadSnapshotAsFile(slot: 'latest' | 'previous' = 'latest'): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const key = slot === 'latest' ? STORAGE_KEY_LATEST_SNAPSHOT : STORAGE_KEY_PREVIOUS_SNAPSHOT
    const raw = localStorage.getItem(key)
    if (!raw) return false

    const record = JSON.parse(raw) as StoredSnapshotRecord
    const blob = new Blob([JSON.stringify(record.payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateFormatted = record.summary.createdAt.slice(0, 10)
    a.download = `valmanager_safety_snapshot_${slot}_${dateFormatted}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error('[AutoBackup] Failed downloading snapshot file:', err)
    return false
  }
}
