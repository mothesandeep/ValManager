import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Table } from 'dexie'
import { syncQueueService } from './syncQueueService'
import { challanImagesDbService } from './challanImagesDbService'

export {
  db,
  OfflineDB,
  isQuotaExceededError,
  pruneOldImagesForQuota,
  type SyncAction,
  type OfflineChallanImage,
} from './dexieClient'

export {
  syncQueueService,
  SyncQueueService,
} from './syncQueueService'

export {
  partiesDbService,
  PartiesDbService,
} from './partiesDbService'

export {
  receiptsDbService,
  ReceiptsDbService,
} from './receiptsDbService'

export {
  dispatchesDbService,
  DispatchesDbService,
} from './dispatchesDbService'

export {
  expensesDbService,
  ExpensesDbService,
} from './expensesDbService'

export {
  paymentsDbService,
  PaymentsDbService,
} from './paymentsDbService'

export {
  challanImagesDbService,
  ChallanImagesDbService,
} from './challanImagesDbService'

// ── Generic Caching & Mutation Utilities ─────────────────────────────────────

export type CachedTableName =
  | 'cachedParties'
  | 'cachedReceipts'
  | 'cachedDispatches'
  | 'cachedExpenses'
  | 'cachedPayments'

/** Cache fresh server data locally so data persists offline / across server downtime */
export async function setCachedData<T extends { id: string }>(
  tableName: CachedTableName,
  items: T[],
  clearFirst = false
): Promise<void> {
  try {
    const table = db[tableName] as unknown as Table<T, string>
    if (table) {
      if (clearFirst) {
        await table.clear()
      }
      if (Array.isArray(items) && items.length > 0) {
        await table.bulkPut(items)
      }
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      try {
        await pruneOldImagesForQuota()
        const table = db[tableName] as unknown as Table<T, string>
        if (table && Array.isArray(items) && items.length > 0) {
          await table.bulkPut(items.slice(0, 100))
          return
        }
      } catch {
        // Fall back gracefully without crashing
      }
    }
    console.warn(`[Kasab OfflineDB] Failed to cache ${tableName}:`, err)
  }
}

/** Clear locally cached records for a specific table */
export async function clearCachedData(tableName: CachedTableName): Promise<void> {
  try {
    const table = db[tableName]
    if (table) {
      await table.clear()
    }
  } catch (err) {
    console.warn(`[Kasab OfflineDB] Failed to clear ${tableName}:`, err)
  }
}

/** Retrieve locally cached records */
export async function getCachedData<T extends { id: string }>(
  tableName: CachedTableName
): Promise<T[]> {
  try {
    const table = db[tableName] as unknown as Table<T, string>
    if (table) {
      return await table.toArray()
    }
  } catch (err) {
    console.warn(`[Kasab OfflineDB] Failed to read ${tableName}:`, err)
  }
  return []
}

/** Save compressed challan image to Dexie for offline local access safely */
export async function saveChallanImageOffline(data: {
  id: string
  challan_no?: string
  date?: string
  blob?: Blob
  base64?: string
  public_url?: string
}): Promise<void> {
  return challanImagesDbService.saveImage(data)
}

/** Retrieve offline cached challan image by record or challan ID */
export async function getChallanImageOffline(id: string) {
  return challanImagesDbService.getImage(id)
}

/** Find offline cached challan image by challan number */
export async function findChallanImageOffline(challanNo: string) {
  return challanImagesDbService.findImageByChallanNo(challanNo)
}

/** Helper to extract all pending operations for a specific table */
export async function getPendingMutations<T extends { id: string }>(
  tableName: string
): Promise<{ inserts: T[]; updates: Record<string, Partial<T>>; deletes: Set<string> }> {
  const operations = await syncQueueService.getByTable(tableName)

  const inserts: T[] = []
  const updates: Record<string, Partial<T>> = {}
  const deletes = new Set<string>()

  for (const op of operations) {
    if (op.action === 'INSERT') {
      inserts.push(op.payload as T)
    } else if (op.action === 'UPDATE') {
      if (!updates[op.record_id]) {
        updates[op.record_id] = {}
      }
      updates[op.record_id] = { ...updates[op.record_id], ...((op.payload as Partial<T>) || {}) }
    } else if (op.action === 'DELETE') {
      deletes.add(op.record_id)
    }
  }

  return { inserts, updates, deletes }
}

/** Helper to merge pending local mutations into server fetched data */
export function mergePendingMutations<T extends { id: string }>(
  serverData: T[],
  pending: { inserts: T[]; updates: Record<string, Partial<T>>; deletes: Set<string> }
): T[] {
  let merged = serverData
    .filter((item) => !pending.deletes.has(item.id))
    .map((item) => {
      if (pending.updates[item.id]) {
        return { ...item, ...pending.updates[item.id] }
      }
      return item
    })

  const existingIds = new Set(merged.map((item) => item.id))
  const newInserts = pending.inserts
    .filter((item) => !existingIds.has(item.id) && !pending.deletes.has(item.id))
    .map((item) => {
      if (pending.updates[item.id]) {
        return { ...item, ...pending.updates[item.id] }
      }
      return item
    })

  return [...newInserts, ...merged]
}
