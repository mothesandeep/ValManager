import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Party } from '@/lib/validation/schemas'

export class PartiesDbService {
  async getAll(): Promise<Party[]> {
    try {
      return await db.cachedParties.toArray()
    } catch (err) {
      console.warn('[PartiesDbService] Failed to read parties:', err)
      return []
    }
  }

  async get(id: string): Promise<Party | undefined> {
    try {
      return await db.cachedParties.get(id)
    } catch {
      return undefined
    }
  }

  async put(party: Party): Promise<void> {
    try {
      await db.cachedParties.put(party)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedParties.put(party)
          return
        } catch {}
      }
      console.warn('[PartiesDbService] Failed to cache party:', err)
    }
  }

  async bulkPut(parties: Party[]): Promise<void> {
    try {
      await db.cachedParties.bulkPut(parties)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedParties.bulkPut(parties)
          return
        } catch {}
      }
      console.warn('[PartiesDbService] Failed to bulk cache parties:', err)
    }
  }

  async update(id: string, changes: Partial<Party>): Promise<void> {
    try {
      await db.cachedParties.update(id, changes)
    } catch (err) {
      console.warn('[PartiesDbService] Failed to update party:', err)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.cachedParties.delete(id)
    } catch (err) {
      console.warn('[PartiesDbService] Failed to delete party:', err)
    }
  }

  async clear(): Promise<void> {
    try {
      await db.cachedParties.clear()
    } catch (err) {
      console.warn('[PartiesDbService] Failed to clear parties:', err)
    }
  }
}

export const partiesDbService = new PartiesDbService()
