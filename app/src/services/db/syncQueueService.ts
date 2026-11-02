import { db } from './dexieClient'
import type { SyncOperation, SyncAction } from './dexieClient'

export class SyncQueueService {
  async getCount(): Promise<number> {
    try {
      return await db.syncQueue.count()
    } catch {
      return 0
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue.where('status').notEqual('failed').count()
    } catch {
      return 0
    }
  }

  async getFailedCount(): Promise<number> {
    try {
      return await db.syncQueue.where('status').equals('failed').count()
    } catch {
      return 0
    }
  }

  async enqueue(op: {
    table: string
    action: SyncAction
    record_id: string
    payload: unknown
  }): Promise<number> {
    return await db.syncQueue.add({
      table: op.table,
      action: op.action,
      record_id: op.record_id,
      payload: op.payload,
      created_at: new Date().toISOString(),
    })
  }

  async getAll(): Promise<SyncOperation[]> {
    try {
      return await db.syncQueue.orderBy('id').toArray()
    } catch {
      return []
    }
  }

  async getPending(): Promise<SyncOperation[]> {
    try {
      const all = await db.syncQueue.orderBy('id').toArray()
      return all.filter((op) => op.status !== 'failed')
    } catch {
      return []
    }
  }

  async getFailed(): Promise<SyncOperation[]> {
    try {
      return await db.syncQueue.filter((op) => op.status === 'failed').toArray()
    } catch {
      return []
    }
  }

  async getByTable(table: string): Promise<SyncOperation[]> {
    try {
      return await db.syncQueue.where('table').equals(table).sortBy('id')
    } catch {
      return []
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await db.syncQueue.delete(id)
    } catch {
      // Ignore
    }
  }

  async update(id: number, changes: Partial<SyncOperation>): Promise<void> {
    try {
      await db.syncQueue.update(id, changes)
    } catch {
      // Ignore
    }
  }

  async resetFailed(): Promise<void> {
    try {
      const failedOps = await db.syncQueue.filter((op) => op.status === 'failed').toArray()
      for (const op of failedOps) {
        if (op.id) {
          await db.syncQueue.update(op.id, {
            status: undefined,
            error: undefined,
            error_code: undefined,
          })
        }
      }
    } catch {
      // Ignore
    }
  }
}

export const syncQueueService = new SyncQueueService()
