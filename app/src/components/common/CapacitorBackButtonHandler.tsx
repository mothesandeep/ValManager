import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { useToast } from '@/context/ToastContext'

/**
 * Handles Android hardware back button and predictive back gestures.
 * Prevents abrupt app exits and ensures clean SPA navigation across pages and modals.
 */
export function CapacitorBackButtonHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const lastBackPressRef = useRef<number>(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let backListenerHandle: { remove: () => Promise<void> } | null = null

    const setupListener = async () => {
      try {
        backListenerHandle = await CapApp.addListener('backButton', () => {
          // 0. If app is locked, back button minimizes the app cleanly
          if (document.querySelector('[data-app-locked="true"]')) {
            void CapApp.minimizeApp()
            return
          }

          // 1. Check if any modal, drawer, or action sheet is active
          const isModalActive =
            window.location.hash.includes('modal') ||
            document.body.classList.contains('modal-open') ||
            document.body.classList.contains('scanner-modal-open') ||
            document.body.classList.contains('more-sheet-open') ||
            document.body.classList.contains('period-sheet-open') ||
            Boolean(
              document.querySelector(
                '.fixed.inset-0.z-50:not([data-closing="true"]), [role="dialog"]:not([data-closing="true"]), [aria-modal="true"]:not([data-closing="true"])'
              )
            )

          if (isModalActive) {
            // Dismiss active modal cleanly
            window.dispatchEvent(new CustomEvent('kasab:close-active-modal'))
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
            if (window.location.hash.includes('modal')) {
              window.history.back()
            }
            return
          }

          // 2. Client-side SPA navigation: if not on dashboard root, navigate back within router
          if (location.pathname !== '/') {
            if (
              window.history.state &&
              typeof window.history.state.idx === 'number' &&
              window.history.state.idx > 0
            ) {
              navigate(-1)
            } else {
              navigate('/')
            }
            return
          }

          // 3. Double-tap to exit on root dashboard to prevent accidental closure
          const now = Date.now()
          if (now - lastBackPressRef.current < 2000) {
            void CapApp.exitApp()
          } else {
            lastBackPressRef.current = now
            showToast('Press back again to exit', 'info')
          }
        })
      } catch (err) {
        console.warn('[CapacitorBackButtonHandler] Failed to register backButton listener:', err)
      }
    }

    void setupListener()

    return () => {
      if (backListenerHandle) {
        void backListenerHandle.remove()
      }
    }
  }, [navigate, location.pathname, showToast])

  return null
}

