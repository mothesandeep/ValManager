/**
 * Enterprise-grade type-safe LocalStorage adapter
 */

export const LocalStorageService = {
  getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = window.localStorage.getItem(key)
      if (item === null) return defaultValue
      return JSON.parse(item) as T
    } catch {
      return (window.localStorage.getItem(key) as unknown as T) ?? defaultValue
    }
  },

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      window.localStorage.setItem(key, serialized)
    } catch (e) {
      console.warn(`[LocalStorageService] Failed to set "${key}":`, e)
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch (e) {
      console.warn(`[LocalStorageService] Failed to remove "${key}":`, e)
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.clear()
    } catch (e) {
      console.warn('[LocalStorageService] Failed to clear storage:', e)
    }
  },
}
