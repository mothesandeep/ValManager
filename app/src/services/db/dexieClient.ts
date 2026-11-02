import { Dexie, type Table } from 'dexie'
import type { Party, Receipt, Dispatch, Payment, Expense, SyncOperation } from '@/lib/validation/schemas'

export type { SyncOperation }
export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface OfflineChallanImage {
  id: string
  challan_no?: string
  date?: string
  blob?: Blob
  base64?: string
  public_url?: string
  created_at: string
}

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncOperation, number>
  cachedParties!: Table<Party, string>
  cachedReceipts!: Table<Receipt, string>
  cachedDispatches!: Table<Dispatch, string>
  cachedExpenses!: Table<Expense, string>
  cachedPayments!: Table<Payment, string>
  challanImages!: Table<OfflineChallanImage, string>

  constructor() {
    super('KasabValOfflineDB')
    this.version(1).stores({
      syncQueue: '++id, table, action, record_id, created_at',
    })
    this.version(2).stores({
      syncQueue: '++id, table, action, record_id, created_at',
      cachedParties: 'id, name',
      cachedReceipts: 'id, date, party_id',
      cachedDispatches: 'id, date, party_id',
      cachedExpenses: 'id, date',
      cachedPayments: 'id, date, party_id',
    })
    this.version(3).stores({
      syncQueue: '++id, table, action, record_id, created_at',
      cachedParties: 'id, name',
      cachedReceipts: 'id, date, party_id',
      cachedDispatches: 'id, date, party_id',
      cachedExpenses: 'id, date',
      cachedPayments: 'id, date, party_id',
      challanImages: 'id, challan_no, date, created_at',
    })
  }
}

export const db = new OfflineDB()

/** Checks if an error is a browser storage quota limit error */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    )
  }
  const str = String(err).toLowerCase()
  return str.includes('quota') || str.includes('exceeded')
}

/** Evicts oldest cached challan images if storage quota is full */
export async function pruneOldImagesForQuota(): Promise<boolean> {
  try {
    if (!db.challanImages) return false
    const count = await db.challanImages.count()
    if (count > 10) {
      // Remove the oldest 15 entries to free up IndexedDB blocks
      const oldestKeys = await db.challanImages.orderBy('created_at').limit(15).keys()
      await db.challanImages.bulkDelete(oldestKeys as string[])
      return true
    }
  } catch {
    // ignore
  }
  return false
}
