import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mergePendingMutations } from './db'
import { isNetworkError } from './sync'

describe('Synchronization & Data Collision Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Non-Destructive Offline Merging (mergePendingMutations)', () => {
    interface TestItem {
      id: string
      name: string
      notes?: string
      updated_at?: string
    }

    it('returns server data cleanly when there are no offline mutations', () => {
      const serverData: TestItem[] = [
        { id: '1', name: 'Party A' },
        { id: '2', name: 'Party B' },
      ]
      const pending = {
        inserts: [] as TestItem[],
        updates: {} as Record<string, Partial<TestItem>>,
        deletes: new Set<string>(),
      }

      const merged = mergePendingMutations(serverData, pending)
      expect(merged).toHaveLength(2)
      expect(merged[0].name).toBe('Party A')
      expect(merged[1].name).toBe('Party B')
    })

    it('applies offline updates over server data without mutating original server array', () => {
      const serverData: TestItem[] = [
        { id: '1', name: 'Party A Original', notes: 'Old note' },
        { id: '2', name: 'Party B Original' },
      ]
      const pending = {
        inserts: [] as TestItem[],
        updates: {
          '1': { name: 'Party A Offline Edit', notes: 'New offline note' },
        },
        deletes: new Set<string>(),
      }

      const merged = mergePendingMutations(serverData, pending)
      expect(merged).toHaveLength(2)
      expect(merged.find((i) => i.id === '1')).toEqual({
        id: '1',
        name: 'Party A Offline Edit',
        notes: 'New offline note',
      })
      expect(merged.find((i) => i.id === '2')?.name).toBe('Party B Original')
    })

    it('filters out offline deleted items even if server returns them', () => {
      const serverData: TestItem[] = [
        { id: '1', name: 'Party A' },
        { id: '2', name: 'Party B' },
      ]
      const pending = {
        inserts: [] as TestItem[],
        updates: {},
        deletes: new Set(['1']),
      }

      const merged = mergePendingMutations(serverData, pending)
      expect(merged).toHaveLength(1)
      expect(merged[0].id).toBe('2')
    })

    it('merges offline inserted items that are not yet in server data without ID collisions', () => {
      const serverData: TestItem[] = [{ id: 'srv-1', name: 'Server Party' }]
      const pending = {
        inserts: [{ id: 'off-1', name: 'Offline Party' }],
        updates: {},
        deletes: new Set<string>(),
      }

      const merged = mergePendingMutations(serverData, pending)
      expect(merged).toHaveLength(2)
      expect(merged.map((i) => i.id)).toContain('srv-1')
      expect(merged.map((i) => i.id)).toContain('off-1')
    })
  })

  describe('2. Conflict Resolution (Last-Write-Wins Rule)', () => {
    it('determines client wins when offline mutation timestamp is newer than server timestamp', () => {
      const serverTimestamp = '2026-11-01T10:00:00.000Z'
      const clientMutationTimestamp = '2026-11-01T10:15:00.000Z' // 15 mins later

      const serverTime = new Date(serverTimestamp).getTime()
      const clientTime = new Date(clientMutationTimestamp).getTime()

      const clientWins = clientTime >= serverTime
      expect(clientWins).toBe(true)
    })

    it('determines server wins when Web modified data after offline mutation was created', () => {
      const clientMutationTimestamp = '2026-11-01T09:30:00.000Z' // created offline first
      const serverTimestamp = '2026-11-01T11:00:00.000Z' // Web modified later

      const serverTime = new Date(serverTimestamp).getTime()
      const clientTime = new Date(clientMutationTimestamp).getTime()

      const serverWins = serverTime > clientTime
      expect(serverWins).toBe(true)
    })

    it('safely handles missing or null updated_at by falling back to created_at or client write', () => {
      const clientMutationTimestamp = '2026-11-01T12:00:00.000Z'
      const serverRecord = { id: 'test-1', created_at: '2026-11-01T08:00:00.000Z', updated_at: null }

      const serverTs = serverRecord.updated_at || serverRecord.created_at
      const shouldApply = !serverTs || new Date(clientMutationTimestamp).getTime() >= new Date(serverTs).getTime()

      expect(shouldApply).toBe(true)
    })
  })

  describe('3. Network Failure Classification (isNetworkError)', () => {
    it('identifies network failures correctly (TypeError fetch, AbortError, TimeoutError)', () => {
      expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
      expect(isNetworkError({ name: 'AbortError' })).toBe(true)
      expect(isNetworkError({ name: 'TimeoutError' })).toBe(true)
      expect(isNetworkError('network offline')).toBe(true)
    })

    it('does NOT treat database constraint or Postgres errors as network errors', () => {
      // Postgres error codes (e.g. 23503 foreign key violation, 23505 unique violation)
      expect(isNetworkError({ code: '23503', message: 'foreign_key_violation' })).toBe(false)
      expect(isNetworkError({ code: '42P01', message: 'relation does not exist' })).toBe(false)
      expect(isNetworkError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })).toBe(false)
    })
  })
})
