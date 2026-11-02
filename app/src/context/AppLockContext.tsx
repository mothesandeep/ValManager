import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp, type AppState } from '@capacitor/app'
import {
  isSessionUnlocked,
  setSessionUnlocked,
  verifyPin,
  setStoredPin,
  getStoredPin,
  getAutoLockTimeout,
  setAutoLockTimeout as setStoredAutoLockTimeout,
  markAppBackgrounded,
  shouldLockOnResume,
  createPersistentAuthToken,
  clearPersistentAuthToken,
  isDeviceRemembered,
  type AutoLockTimeout,
} from '@/services/security/appLockService'

export interface AppLockContextType {
  isLocked: boolean
  autoLockTimeout: AutoLockTimeout
  setAutoLockTimeout: (timeout: AutoLockTimeout) => void
  unlock: (pin: string, rememberDevice?: boolean) => boolean
  lockApp: (revokeDevice?: boolean) => void
  changePin: (oldPin: string, newPin: string) => { success: boolean; error?: string }
  isRemembered: boolean
  revokeDeviceSession: () => void
  rememberDeviceSession: () => void
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined)

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState<boolean>(() => !isSessionUnlocked())
  const [autoLockTimeout, setAutoLockTimeoutState] = useState<AutoLockTimeout>(() => getAutoLockTimeout())
  const [isRemembered, setIsRemembered] = useState<boolean>(() => isDeviceRemembered())

  const setAutoLockTimeout = useCallback((timeout: AutoLockTimeout) => {
    setAutoLockTimeoutState(timeout)
    setStoredAutoLockTimeout(timeout)
  }, [])

  const unlock = useCallback((pin: string, rememberDevice = true): boolean => {
    if (verifyPin(pin)) {
      if (rememberDevice) {
        createPersistentAuthToken(pin)
        setIsRemembered(true)
      }
      setSessionUnlocked(true, pin)
      setIsLocked(false)
      return true
    }
    return false
  }, [])

  const lockApp = useCallback((revokeDevice = false) => {
    if (revokeDevice) {
      clearPersistentAuthToken()
      setIsRemembered(false)
    }
    setSessionUnlocked(false)
    setIsLocked(true)
  }, [])

  const revokeDeviceSession = useCallback(() => {
    clearPersistentAuthToken()
    setIsRemembered(false)
  }, [])

  const rememberDeviceSession = useCallback(() => {
    createPersistentAuthToken(getStoredPin())
    setIsRemembered(true)
  }, [])

  const changePin = useCallback((oldPin: string, newPin: string): { success: boolean; error?: string } => {
    if (!verifyPin(oldPin)) {
      return { success: false, error: 'Incorrect current PIN. Please try again.' }
    }
    const cleanNewPin = newPin.trim()
    if (cleanNewPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits.' }
    }
    try {
      setStoredPin(cleanNewPin)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update PIN.' }
    }
  }, [])

  // Listen to lifecycle events: Capacitor App & Document Visibility
  useEffect(() => {
    const handlePause = () => {
      markAppBackgrounded()
      if (autoLockTimeout === 'immediately') {
        lockApp()
      }
    }

    const handleResume = () => {
      if (shouldLockOnResume(autoLockTimeout)) {
        lockApp()
      }
    }

    // 1. Capacitor Native Lifecycle Listener (Android/iOS APK only)
    let capListenerHandle: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      try {
        const handlePromise = CapApp.addListener('appStateChange', (state: AppState) => {
          if (!state.isActive) {
            handlePause()
          } else {
            handleResume()
          }
        })
        void handlePromise.then((handle) => {
          capListenerHandle = handle
        })
      } catch {
        // Non-Capacitor environment fallback
      }
    }

    // 2. Web Visibility & Page Lifecycle Listeners
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePause()
      } else {
        handleResume()
      }
    }

    const handleWindowFocus = () => {
      handleResume()
    }

    const handleWindowBlur = () => {
      if (autoLockTimeout !== 'never') {
        handlePause()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('pagehide', handlePause)

    return () => {
      if (capListenerHandle) {
        capListenerHandle.remove()
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('pagehide', handlePause)
    }
  }, [autoLockTimeout, lockApp])

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        autoLockTimeout,
        setAutoLockTimeout,
        unlock,
        lockApp,
        changePin,
        isRemembered,
        revokeDeviceSession,
        rememberDeviceSession,
      }}
    >
      {children}
    </AppLockContext.Provider>
  )
}

export function useAppLock(): AppLockContextType {
  const context = useContext(AppLockContext)
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider')
  }
  return context
}

