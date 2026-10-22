import { Dexie, type Table } from 'dexie'

export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface SyncOperation {
  id?: number
  table: string
  action: SyncAction
  record_id: string
  payload: any
  created_at: string
}

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncOperation>
  cachedParties!: Table<any, string>
  cachedReceipts!: Table<any, string>
  cachedDispatches!: Table<any, string>
  cachedExpenses!: Table<any, string>
  cachedPayments!: Table<any, string>

  constructor() {
    super('KasabValOfflineDB')
    this.version(1).stores({
      syncQueue: '++id, table, action, record_id, created_at'
    })
    this.version(2).stores({
      syncQueue: '++id, table, action, record_id, created_at',
      cachedParties: 'id, name',
      cachedReceipts: 'id, date, party_id',
      cachedDispatches: 'id, date, party_id',
      cachedExpenses: 'id, date',
      cachedPayments: 'id, date, party_id'
    })
  }
}

export const db = new OfflineDB()

export type CachedTableName =
  | 'cachedParties'
  | 'cachedReceipts'
  | 'cachedDispatches'
  | 'cachedExpenses'
  | 'cachedPayments'

/** Cache fresh server data locally so data persists offline / across server downtime */
export async function setCachedData<T extends { id: string }>(
  tableName: CachedTableName,
  items: T[]
): Promise<void> {
  try {
    const table = db[tableName]
    if (table && Array.isArray(items) && items.length > 0) {
      await table.bulkPut(items)
    }
  } catch (err) {
    console.warn(`[Kasab OfflineDB] Failed to cache ${tableName}:`, err)
  }
}

/** Retrieve locally cached records */
export async function getCachedData<T extends { id: string }>(
  tableName: CachedTableName
): Promise<T[]> {
  try {
    const table = db[tableName]
    if (table) {
      return (await table.toArray()) as T[]
    }
  } catch (err) {
    console.warn(`[Kasab OfflineDB] Failed to read ${tableName}:`, err)
  }
  return []
}

/** Helper to extract all pending operations for a specific table */
export async function getPendingMutations<T extends { id: string }>(
  tableName: string
): Promise<{ inserts: T[]; updates: Record<string, Partial<T>>; deletes: Set<string> }> {
  const operations = await db.syncQueue.where('table').equals(tableName).sortBy('id')
  
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
      updates[op.record_id] = { ...updates[op.record_id], ...op.payload }
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
  // Apply updates to existing data and filter out deletes
  let merged = serverData
    .filter(item => !pending.deletes.has(item.id))
    .map(item => {
      if (pending.updates[item.id]) {
        return { ...item, ...pending.updates[item.id] }
      }
      return item
    })

  // Avoid inserting duplicates if the server already returned it
  const existingIds = new Set(merged.map(item => item.id))
  const newInserts = pending.inserts.filter(item => !existingIds.has(item.id) && !pending.deletes.has(item.id))

  // New items from local go to the front (assuming we sort by created_at desc mostly)
  return [...newInserts, ...merged]
}
