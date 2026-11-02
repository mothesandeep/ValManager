/**
 * appLockService.ts
 *
 * Robust, secure PIN and session lock management for Kasab Val Manager.
 *
 * Session unlock state is tracked strictly in memory / sessionStorage (never
 * permanently persisted in localStorage) so that closing or backgrounding
 * the app past the configured timeout safely locks the application again.
 */

export type AutoLockTimeout = 'immediately' | '30s' | '1m' | '5m' | '1h' | '1d' | 'never'

export const DEFAULT_PIN = import.meta.env.VITE_MASTER_PIN || '7878'
export const STORAGE_KEY_CUSTOM_PIN = 'KASAB_CUSTOM_PIN'
export const STORAGE_KEY_AUTOLOCK_TIMEOUT = 'KASAB_AUTOLOCK_TIMEOUT'
export const STORAGE_KEY_PERSISTENT_TOKEN = 'KASAB_PERSISTENT_AUTH_TOKEN'
export const STORAGE_KEY_REMEMBER_DEVICE = 'KASAB_REMEMBER_DEVICE'
export const SESSION_KEY_UNLOCKED = 'KASAB_SESSION_UNLOCKED'
export const SESSION_KEY_CURRENT_PIN = 'KASAB_CURRENT_PIN'
export const SESSION_KEY_MASTER_PIN = 'KASAB_MASTER_PIN'
export const SESSION_KEY_BG_TIME = 'KASAB_BG_TIMESTAMP'

export interface PersistentAuthPayload {
  token: string
  createdAt: number
  expiresAt: number
  pinHash: string
}

/**
 * Deterministic salted hash of the PIN so changing the PIN immediately invalidates
 * any old long-lived persistent device tokens across other browsers.
 */
export function computePinHash(pin: string): string {
  let hash = 0
  const salted = `kasab_val_manager_salt_${pin}_secure_erp`
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // 32bit int
  }
  return String(Math.abs(hash))
}

/**
 * Creates and saves a secure, long-lived authentication token in persistent localStorage.
 * Default validity: 30 days. Keeps the sole operator logged in across tabs and browser restarts.
 */
export function createPersistentAuthToken(pin: string, durationDays = 30): void {
  const storage = getSafeStorage('local')
  if (!storage) return

  try {
    let randomToken = ''
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      randomToken = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    } else {
      randomToken = Math.random().toString(36).slice(2) + Date.now().toString(36)
    }

    const payload: PersistentAuthPayload = {
      token: randomToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      pinHash: computePinHash(pin),
    }

    storage.setItem(STORAGE_KEY_PERSISTENT_TOKEN, JSON.stringify(payload))
    storage.setItem(STORAGE_KEY_REMEMBER_DEVICE, 'true')
  } catch (err) {
    console.warn('[appLockService] Failed to create persistent auth token:', err)
  }
}

/**
 * Checks whether a valid persistent authentication token is present in localStorage.
 * Verifies both the expiration timestamp and that the master PIN has not changed.
 */
export function isPersistentTokenValid(): boolean {
  const storage = getSafeStorage('local')
  if (!storage) return false

  try {
    const remember = storage.getItem(STORAGE_KEY_REMEMBER_DEVICE)
    if (remember !== 'true') return false

    const raw = storage.getItem(STORAGE_KEY_PERSISTENT_TOKEN)
    if (!raw) return false

    const payload: PersistentAuthPayload = JSON.parse(raw)
    if (!payload || !payload.token || !payload.expiresAt) return false

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      clearPersistentAuthToken()
      return false
    }

    // Check if stored PIN was changed
    const currentPin = getStoredPin()
    if (payload.pinHash !== computePinHash(currentPin)) {
      clearPersistentAuthToken()
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Clears and revokes the persistent authentication token from this personal computer.
 */
export function clearPersistentAuthToken(): void {
  const storage = getSafeStorage('local')
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY_PERSISTENT_TOKEN)
    storage.removeItem(STORAGE_KEY_REMEMBER_DEVICE)
  } catch {}
}

/**
 * Returns true if this device/browser is remembered with an active long-lived token.
 */
export function isDeviceRemembered(): boolean {
  return isPersistentTokenValid()
}

function getSafeStorage(type: 'local' | 'session'): Storage | null {
  if (typeof window !== 'undefined') {
    try {
      return type === 'local' ? window.localStorage : window.sessionStorage
    } catch {}
  }
  if (typeof globalThis !== 'undefined') {
    try {
      return type === 'local' ? (globalThis as any).localStorage : (globalThis as any).sessionStorage
    } catch {}
  }
  return null
}

/**
 * Get the currently configured PIN.
 * Returns custom user-set PIN if present, otherwise environment or default PIN.
 */
