import { db, isQuotaExceededError, pruneOldImagesForQuota, type OfflineChallanImage } from './dexieClient'

export class ChallanImagesDbService {
  async saveImage(data: {
    id: string
    challan_no?: string
    date?: string
    blob?: Blob
    base64?: string
    public_url?: string
  }): Promise<void> {
    try {
      if (!db.challanImages) return
      await db.challanImages.put({
        ...data,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const pruned = await pruneOldImagesForQuota()
        if (pruned) {
          try {
            await db.challanImages.put({
              ...data,
              created_at: new Date().toISOString(),
            })
            return
          } catch {
            // Drop gracefully
          }
        }
      }
      console.warn('[Kasab OfflineDB] Failed to save challan image locally:', err)
    }
  }

  async getImage(id: string): Promise<OfflineChallanImage | undefined> {
    try {
      if (!db.challanImages) return undefined
      return await db.challanImages.get(id)
    } catch (err) {
      console.warn('[Kasab OfflineDB] Failed to get challan image locally:', err)
      return undefined
    }
  }

  async findImageByChallanNo(challanNo: string): Promise<OfflineChallanImage | undefined> {
    try {
      if (!db.challanImages) return undefined
      const cleanNo = String(challanNo || '').trim()
      if (!cleanNo) return undefined

      // 1. Direct index match
      const directMatch = await db.challanImages.where('challan_no').equals(cleanNo).first()
      if (directMatch) return directMatch

      // 2. Case-insensitive / normalized search
      const all = await db.challanImages.toArray()
      return all.find((item) => {
        if (!item.challan_no) return false
        const cur = String(item.challan_no).trim().toLowerCase()
        const target = cleanNo.toLowerCase()
        return cur === target || cur.replace(/^[#\s]+/, '') === target.replace(/^[#\s]+/, '')
      })
    } catch (err) {
      console.warn('[Kasab OfflineDB] Failed to find challan image by number:', err)
      return undefined
    }
  }

  async deleteImage(id: string): Promise<void> {
    try {
      if (db.challanImages) {
        await db.challanImages.delete(id)
      }
    } catch (err) {
      console.warn('[Kasab OfflineDB] Failed to delete challan image locally:', err)
    }
  }

  async pruneOldImages(): Promise<boolean> {
    return await pruneOldImagesForQuota()
  }
}

export const challanImagesDbService = new ChallanImagesDbService()
