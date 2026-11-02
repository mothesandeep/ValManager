import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  takeAutoSnapshot,
  getLatestAutoSnapshot,
  getPreviousAutoSnapshot,
  restoreAutoSnapshot,
  checkAndRunDailyAutoSnapshot,
} from './autoBackupService'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

const mockLocalStorage = createMockStorage()

// Mock db
vi.mock('@/lib/offline/db', () => ({
  db: {
    cachedParties: { toArray: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Test Party' }]), bulkPut: vi.fn() },
    cachedReceipts: { toArray: vi.fn().mockResolvedValue([{ id: 'r1', challan_no: '101' }]), bulkPut: vi.fn() },
    cachedDispatches: { toArray: vi.fn().mockResolvedValue([{ id: 'd1', challan_no: '201' }]), bulkPut: vi.fn() },
    cachedExpenses: { toArray: vi.fn().mockResolvedValue([]), bulkPut: vi.fn() },
    cachedPayments: { toArray: vi.fn().mockResolvedValue([]), bulkPut: vi.fn() },
  },
}))

describe('autoBackupService ("The Oops Button")', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: mockLocalStorage,
        dispatchEvent: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  it('takes an auto snapshot and stores it in localStorage', async () => {
    const summary = await takeAutoSnapshot('manual_checkpoint')

    expect(summary).toBeDefined()
    expect(summary.slot).toBe('latest')
    expect(summary.reason).toBe('manual_checkpoint')
    expect(summary.counts.parties).toBe(1)
    expect(summary.counts.receipts).toBe(1)
    expect(summary.counts.dispatches).toBe(1)

    const latest = getLatestAutoSnapshot()
    expect(latest).not.toBeNull()
    expect(latest?.id).toBe(summary.id)
  })

  it('rolls latest snapshot to previous slot on subsequent snapshot', async () => {
    const snap1 = await takeAutoSnapshot('daily_auto')
    const snap2 = await takeAutoSnapshot('manual_checkpoint')

    const latest = getLatestAutoSnapshot()
    const previous = getPreviousAutoSnapshot()

    expect(latest?.id).toBe(snap2.id)
    expect(previous?.id).toBe(snap1.id)
  })

  it('restores database state when Oops button is triggered', async () => {
    await takeAutoSnapshot('manual_checkpoint')

    const res = await restoreAutoSnapshot('latest')
    expect(res.success).toBe(true)
    expect(res.message).toContain('Successfully restored')
    expect(res.restoredCounts?.parties).toBe(1)
  })

  it('runs daily snapshot check only once per day', async () => {
    const ranFirstTime = await checkAndRunDailyAutoSnapshot()
    expect(ranFirstTime).toBe(true)

    const ranSecondTime = await checkAndRunDailyAutoSnapshot()
    expect(ranSecondTime).toBe(false)
  })

  it('fails gracefully when no snapshot is available to restore', async () => {
    const res = await restoreAutoSnapshot('previous')
    expect(res.success).toBe(false)
    expect(res.message).toContain('No previous snapshot found')
  })
})
