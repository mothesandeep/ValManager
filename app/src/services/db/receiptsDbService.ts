import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Receipt } from '@/lib/validation/schemas'

export class ReceiptsDbService {
  async getAll(): Promise<Receipt[]> {
    try {
      return await db.cachedReceipts.toArray()
    } catch (err) {
      console.warn('[ReceiptsDbService] Failed to read receipts:', err)
      return []
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    try {
      return await db.cachedReceipts.get(id)
    } catch {
      return undefined
    }
  }

  async put(receipt: Receipt): Promise<void> {
    try {
      await db.cachedReceipts.put(receipt)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedReceipts.put(receipt)
          return
        } catch {}
      }
      console.warn('[ReceiptsDbService] Failed to cache receipt:', err)
    }
  }

  async bulkPut(receipts: Receipt[]): Promise<void> {
    try {
      await db.cachedReceipts.bulkPut(receipts)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedReceipts.bulkPut(receipts)
          return
        } catch {}
      }
      console.warn('[ReceiptsDbService] Failed to bulk cache receipts:', err)
    }
  }

  async update(id: string, changes: Partial<Receipt>): Promise<void> {
    try {
      await db.cachedReceipts.update(id, changes)
    } catch (err) {
      console.warn('[ReceiptsDbService] Failed to update receipt:', err)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.cachedReceipts.delete(id)
    } catch (err) {
      console.warn('[ReceiptsDbService] Failed to delete receipt:', err)
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      await db.cachedReceipts.bulkDelete(ids)
    } catch (err) {
      console.warn('[ReceiptsDbService] Failed to bulk delete receipts:', err)
    }
  }

  async findSiblings(partyId: string, challanNo: string, date: string): Promise<Receipt[]> {
    try {
      return await db.cachedReceipts
        .filter(
          (r) =>
            r.party_id === partyId &&
            r.challan_no === challanNo &&
            r.date === date
        )
        .toArray()
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      await db.cachedReceipts.clear()
    } catch (err) {
      console.warn('[ReceiptsDbService] Failed to clear receipts:', err)
    }
  }
}

export const receiptsDbService = new ReceiptsDbService()
