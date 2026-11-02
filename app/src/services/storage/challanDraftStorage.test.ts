import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveScannerDraft,
  loadScannerDraft,
  loadScannerDraftSync,
  clearScannerDraft,
  isScannerDraftDirty,
  saveInwardManualDraft,
  loadInwardManualDraft,
  clearInwardManualDraft,
  saveDispatchManualDraft,
  loadDispatchManualDraft,
  clearDispatchManualDraft,
  savePartyDraft,
  loadPartyDraft,
  clearPartyDraft,
  saveExpenseDraft,
  loadExpenseDraft,
  clearExpenseDraft,
  savePaymentDraft,
  loadPaymentDraft,
  clearPaymentDraft,
  registerAppBackgroundListener,
  DRAFT_KEY_GENERIC,
  DRAFT_KEY_INWARD,
  DRAFT_KEY_OUTWARD,
  type ScannerDraft,
} from './challanDraftStorage'

// Simple in-memory mock storage
const mockStorage = (() => {
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
})()

describe('challanDraftStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    })
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      })
    }
    mockStorage.clear()
    vi.clearAllMocks()
  })

  it('correctly identifies dirty and clean drafts', () => {
    expect(isScannerDraftDirty({})).toBe(false)
    expect(isScannerDraftDirty({ challanNo: '   ' })).toBe(false)
    expect(isScannerDraftDirty({ challanNo: '489' })).toBe(true)
    expect(isScannerDraftDirty({ selectedPartyName: 'Vijay bhai' })).toBe(true)
    expect(isScannerDraftDirty({ notes: 'urgent' })).toBe(true)
    expect(
      isScannerDraftDirty({
        type: 'INWARD',
        inwardBags: [
          {
            id: '1',
            gross: '27.23',
            grossNum: 27.23,
            rola: 59,
            rolaCount: '59',
            perRolaGrams: '125',
            color: 'M.gold',
            twist: 'S',
            twistType: 'S',
            rolaType: 'NORM',
            sizeType: 'Norm',
            tare: 7.375,
            net: 19.855,
          },
        ],
      })
    ).toBe(true)
  })

  it('saves and loads scanner draft synchronously and asynchronously', async () => {
    const draft: ScannerDraft = {
      type: 'INWARD',
      isModalOpen: true,
      challanNo: '501',
      date: '2026-10-30',
      selectedPartyName: 'Ramesh Patel',
      selectedPartyId: 'p1',
      partySearch: 'Ramesh',
      notes: 'Test note',
      savedAt: Date.now(),
      inwardBags: [
        {
          id: 'b1',
          gross: '30.500',
          grossNum: 30.5,
          rola: 60,
          rolaCount: '60',
          perRolaGrams: '125',
          color: 'M.gold',
          twist: 'S',
          twistType: 'S',
          rolaType: 'NORM',
          sizeType: 'Norm',
          tare: 7.5,
          net: 23.0,
        },
      ],
    }

    await saveScannerDraft(draft)

    // Check localStorage keys
    expect(mockStorage.getItem(DRAFT_KEY_INWARD)).not.toBeNull()
    expect(mockStorage.getItem(DRAFT_KEY_GENERIC)).not.toBeNull()

    const syncLoaded = loadScannerDraftSync('INWARD')
    expect(syncLoaded).not.toBeNull()
    expect(syncLoaded?.challanNo).toBe('501')
    expect(syncLoaded?.selectedPartyName).toBe('Ramesh Patel')
    expect(syncLoaded?.inwardBags).toHaveLength(1)

    const asyncLoaded = await loadScannerDraft('INWARD')
    expect(asyncLoaded?.challanNo).toBe('501')
  })

  it('clears scanner draft completely from storage', async () => {
    const draft: ScannerDraft = {
      type: 'OUTWARD',
      isModalOpen: true,
      challanNo: '999',
      date: '2026-10-30',
      selectedPartyName: 'Suresh',
      selectedPartyId: 'p2',
      partySearch: '',
      notes: '',
      savedAt: Date.now(),
    }

    await saveScannerDraft(draft)
    expect(mockStorage.getItem(DRAFT_KEY_OUTWARD)).not.toBeNull()
    expect(mockStorage.getItem(DRAFT_KEY_GENERIC)).not.toBeNull()

    await clearScannerDraft('OUTWARD')
    expect(mockStorage.getItem(DRAFT_KEY_OUTWARD)).toBeNull()
    expect(mockStorage.getItem(DRAFT_KEY_GENERIC)).toBeNull()
    expect(loadScannerDraftSync('OUTWARD')).toBeNull()
  })

  it('persists and restores Inward Manual draft', () => {
    const manualDraft = {
      isOpen: true,
      editingId: null,
      header: {
        partyId: 'p3',
        date: '2026-10-30',
        challanNo: '102',
      },
      rememberedPerRola: '125',
      bags: [
        {
          id: 'm1',
          gross: '25.0',
          rolaCount: '50',
          perRolaGrams: '125',
          color: 'M.gold',
          twistType: 'S' as const,
          sizeType: 'Norm' as const,
        },
      ],
      savedAt: Date.now(),
    }

    saveInwardManualDraft(manualDraft)
    const loaded = loadInwardManualDraft()
    expect(loaded?.header.challanNo).toBe('102')
    expect(loaded?.bags).toHaveLength(1)

    clearInwardManualDraft()
    expect(loadInwardManualDraft()).toBeNull()
  })

  it('persists and restores Dispatch Manual draft', () => {
    const dispatchDraft = {
      isOpen: true,
      editingId: null,
      header: {
        partyId: 'p4',
        date: '2026-10-30',
        dispatchType: 'Val' as const,
        challanNo: '404',
      },
      rememberedBungariWeight: '70',
      valBags: [
        {
          id: 'v1',
          gross: '20.0',
          bungariCount: '10',
          tar: '8',
          twistType: 'S' as const,
        },
      ],
      rolaBags: [],
      savedAt: Date.now(),
    }

    saveDispatchManualDraft(dispatchDraft)
    const loaded = loadDispatchManualDraft()
    expect(loaded?.header.challanNo).toBe('404')
    expect(loaded?.valBags).toHaveLength(1)

    clearDispatchManualDraft()
    expect(loadDispatchManualDraft()).toBeNull()
  })

  it('persists and restores Party draft', () => {
    const partyForm = {
      id: null,
      name: 'Ramesh Patel Jari Wala',
      phone: '9876543210',
      address: 'Ring Road, Surat',
      notes: 'Job work client for 120D',
      aliases: 'RP, Patel Jari',
      rolaWeight: '205',
      bungariWeight: '70',
    }

    savePartyDraft(partyForm)
    const loaded = loadPartyDraft()
    expect(loaded?.name).toBe('Ramesh Patel Jari Wala')
    expect(loaded?.phone).toBe('9876543210')
    expect(loaded?.notes).toBe('Job work client for 120D')

    clearPartyDraft()
    expect(loadPartyDraft()).toBeNull()
  })

  it('persists and restores Expense draft', () => {
    const expenseForm = {
      id: null,
      date: '2026-11-01',
      category: 'Tea / Refreshments',
      amount: '350',
      note: 'Afternoon snacks for karigars',
      paymentMode: 'Cash' as const,
    }

    saveExpenseDraft(expenseForm)
    const loaded = loadExpenseDraft()
    expect(loaded?.amount).toBe('350')
    expect(loaded?.category).toBe('Tea / Refreshments')
    expect(loaded?.note).toBe('Afternoon snacks for karigars')

    clearExpenseDraft()
    expect(loadExpenseDraft()).toBeNull()
  })

  it('persists and restores Payment draft', () => {
    const paymentForm = {
      id: null,
      partyId: 'p-101',
      date: '2026-11-01',
      amount: '15000',
      mode: 'UPI / Online' as const,
      reference: 'UPI/AXIS/2938104',
      isSplit: false,
      split: {
        cash: '',
        upi: '',
        upiRef: '',
        cheque: '',
        chequeRef: '',
        bankTransfer: '',
        bankRef: '',
      },
    }

    savePaymentDraft(paymentForm)
    const loaded = loadPaymentDraft()
    expect(loaded?.amount).toBe('15000')
    expect(loaded?.partyId).toBe('p-101')
    expect(loaded?.reference).toBe('UPI/AXIS/2938104')

    clearPaymentDraft()
    expect(loadPaymentDraft()).toBeNull()
  })

  it('triggers registerAppBackgroundListener callback on visibilitychange or pagehide', () => {
    const windowListeners: Record<string, Function[]> = {}
    const docListeners: Record<string, Function[]> = {}

    const origWindow = (globalThis as any).window
    const origDoc = (globalThis as any).document

    ;(globalThis as any).window = {
      addEventListener: (type: string, fn: Function) => {
        windowListeners[type] = windowListeners[type] || []
        windowListeners[type].push(fn)
      },
      removeEventListener: (type: string, fn: Function) => {
        if (windowListeners[type]) {
          windowListeners[type] = windowListeners[type].filter((cb) => cb !== fn)
        }
      },
    }

    ;(globalThis as any).document = {
      visibilityState: 'visible',
      addEventListener: (type: string, fn: Function) => {
        docListeners[type] = docListeners[type] || []
        docListeners[type].push(fn)
      },
      removeEventListener: (type: string, fn: Function) => {
        if (docListeners[type]) {
          docListeners[type] = docListeners[type].filter((cb) => cb !== fn)
        }
      },
    }

    try {
      const bgCallback = vi.fn()
      const unsubscribe = registerAppBackgroundListener(bgCallback)

      // Simulate pagehide
      windowListeners['pagehide']?.forEach((cb) => cb())
      expect(bgCallback).toHaveBeenCalledTimes(1)

      // Simulate visibility change to hidden
      ;(globalThis as any).document.visibilityState = 'hidden'
      docListeners['visibilitychange']?.forEach((cb) => cb())
      expect(bgCallback).toHaveBeenCalledTimes(2)

      unsubscribe()

      // After unsubscribe, shouldn't trigger
      windowListeners['pagehide']?.forEach((cb) => cb())
      expect(bgCallback).toHaveBeenCalledTimes(2)
    } finally {
      ;(globalThis as any).window = origWindow
      ;(globalThis as any).document = origDoc
    }
  })
})
