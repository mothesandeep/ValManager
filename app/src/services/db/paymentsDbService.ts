import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Payment } from '@/lib/validation/schemas'

export class PaymentsDbService {
  async getAll(): Promise<Payment[]> {
    try {
      return await db.cachedPayments.toArray()
    } catch (err) {
      console.warn('[PaymentsDbService] Failed to read payments:', err)
      return []
    }
  }

  async get(id: string): Promise<Payment | undefined> {
    try {
      return await db.cachedPayments.get(id)
    } catch {
      return undefined
    }
  }

  async put(payment: Payment): Promise<void> {
    try {
      await db.cachedPayments.put(payment)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedPayments.put(payment)
          return
        } catch {}
      }
      console.warn('[PaymentsDbService] Failed to cache payment:', err)
    }
  }

  async bulkPut(payments: Payment[]): Promise<void> {
    try {
      await db.cachedPayments.bulkPut(payments)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedPayments.bulkPut(payments)
          return
        } catch {}
      }
      console.warn('[PaymentsDbService] Failed to bulk cache payments:', err)
    }
  }

  async update(id: string, changes: Partial<Payment>): Promise<void> {
    try {
      await db.cachedPayments.update(id, changes)
    } catch (err) {
      console.warn('[PaymentsDbService] Failed to update payment:', err)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.cachedPayments.delete(id)
    } catch (err) {
      console.warn('[PaymentsDbService] Failed to delete payment:', err)
    }
  }

  async clear(): Promise<void> {
    try {
      await db.cachedPayments.clear()
    } catch (err) {
      console.warn('[PaymentsDbService] Failed to clear payments:', err)
    }
  }
}

export const paymentsDbService = new PaymentsDbService()
