import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Custom React hook to detect if any modal, drawer, or bottom sheet is open.
 * Evaluates:
 * 1. URL hash matching #modal (e.g., /receiving#modal, /dispatch#modal)
 * 2. document.body classList ('modal-open', 'scanner-modal-open', 'more-sheet-open', 'period-sheet-open')
 * 3. DOM presence of active full-screen modal overlays (elements with fixed inset-0 z-50 / role="dialog")
 * 4. Custom window events ('kasab:modal-state')
 * 5. Real-time DOM mutations via MutationObserver
 */
export function useIsModalOpen(): boolean {
  const location = useLocation()

  const checkModalActive = (): boolean => {
    if (typeof window === 'undefined') return false

    // 1. URL Hash check (#modal)
    const hash = window.location.hash
    if (hash === '#modal' || hash.startsWith('#modal') || hash.includes('modal')) {
      return true
    }

    // 2. document.body classList flags
    const body = document.body
    if (
      body.classList.contains('modal-open') ||
      body.classList.contains('scanner-modal-open') ||
      body.classList.contains('more-sheet-open') ||
      body.classList.contains('period-sheet-open')
    ) {
      return true
    }

    // 3. Active full-screen modal overlay in DOM (excluding dialogs marked as closing or hidden)
    const candidateModals = document.querySelectorAll(
      '.fixed.inset-0.z-50, [role="dialog"], [aria-modal="true"], .modal-overlay'
    )
    for (const el of candidateModals) {
      const htmlEl = el as HTMLElement
      if (
        htmlEl.getAttribute('data-closing') === 'true' ||
        htmlEl.getAttribute('aria-hidden') === 'true' ||
        htmlEl.hidden ||
        htmlEl.style.display === 'none' ||
        htmlEl.style.visibility === 'hidden' ||
        htmlEl.classList.contains('hidden')
      ) {
        continue
      }
      return true
    }
    return false
  }

  const [isModalOpen, setIsModalOpen] = useState<boolean>(checkModalActive)

  useEffect(() => {
    // Initial evaluation
    setIsModalOpen(checkModalActive())

    const handleUpdate = () => {
      setIsModalOpen(checkModalActive())
    }

    // Hash & navigation events
    window.addEventListener('hashchange', handleUpdate)
    window.addEventListener('popstate', handleUpdate)

    // Custom app modal event
    const handleCustomState = (e: Event) => {
      const custom = e as CustomEvent<{ open?: boolean }>
      if (custom.detail && typeof custom.detail.open === 'boolean') {
        setIsModalOpen(custom.detail.open)
      } else {
        handleUpdate()
      }
    }
    window.addEventListener('kasab:modal-state', handleCustomState)

    // MutationObserver to catch modal mounts/unmounts instantly
    const observer = new MutationObserver(() => {
      handleUpdate()
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    })

    return () => {
      window.removeEventListener('hashchange', handleUpdate)
      window.removeEventListener('popstate', handleUpdate)
      window.removeEventListener('kasab:modal-state', handleCustomState)
      observer.disconnect()
    }
  }, [location.pathname, location.hash, location.search])

  return isModalOpen
}
