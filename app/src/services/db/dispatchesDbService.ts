import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Dispatch } from '@/lib/validation/schemas'

export class DispatchesDbService {
  async getAll(): Promise<Dispatch[]> {
    try {
      return await db.cachedDispatches.toArray()
    } catch (err) {
      console.warn('[DispatchesDbService] Failed to read dispatches:', err)
      return []
    }
  }

  async get(id: string): Promise<Dispatch | undefined> {
    try {
      return await db.cachedDispatches.get(id)
    } catch {
      return undefined
    }
  }

  async put(dispatch: Dispatch): Promise<void> {
    try {
      await db.cachedDispatches.put(dispatch)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedDispatches.put(dispatch)
          return
        } catch {}
      }
      console.warn('[DispatchesDbService] Failed to cache dispatch:', err)
    }
  }

  async bulkPut(dispatches: Dispatch[]): Promise<void> {
    try {
      await db.cachedDispatches.bulkPut(dispatches)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedDispatches.bulkPut(dispatches)
          return
        } catch {}
      }
      console.warn('[DispatchesDbService] Failed to bulk cache dispatches:', err)
    }
  }

  async update(id: string, changes: Partial<Dispatch>): Promise<void> {
    try {
      await db.cachedDispatches.update(id, changes)
    } catch (err) {
      console.warn('[DispatchesDbService] Failed to update dispatch:', err)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.cachedDispatches.delete(id)
    } catch (err) {
      console.warn('[DispatchesDbService] Failed to delete dispatch:', err)
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      await db.cachedDispatches.bulkDelete(ids)
    } catch (err) {
      console.warn('[DispatchesDbService] Failed to bulk delete dispatches:', err)
    }
  }

  async findSiblings(partyId: string, challanNo: string, date: string): Promise<Dispatch[]> {
    try {
      return await db.cachedDispatches
        .filter(
          (d) =>
            d.party_id === partyId &&
            d.challan_no === challanNo &&
            d.date === date
        )
        .toArray()
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      await db.cachedDispatches.clear()
    } catch (err) {
      console.warn('[DispatchesDbService] Failed to clear dispatches:', err)
    }
  }
}

export const dispatchesDbService = new DispatchesDbService()
