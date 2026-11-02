import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredPin,
  verifyPin,
  setStoredPin,
  isSessionUnlocked,
  setSessionUnlocked,
  getAutoLockTimeout,
  setAutoLockTimeout,
  getAutoLockTimeoutMs,
  markAppBackgrounded,
  shouldLockOnResume,
  getAppPin,
  createPersistentAuthToken,
  isPersistentTokenValid,
  clearPersistentAuthToken,
  isDeviceRemembered,
  STORAGE_KEY_PERSISTENT_TOKEN,
  STORAGE_KEY_REMEMBER_DEVICE,
  SESSION_KEY_UNLOCKED,
  SESSION_KEY_BG_TIME,
  DEFAULT_PIN,
} from './appLockService'

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
const mockSessionStorage = createMockStorage()

describe('appLockService', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    mockSessionStorage.clear()

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    })
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
        configurable: true,
      })
    }
  })

  it('returns default PIN when no custom PIN is stored', () => {
    expect(getStoredPin()).toBe(DEFAULT_PIN)
  })

  it('correctly verifies the default PIN', () => {
    expect(verifyPin(DEFAULT_PIN)).toBe(true)
    expect(verifyPin('0000')).toBe(false)
    expect(verifyPin('')).toBe(false)
  })

  it('updates stored PIN and validates against the new PIN', () => {
    setStoredPin('4321')
    expect(getStoredPin()).toBe('4321')
    expect(verifyPin('4321')).toBe(true)
    expect(verifyPin(DEFAULT_PIN)).toBe(false)
  })

  it('rejects setting a PIN with less than 4 digits', () => {
    expect(() => setStoredPin('12')).toThrow('PIN must be at least 4 digits')
  })

  it('tracks session unlock state strictly in sessionStorage (never permanent localStorage)', () => {
    expect(isSessionUnlocked()).toBe(false)

    setSessionUnlocked(true, '7878')
    expect(isSessionUnlocked()).toBe(true)
    expect(mockSessionStorage.getItem(SESSION_KEY_UNLOCKED)).toBe('true')
    // Crucial check: localStorage must NOT have an unlocked flag
    expect(mockLocalStorage.getItem('unlocked')).toBeNull()

    setSessionUnlocked(false)
    expect(isSessionUnlocked()).toBe(false)
    expect(mockSessionStorage.getItem(SESSION_KEY_UNLOCKED)).toBeNull()
  })

  it('provides the correct app PIN for API headers', () => {
    setStoredPin('9999')
    setSessionUnlocked(true, '9999')
    expect(getAppPin()).toBe('9999')
  })

  it('manages auto-lock timeout preferences and converts to milliseconds', () => {
    expect(getAutoLockTimeout()).toBe('30s')
    expect(getAutoLockTimeoutMs('30s')).toBe(30000)
    expect(getAutoLockTimeoutMs('immediately')).toBe(0)
    expect(getAutoLockTimeoutMs('1m')).toBe(60000)
    expect(getAutoLockTimeoutMs('5m')).toBe(300000)

    setAutoLockTimeout('1m')
    expect(getAutoLockTimeout()).toBe('1m')

    setAutoLockTimeout('1h')
    expect(getAutoLockTimeout()).toBe('1h')
    expect(getAutoLockTimeoutMs('1h')).toBe(3600000)

    setAutoLockTimeout('1d')
    expect(getAutoLockTimeout()).toBe('1d')
    expect(getAutoLockTimeoutMs('1d')).toBe(86400000)

    setAutoLockTimeout('never')
    expect(getAutoLockTimeout()).toBe('never')
    expect(getAutoLockTimeoutMs('never')).toBe(Infinity)
  })

  describe('long-lived persistent device authentication', () => {
    it('creates and validates long-lived persistent auth token on personal computer', () => {
      expect(isPersistentTokenValid()).toBe(false)
      expect(isDeviceRemembered()).toBe(false)

      createPersistentAuthToken(DEFAULT_PIN, 30)

      expect(isPersistentTokenValid()).toBe(true)
      expect(isDeviceRemembered()).toBe(true)
      expect(mockLocalStorage.getItem(STORAGE_KEY_REMEMBER_DEVICE)).toBe('true')
      expect(mockLocalStorage.getItem(STORAGE_KEY_PERSISTENT_TOKEN)).not.toBeNull()
    })

    it('automatically unlocks app session across browser tabs when persistent token is present', () => {
      // Emulate fresh browser tab where sessionStorage is empty
      mockSessionStorage.clear()
      expect(mockSessionStorage.getItem(SESSION_KEY_UNLOCKED)).toBeNull()

      // With persistent token saved on personal computer
      createPersistentAuthToken(DEFAULT_PIN, 30)

      // isSessionUnlocked() detects the persistent token and immediately restores the session
      expect(isSessionUnlocked()).toBe(true)
      expect(mockSessionStorage.getItem(SESSION_KEY_UNLOCKED)).toBe('true')
    })

    it('rejects expired persistent tokens', () => {
      createPersistentAuthToken(DEFAULT_PIN, -1) // expired in the past
      expect(isPersistentTokenValid()).toBe(false)
      expect(isSessionUnlocked()).toBe(false)
    })

    it('invalidates persistent tokens if PIN changes', () => {
      createPersistentAuthToken('7878', 30)
      expect(isPersistentTokenValid()).toBe(true)

      // Change PIN to 1234
      setStoredPin('1234')

      // Token minted with old PIN is immediately invalidated
      expect(isPersistentTokenValid()).toBe(false)
      expect(isDeviceRemembered()).toBe(false)
    })

    it('clears persistent auth token when forgotten or revoked', () => {
      createPersistentAuthToken(DEFAULT_PIN, 30)
      expect(isDeviceRemembered()).toBe(true)

      clearPersistentAuthToken()
      expect(isDeviceRemembered()).toBe(false)
      expect(mockLocalStorage.getItem(STORAGE_KEY_PERSISTENT_TOKEN)).toBeNull()
      expect(mockLocalStorage.getItem(STORAGE_KEY_REMEMBER_DEVICE)).toBeNull()
    })
  })

  describe('shouldLockOnResume', () => {
    it('returns false when timeout is "never"', () => {
      setSessionUnlocked(true)
      markAppBackgrounded()
      expect(shouldLockOnResume('never')).toBe(false)
    })
    it('returns true if session is not unlocked', () => {
      expect(shouldLockOnResume()).toBe(true)
    })

    it('returns true if timeout is "immediately"', () => {
      setSessionUnlocked(true)
      markAppBackgrounded()
      expect(shouldLockOnResume('immediately')).toBe(true)
    })

    it('returns false if background duration is below 30s timeout', () => {
      setSessionUnlocked(true)
      const now = Date.now()
      // Backgrounded 10 seconds ago
      mockSessionStorage.setItem(SESSION_KEY_BG_TIME, String(now - 10000))

      expect(shouldLockOnResume('30s')).toBe(false)
    })

    it('returns true if background duration exceeds 30s timeout', () => {
      setSessionUnlocked(true)
      const now = Date.now()
      // Backgrounded 35 seconds ago
      mockSessionStorage.setItem(SESSION_KEY_BG_TIME, String(now - 35000))

      expect(shouldLockOnResume('30s')).toBe(true)
    })
  })
})