export function getStoredPin(): string {
  const storage = getSafeStorage('local')
  if (storage) {
    try {
      const custom = storage.getItem(STORAGE_KEY_CUSTOM_PIN)
      if (custom && custom.trim().length >= 4) {
        return custom.trim()
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_PIN
}

/**
 * Verify if the entered PIN matches the stored PIN.
 */
export function verifyPin(enteredPin: string): boolean {
  if (!enteredPin) return false
  const expected = getStoredPin()
  return enteredPin.trim() === expected.trim()
}

/**
 * Update the stored PIN to a new PIN.
 * Also synchronizes current session PIN state.
 */
export function setStoredPin(newPin: string): void {
  const cleanPin = newPin.trim()
  if (cleanPin.length < 4) {
    throw new Error('PIN must be at least 4 digits')
  }
  const localStorage = getSafeStorage('local')
  if (localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PIN, cleanPin)
    } catch (err) {
      console.warn('[appLockService] Failed to persist new PIN:', err)
    }
  }

  // Invalidate old persistent tokens when PIN is changed
  clearPersistentAuthToken()

  // Synchronize active session if unlocked
  if (isSessionUnlocked()) {
    const sessionStorage = getSafeStorage('session')
    if (sessionStorage) {
      try {
        sessionStorage.setItem(SESSION_KEY_CURRENT_PIN, cleanPin)
        sessionStorage.setItem(SESSION_KEY_MASTER_PIN, cleanPin)
      } catch {}
    }
  }
}

/**
 * Check if the app is currently unlocked in this session.
 * Checks temporary sessionStorage, and falls back to persistent device authorization token.
 */
export function isSessionUnlocked(): boolean {
  const storage = getSafeStorage('session')
  if (storage) {
    try {
      if (storage.getItem(SESSION_KEY_UNLOCKED) === 'true') {
        return true
      }
    } catch {
      return false
    }
  }

  // Reconstitute session from persistent token if device is remembered on personal computer
  if (isPersistentTokenValid()) {
    setSessionUnlocked(true, getStoredPin())
    return true
  }

  return false
}

/**
 * Update the session unlock state.
 */
export function setSessionUnlocked(unlocked: boolean, pin?: string): void {
  const storage = getSafeStorage('session')
  if (!storage) return

  try {
    if (unlocked) {
      storage.setItem(SESSION_KEY_UNLOCKED, 'true')
      const activePin = (pin && pin.trim()) || getStoredPin()
      storage.setItem(SESSION_KEY_CURRENT_PIN, activePin)
      storage.setItem(SESSION_KEY_MASTER_PIN, activePin)
      storage.removeItem(SESSION_KEY_BG_TIME)
    } else {
      storage.removeItem(SESSION_KEY_UNLOCKED)
      storage.removeItem(SESSION_KEY_CURRENT_PIN)
      storage.removeItem(SESSION_KEY_MASTER_PIN)
      storage.removeItem(SESSION_KEY_BG_TIME)
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get active PIN for Supabase `x-app-pin` request headers.
 */
export function getAppPin(): string {
  const storage = getSafeStorage('session')
  if (storage) {
    try {
      const current = storage.getItem(SESSION_KEY_CURRENT_PIN) || storage.getItem(SESSION_KEY_MASTER_PIN)
      if (current) return current
    } catch {}
  }
  return getStoredPin()
}

/**
 * Get configured auto-lock timeout. Default: 30 seconds.
 */
export function getAutoLockTimeout(): AutoLockTimeout {
  const storage = getSafeStorage('local')
  if (storage) {
    try {
      const val = storage.getItem(STORAGE_KEY_AUTOLOCK_TIMEOUT)
      if (
        val === 'immediately' ||
        val === '30s' ||
        val === '1m' ||
        val === '5m' ||
        val === '1h' ||
        val === '1d' ||
        val === 'never'
      ) {
        return val as AutoLockTimeout
      }
    } catch {}
  }
  return '30s'
}

/**
 * Save configured auto-lock timeout.
 */
export function setAutoLockTimeout(timeout: AutoLockTimeout): void {
  const storage = getSafeStorage('local')
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY_AUTOLOCK_TIMEOUT, timeout)
    } catch (err) {
      console.warn('[appLockService] Failed to save auto-lock timeout:', err)
    }
  }
}

/**
 * Convert auto-lock timeout setting to milliseconds.
 */
export function getAutoLockTimeoutMs(timeout: AutoLockTimeout = getAutoLockTimeout()): number {
  switch (timeout) {
    case 'immediately':
      return 0
    case '30s':
      return 30 * 1000
    case '1m':
      return 60 * 1000
    case '5m':
      return 5 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    case '1d':
      return 24 * 60 * 60 * 1000
    case 'never':
      return Infinity
    default:
      return 30 * 1000
  }
}

/**
 * Record timestamp when the app is minimized / sent to background.
 */
export function markAppBackgrounded(): void {
  const storage = getSafeStorage('session')
  if (storage) {
    try {
      storage.setItem(SESSION_KEY_BG_TIME, String(Date.now()))
    } catch {}
  }
}

/**
 * Check if the background duration exceeded the configured auto-lock timeout.
 * Returns true if the app should now be locked.
 */
export function shouldLockOnResume(timeout: AutoLockTimeout = getAutoLockTimeout()): boolean {
  if (timeout === 'never') return false
  if (!isSessionUnlocked()) return true

  const timeoutMs = getAutoLockTimeoutMs(timeout)
  if (timeoutMs === 0) return true
  if (timeoutMs === Infinity) return false

  const storage = getSafeStorage('session')
  if (!storage) return false

  try {
    const bgStr = storage.getItem(SESSION_KEY_BG_TIME)
    if (!bgStr) return false
    const bgTime = Number(bgStr)
    if (!bgTime || isNaN(bgTime)) return false

    const elapsed = Date.now() - bgTime
    return elapsed >= timeoutMs
  } catch {
    return false
  }
}
