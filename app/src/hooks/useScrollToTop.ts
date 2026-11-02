import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollToTop(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

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
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.scrollTop = 0
    }
  }, [pathname])
}
