import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useIsModalOpen } from '@/hooks/useIsModalOpen'
import {
  Plus,
  PackagePlus,
  Truck,
  IndianRupee,
  Receipt,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SpeedDialAction {
  id: string
  label: string
  badge?: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  colorClass: string
  onClick: () => void
}

interface RouteActionConfig {
  actions: SpeedDialAction[]
  isDirectTap: boolean
  triggerLabel: string
}

export function SpeedDialFab() {
  const [isOpen, setIsOpen] = useState(false)
  const isModalOpen = useIsModalOpen()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  // Auto-collapse open speed dial menu when any entry modal opens
  useEffect(() => {
    if (isModalOpen && isOpen) {
      setIsOpen(false)
    }
  }, [isModalOpen, isOpen])

  // Context-aware action determination based on active route
  const { actions, isDirectTap, triggerLabel } = useMemo<RouteActionConfig>(() => {
    // 1. Inward Receipts (/receiving) -> Direct Tap 1-Action: + New Inward Receipt
    if (pathname === '/receiving') {
      return {
        actions: [
          {
            id: 'receiving-new',
            label: '+ New Inward Receipt',
            icon: Plus,
            colorClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('kasab:open-receiving-modal'))
            },
          },
        ],
        isDirectTap: true,
        triggerLabel: '+ New Inward Receipt',
      }
    }

    // 2. Outward Dispatch (/dispatch) -> Direct Tap 1-Action: + New Outward Dispatch
    if (pathname === '/dispatch') {
      return {
        actions: [
          {
            id: 'dispatch-new',
            label: '+ New Outward Dispatch',
            icon: Plus,
            colorClass: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/25',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('kasab:open-dispatch-modal'))
            },
          },
        ],
        isDirectTap: true,
        triggerLabel: '+ New Outward Dispatch',
      }
    }

    // 3. Billing & Payments (/payments) -> Direct Tap 1-Action: + Log Payment
    if (pathname === '/payments') {
      return {
        actions: [
          {
            id: 'payment-new',
            label: '+ Log Payment',
            icon: IndianRupee,
            colorClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/25',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('kasab:open-payment-modal'))
            },
          },
        ],
        isDirectTap: true,
        triggerLabel: '+ Log Payment',
      }
    }

    // 4. Operating Expenses (/expenses) -> Direct Tap 1-Action: + Log Expense
    if (pathname === '/expenses') {
      return {
        actions: [
          {
            id: 'expense-new',
            label: '+ Log Expense',
            icon: Receipt,
            colorClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/25',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('kasab:open-expense-modal'))
            },
          },
        ],
        isDirectTap: true,
        triggerLabel: '+ Log Expense',
      }
    }

    // 5. Party Directory (/parties) -> Direct Tap 1-Action: + Add New Party
    if (pathname === '/parties') {
      return {
        actions: [
          {
            id: 'party-new',
            label: '+ Add New Party',
            icon: UserPlus,
            colorClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('kasab:open-party-modal'))
            },
          },
        ],
        isDirectTap: true,
        triggerLabel: '+ Add New Party',
      }
    }

    // 6. Dashboard ('/') & Fallback -> Universal Multi-Action Speed-Dial
    return {
      actions: [
        {
          id: 'univ-receiving',
          label: 'New Inward Receipt',
          icon: PackagePlus,
          colorClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25',
          onClick: () => {
            if (window.location.pathname === '/receiving') {
              window.dispatchEvent(new CustomEvent('kasab:open-receiving-modal'))
            } else {
              navigate('/receiving?action=new')
            }
          },
        },
        {
          id: 'univ-dispatch',
          label: 'New Outward Dispatch',
          icon: Truck,
          colorClass: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/25',
          onClick: () => {
            if (window.location.pathname === '/dispatch') {
              window.dispatchEvent(new CustomEvent('kasab:open-dispatch-modal'))
            } else {
              navigate('/dispatch?action=new')
            }
          },
        },
        {
          id: 'univ-payment',
          label: 'Record Payment',
          icon: IndianRupee,
          colorClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/25',
          onClick: () => {
            if (window.location.pathname === '/payments') {
              window.dispatchEvent(new CustomEvent('kasab:open-payment-modal'))
            } else {
              navigate('/payments?action=new')
            }
          },
        },
        {
          id: 'univ-expense',
          label: 'Log Expense',
          icon: Receipt,
          colorClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/25',
          onClick: () => {
            if (window.location.pathname === '/expenses') {
              window.dispatchEvent(new CustomEvent('kasab:open-expense-modal'))
            } else {
              navigate('/expenses?action=new')
            }
          },
        },
        {
          id: 'univ-party',
          label: 'Add New Party',
          icon: UserPlus,
          colorClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25',
          onClick: () => {
            if (window.location.pathname === '/parties') {
              window.dispatchEvent(new CustomEvent('kasab:open-party-modal'))
            } else {
              navigate('/parties?action=new')
            }
          },
        },
      ],
      isDirectTap: false,
      triggerLabel: 'Quick Actions',
    }
  }, [pathname, navigate])

  // Close when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname, location.search])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMainButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // If route has 1 primary action (e.g. Parties, Payments, Expenses), trigger modal directly
    if (isDirectTap && actions.length === 1) {
      setTimeout(() => {
        actions[0].onClick()
      }, 50)
      return
    }
    setIsOpen((prev) => !prev)
  }

  const handleActionClick = (action: SpeedDialAction, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setIsOpen(false)
    // Microtask / short delay so backdrop dismissal completes before modal mounts
    setTimeout(() => {
      action.onClick()
    }, 50)
  }

  if (isModalOpen || pathname === '/settings' || pathname.startsWith('/settings/')) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <>
      {/* Backdrop overlay when speed-dial is expanded */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 md:hidden"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(false)
          }}
          aria-label="Close quick action menu"
        />
      )}

      {/* Floating Speed Dial Container (Strictly md:hidden, z-40 permanently viewport-fixed) */}
      <div
        data-fab="true"
        className="mobile-speed-dial-container fixed bottom-20 right-4 z-40 flex md:hidden flex-col items-end gap-3 pointer-events-none transition-all duration-200"
        style={{
          bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Speed-dial action options with upward stagger animation */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-1 pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-150">
            {actions.map((action, idx) => {
              const Icon = action.icon
              // Stagger delay from bottom upward
              const delay = (actions.length - 1 - idx) * 45
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={(e) => handleActionClick(action, e)}
                  style={{ animationDelay: `${delay}ms` }}
                  className="flex items-center gap-2.5 group active:scale-95 transition-all cursor-pointer animate-in slide-in-from-bottom-2 fade-in fill-mode-both"
                >
                  <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 text-xs font-bold shadow-lg border border-slate-100 dark:border-neutral-700 select-none whitespace-nowrap flex items-center gap-1.5">
                    {action.label}
                    {action.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 rounded-md">
                        {action.badge}
                      </span>
                    )}
                  </span>
                  <div
                    className={cn(
                      'w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 shrink-0',
                      action.colorClass
                    )}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          onClick={handleMainButtonClick}
          className="pointer-events-auto w-[52px] h-[52px] min-w-[52px] min-h-[52px] !min-h-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          aria-label={isOpen ? 'Close quick action menu' : triggerLabel}
          aria-expanded={isOpen}
          title={isOpen ? 'Close' : triggerLabel}
        >
          <Plus
            size={24}
            strokeWidth={2.5}
            className={cn('transition-transform duration-300', isOpen && 'rotate-45')}
          />
        </button>
      </div>
    </>,
    document.body
  )
}

export { SpeedDialFab as MobileSpeedDialFAB }
export default SpeedDialFab

