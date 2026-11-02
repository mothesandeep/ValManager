import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Global ScrollToTop Component
 * Ensures every route transition resets scroll position to the top of the viewport.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Disable browser's automatic scroll restoration on route changes
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    // Instantly scroll window and document root to the very top
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      })
    } catch {
      window.scrollTo(0, 0)
    }

    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      document.documentElement.scrollTop = 0
    }

    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      document.body.scrollTop = 0
    }

    // Reset primary main content container if present
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.scrollTop = 0
    }

    // Reset any other scrollable view containers (excluding sidebar nav)
    const scrollContainers = document.querySelectorAll<HTMLElement>('[data-scroll-container], main')
    scrollContainers.forEach((container) => {
      container.scrollTop = 0
    })
  }, [pathname])

  return null
}

export default ScrollToTop
