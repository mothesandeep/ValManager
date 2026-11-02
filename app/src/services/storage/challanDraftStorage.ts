import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { db, saveChallanImageOffline } from '@/lib/offline/db'

export const DRAFT_KEY_GENERIC = 'valmanager_active_challan_draft'
export const DRAFT_KEY_INWARD = 'valmanager_active_challan_draft_INWARD'
export const DRAFT_KEY_OUTWARD = 'valmanager_active_challan_draft_OUTWARD'
export const DRAFT_KEY_INWARD_MANUAL = 'valmanager_inward_manual_draft'
export const DRAFT_KEY_DISPATCH_MANUAL = 'valmanager_dispatch_manual_draft'
export const DRAFT_KEY_PARTY = 'valmanager_party_draft'
export const DRAFT_KEY_EXPENSE = 'valmanager_expense_draft'
export const DRAFT_KEY_PAYMENT = 'valmanager_payment_draft'

export interface InwardDraftBag {
  id: string
  gross: string
  grossNum?: number
  rola: number
  rolaCount: string
  perRolaGrams: string
  color: string | null
  twist: 'S' | 'Z' | null
  twistType: 'S' | 'Z' | null
  spool_type?: 'NORMAL' | 'BIG' | null
  rolaType: 'NORM' | 'BIG'
  sizeType: 'Norm' | 'Big'
  tare: number
  net: number
}

export interface OutwardDraftBag {
  id: string
  bag_no?: number
  gross: string
  bungariCount: string
  rolaCount?: string
  tar: string
  twistType: 'S' | 'Z' | 'S+Z' | ''
  tareKg?: number
  netKg?: number
  rate?: number
  amount?: number
}

export interface ScannerDraft {
  type: 'INWARD' | 'OUTWARD'
  isModalOpen: boolean
  challanNo: string
  date: string
  selectedPartyName: string
  selectedPartyId: string
  partySearch: string
  inwardBags?: InwardDraftBag[]
  outwardDispatchType?: 'Val' | 'Rola'
  outwardValBags?: OutwardDraftBag[]
  outwardRolaBags?: OutwardDraftBag[]
  ocrSlipAmount?: number | null
  manualTotalOverride?: string | null
  notes: string
  isPdfFile?: boolean
  imageBase64?: string | null
  savedAt: number
}

export interface InwardManualDraft {
  isOpen: boolean
  editingId: string | null
  header: {
    partyId: string
    date: string
    challanNo: string
  }
  rememberedPerRola: string
  bags: Array<{
    id: string
    gross: string
    rolaCount: string
    perRolaGrams: string
    color: string | null
    twistType: 'S' | 'Z' | null
    sizeType: 'Norm' | 'Big'
  }>
  savedAt: number
}

export interface DispatchManualDraft {
  isOpen: boolean
  editingId: string | null
  header: {
    partyId: string
    date: string
    dispatchType: 'Val' | 'Rola'
    challanNo: string
  }
  rememberedBungariWeight: string
  valBags: Array<{
    id: string
    gross: string
    bungariCount: string
    rolaCount?: string
    tar: string
    twistType: 'S' | 'Z' | 'S+Z'
  }>
  rolaBags: Array<{
    id: string
    gross: string
    bungariCount: string
    rolaCount?: string
    tar: string
    twistType: 'S' | 'Z' | 'S+Z'
  }>
  savedAt: number
}

const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage
  }
  return null
}

function getDraftStorageKey(type: 'INWARD' | 'OUTWARD'): string {
  return type === 'INWARD' ? DRAFT_KEY_INWARD : DRAFT_KEY_OUTWARD
}

/**
 * Checks if a scanner draft has non-empty/meaningful entered data
 */
export function isScannerDraftDirty(draft: Partial<ScannerDraft>): boolean {
  if (draft.imageBase64 && draft.imageBase64.length > 50) return true
  if (draft.challanNo && draft.challanNo.trim().length > 0) return true
  if (draft.selectedPartyName && draft.selectedPartyName.trim().length > 0) return true
  if (draft.notes && draft.notes.trim().length > 0) return true

  if (draft.type === 'INWARD' && draft.inwardBags) {
    const hasData = draft.inwardBags.some(
      (b) =>
        (b.gross && b.gross.trim() !== '') ||
        (b.rolaCount && b.rolaCount.trim() !== '') ||
        (typeof b.grossNum === 'number' && b.grossNum > 0)
    )
    if (hasData || draft.inwardBags.length > 1) return true
  }

  if (draft.type === 'OUTWARD') {
    if (draft.outwardValBags) {
      const hasValData = draft.outwardValBags.some(
        (b) =>
          (b.gross && b.gross.trim() !== '') ||
          (b.bungariCount && b.bungariCount.trim() !== '') ||
          (b.tar && b.tar.trim() !== '')
      )
      if (hasValData || draft.outwardValBags.length > 1) return true
    }
    if (draft.outwardRolaBags) {
      const hasRolaData = draft.outwardRolaBags.some(
        (b) => b.gross && b.gross.trim() !== ''
      )
      if (hasRolaData || draft.outwardRolaBags.length > 1) return true
    }
  }

  return false
}

