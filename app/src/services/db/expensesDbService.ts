import { db, isQuotaExceededError, pruneOldImagesForQuota } from './dexieClient'
import type { Expense } from '@/lib/validation/schemas'

export class ExpensesDbService {
  async getAll(): Promise<Expense[]> {
    try {
      return await db.cachedExpenses.toArray()
    } catch (err) {
      console.warn('[ExpensesDbService] Failed to read expenses:', err)
      return []
    }
  }

  async get(id: string): Promise<Expense | undefined> {
    try {
      return await db.cachedExpenses.get(id)
    } catch {
      return undefined
    }
  }

  async put(expense: Expense): Promise<void> {
    try {
      await db.cachedExpenses.put(expense)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedExpenses.put(expense)
          return
        } catch {}
      }
      console.warn('[ExpensesDbService] Failed to cache expense:', err)
    }
  }

  async bulkPut(expenses: Expense[]): Promise<void> {
    try {
      await db.cachedExpenses.bulkPut(expenses)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await pruneOldImagesForQuota()
        try {
          await db.cachedExpenses.bulkPut(expenses)
          return
        } catch {}
      }
      console.warn('[ExpensesDbService] Failed to bulk cache expenses:', err)
    }
  }

  async update(id: string, changes: Partial<Expense>): Promise<void> {
    try {
      await db.cachedExpenses.update(id, changes)
    } catch (err) {
      console.warn('[ExpensesDbService] Failed to update expense:', err)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.cachedExpenses.delete(id)
    } catch (err) {
      console.warn('[ExpensesDbService] Failed to delete expense:', err)
    }
  }

  async clear(): Promise<void> {
    try {
      await db.cachedExpenses.clear()
    } catch (err) {
      console.warn('[ExpensesDbService] Failed to clear expenses:', err)
    }
  }
}

export const expensesDbService = new ExpensesDbService()
