import React, { useState, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)
  const threshold = 65

  const getScrollTop = (target: EventTarget | null): number => {
    const winTop = window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0
    if (winTop > 0) return winTop

    let el = target as HTMLElement | null
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop > 0) return el.scrollTop
      el = el.parentElement
    }
    return 0
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull-to-refresh when scrolled to the very top
    const scrollTop = getScrollTop(e.target)
    if (scrollTop <= 2 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    } else {
      isPulling.current = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current

    if (diff > 0) {
      // Apply rubber-band damping
      const damped = Math.min(diff * 0.45, 95)
      setPullDistance(damped)
    } else {
      setPullDistance(0)
      isPulling.current = false
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.75)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(15)
        } catch {
          // ignore
        }
      }
      try {
        await onRefresh()
      } finally {
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
        }, 300)
      }
    } else {
      setPullDistance(0)
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative touch-pan-y ${className}`}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center w-full transition-transform duration-100 overflow-hidden pointer-events-none"
          style={{ height: `${pullDistance}px` }}
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700">
            <RefreshCw
              size={15}
              strokeWidth={2.5}
              className={`transition-transform ${
                isRefreshing
                  ? 'animate-spin text-slate-900'
                  : pullDistance >= threshold
                  ? 'rotate-180 text-emerald-600'
                  : 'text-slate-400'
              }`}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