/**
 * Synchronous check if a valid draft exists in localStorage
 */
export function loadScannerDraftSync(type: 'INWARD' | 'OUTWARD'): ScannerDraft | null {
  const storage = getStorage()
  if (!storage) return null
  const key = getDraftStorageKey(type)
  try {
    const raw = storage.getItem(key) || storage.getItem(DRAFT_KEY_GENERIC)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScannerDraft
    if (!parsed || parsed.type !== type) return null
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(key)
      return null
    }
    return parsed
  } catch (err) {
    console.warn('[ChallanDraft] Failed to load draft synchronously:', err)
    return null
  }
}

/**
 * Persist active scanner state into localStorage & offline Dexie IndexedDB
 */
export async function saveScannerDraft(draft: ScannerDraft): Promise<void> {
  const storage = getStorage()
  if (!storage) return
  const key = getDraftStorageKey(draft.type)
  const imageBase64 = draft.imageBase64 || null

  // Create lightweight metadata payload (omits huge base64 if needed)
  const draftToSave: ScannerDraft = {
    ...draft,
    savedAt: Date.now(),
  }

  // 1. If image exists, save to Dexie offline store for guaranteed quota survival
  if (imageBase64) {
    try {
      await saveChallanImageOffline({
        id: `draft_${draft.type}`,
        challan_no: draft.challanNo,
        date: draft.date,
        base64: imageBase64,
      })
    } catch (e) {
      console.warn('[ChallanDraft] Could not save draft image to Dexie:', e)
    }
  }

  // 2. Persist to localStorage (both typed and generic keys)
  try {
    const serialized = JSON.stringify(draftToSave)
    storage.setItem(key, serialized)
    storage.setItem(DRAFT_KEY_GENERIC, serialized)
  } catch (err) {
    // If quota exceeded due to large image, store metadata without imageBase64
    console.warn('[ChallanDraft] LocalStorage write error, attempting stripped write:', err)
    try {
      const stripped = JSON.stringify({ ...draftToSave, imageBase64: null })
      storage.setItem(key, stripped)
      storage.setItem(DRAFT_KEY_GENERIC, stripped)
    } catch {
      // storage completely exhausted
    }
  }
}

/**
 * Asynchronously load active scanner draft, rehydrating image from Dexie if needed
 */
export async function loadScannerDraft(type: 'INWARD' | 'OUTWARD'): Promise<ScannerDraft | null> {
  const draft = loadScannerDraftSync(type)
  if (!draft) return null

  // If draft didn't have image in localStorage, try rehydrating from Dexie
  if (!draft.imageBase64) {
    try {
      if (db.challanImages) {
        const cached = await db.challanImages.get(`draft_${type}`)
        if (cached && cached.base64) {
          draft.imageBase64 = cached.base64
        }
      }
    } catch (err) {
      console.warn('[ChallanDraft] Could not query Dexie draft image:', err)
    }
  }

  return draft
}

/**
 * Completely clear active scanner draft from localStorage and Dexie
 */
export async function clearScannerDraft(type: 'INWARD' | 'OUTWARD'): Promise<void> {
  const storage = getStorage()
  if (!storage) return
  const key = getDraftStorageKey(type)
  try {
    storage.removeItem(key)
    const genericRaw = storage.getItem(DRAFT_KEY_GENERIC)
    if (genericRaw) {
      try {
        const generic = JSON.parse(genericRaw)
        if (generic?.type === type) {
          storage.removeItem(DRAFT_KEY_GENERIC)
        }
      } catch {
        storage.removeItem(DRAFT_KEY_GENERIC)
      }
    }

    if (db.challanImages) {
      await db.challanImages.delete(`draft_${type}`).catch(() => {})
    }
  } catch (err) {
    console.warn('[ChallanDraft] Failed to clear draft:', err)
  }
}

