/**
 * Trash & Archive Bin Service
 * Provides soft-delete preservation so deleted records (Challans, Dispatches, Payments, Expenses, Parties)
 * can be reviewed and restored anytime, even after the 5-second Undo banner has elapsed.
 */

export type TrashItemType = 'receipt' | 'dispatch' | 'payment' | 'expense' | 'party'

export interface TrashItem {
  id: string
  type: TrashItemType
  title: string
  subtitle?: string
  deletedAt: string
  payload: any
}

const TRASH_STORAGE_KEY = 'valmanager_trash_bin'
const MAX_RETENTION_DAYS = 30

/**
 * Loads all trash bin items from local storage, filtering out items older than 30 days.
 */
export function getTrashBinItems(): TrashItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY)
    if (!raw) return []
    const parsed: TrashItem[] = JSON.parse(raw)
    const cutoff = Date.now() - MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000

    // Filter valid unexpired items
    const valid = parsed.filter((item) => {
      const time = new Date(item.deletedAt).getTime()
      return !isNaN(time) && time >= cutoff
    })

    if (valid.length !== parsed.length) {
      saveTrashBinItems(valid)
    }

    return valid.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1))
  } catch (err) {
    console.warn('[trashBinService] Failed to load trash items:', err)
    return []
  }
}

/**
 * Saves trash items array to localStorage.
 */
function saveTrashBinItems(items: TrashItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('kasab:trash-updated', { detail: { count: items.length } }))
  } catch (err) {
    console.warn('[trashBinService] Failed to save trash items:', err)
  }
}

/**
 * Moves a deleted item into the Trash Bin.
 */
export function addToTrashBin(item: Omit<TrashItem, 'deletedAt'>): void {
  const current = getTrashBinItems()
  // Avoid duplicates
  const filtered = current.filter((i) => !(i.id === item.id && i.type === item.type))
  const newItem: TrashItem = {
    ...item,
    deletedAt: new Date().toISOString(),
  }
  saveTrashBinItems([newItem, ...filtered])
}

/**
 * Permanently deletes a single item from the trash bin.
 */
export function permanentlyDeleteTrashItem(id: string, type: TrashItemType): void {
  const current = getTrashBinItems()
  const updated = current.filter((i) => !(i.id === id && i.type === type))
  saveTrashBinItems(updated)
}

/**
 * Clears all items permanently from the trash bin.
 */
export function clearTrashBin(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRASH_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('kasab:trash-updated', { detail: { count: 0 } }))
}

/**
 * Restores an item from the trash bin using its stored payload and original entity inserter.
 */
export async function restoreFromTrashBin(
  item: TrashItem,
  onRestore: (payload: any) => Promise<void>
): Promise<boolean> {
  try {
    await onRestore(item.payload)
    permanentlyDeleteTrashItem(item.id, item.type)
    return true
  } catch (err) {
    console.error('[trashBinService] Failed to restore item:', err)
    return false
  }
}