/**
 * Inward Manual Entry Draft Methods
 */
export function saveInwardManualDraft(draft: InwardManualDraft): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(
      DRAFT_KEY_INWARD_MANUAL,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    )
  } catch (e) {
    console.warn('[ChallanDraft] Failed to save inward manual draft:', e)
  }
}

export function loadInwardManualDraft(): InwardManualDraft | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY_INWARD_MANUAL)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InwardManualDraft
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(DRAFT_KEY_INWARD_MANUAL)
      return null
    }
    return parsed
  } catch (e) {
    console.warn('[ChallanDraft] Failed to load inward manual draft:', e)
    return null
  }
}

export function clearInwardManualDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY_INWARD_MANUAL)
  } catch {}
}

/**
 * Dispatch Manual Entry Draft Methods
 */
export function saveDispatchManualDraft(draft: DispatchManualDraft): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(
      DRAFT_KEY_DISPATCH_MANUAL,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    )
  } catch (e) {
    console.warn('[ChallanDraft] Failed to save dispatch manual draft:', e)
  }
}

export function loadDispatchManualDraft(): DispatchManualDraft | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY_DISPATCH_MANUAL)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DispatchManualDraft
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(DRAFT_KEY_DISPATCH_MANUAL)
      return null
    }
    return parsed
  } catch (e) {
    console.warn('[ChallanDraft] Failed to load dispatch manual draft:', e)
    return null
  }
}

export function clearDispatchManualDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY_DISPATCH_MANUAL)
  } catch {}
}

export interface PartyDraftState {
  id: string | null
  name: string
  phone: string
  address: string
  notes: string
  aliases: string
  rolaWeight: string
  bungariWeight: string
}

export function savePartyDraft(form: PartyDraftState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(DRAFT_KEY_PARTY, JSON.stringify({ form, savedAt: Date.now() }))
  } catch (e) {
    console.warn('[ChallanDraft] Failed to save party draft:', e)
  }
}

export function loadPartyDraft(): PartyDraftState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY_PARTY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(DRAFT_KEY_PARTY)
      return null
    }
    return parsed.form
  } catch {
    return null
  }
}

export function clearPartyDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY_PARTY)
  } catch {}
}

export interface ExpenseDraftState {
  id: string | null
  date: string
  category: string
  amount: string
  note: string
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer'
}

export function saveExpenseDraft(form: ExpenseDraftState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(DRAFT_KEY_EXPENSE, JSON.stringify({ form, savedAt: Date.now() }))
  } catch (e) {
    console.warn('[ChallanDraft] Failed to save expense draft:', e)
  }
}

export function loadExpenseDraft(): ExpenseDraftState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY_EXPENSE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(DRAFT_KEY_EXPENSE)
      return null
    }
    return parsed.form
  } catch {
    return null
  }
}

export function clearExpenseDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY_EXPENSE)
  } catch {}
}

export interface PaymentDraftState {
  id: string | null
  partyId: string
  date: string
  amount: string
  mode: any
  reference?: string
  isSplit?: boolean
  split?: {
    cash: string
    upi: string
    upiRef: string
    cheque: string
    chequeRef: string
    bankTransfer: string
    bankRef: string
  }
  chequeNumber?: string
  bankName?: string
  referenceNumber?: string
  notes?: string
}

export function savePaymentDraft(form: PaymentDraftState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(DRAFT_KEY_PAYMENT, JSON.stringify({ form, savedAt: Date.now() }))
  } catch (e) {
    console.warn('[ChallanDraft] Failed to save payment draft:', e)
  }
}

export function loadPaymentDraft(): PaymentDraftState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY_PAYMENT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_EXPIRY_MS) {
      storage.removeItem(DRAFT_KEY_PAYMENT)
      return null
    }
    return parsed.form
  } catch {
    return null
  }
}

export function clearPaymentDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY_PAYMENT)
  } catch {}
}

/**
 * Lifecycle hook: executes immediate save callback when mobile app backgrounds or page unloads
 */
export function registerAppBackgroundListener(onBackground: () => void): () => void {
  let removeCapListener: (() => void) | null = null

  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        onBackground()
      }
    })
      .then((handle) => {
        removeCapListener = () => {
          void handle.remove()
        }
      })
      .catch(() => {})
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      onBackground()
    }
  }

  const handlePageHide = () => {
    onBackground()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)
  }

  return () => {
    if (removeCapListener) removeCapListener()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
    }
  }
}
