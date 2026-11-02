import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  PackagePlus,
  Truck,
  IndianRupee,
  MoreHorizontal,
  Users,
  Receipt,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export interface BottomNavigationProps {
  hidden?: boolean
}

// 4 Primary operational tabs for mobile
export const PRIMARY_MOBILE_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/receiving', label: 'Inward Receipts', icon: PackagePlus },
  { to: '/dispatch', label: 'Outward Dispatch', icon: Truck },
  { to: '/payments', label: 'Billing & Payments', icon: IndianRupee },
]

// Secondary tabs grouped into the "More" sheet
export const MORE_MOBILE_ITEMS = [
  { to: '/parties', label: 'Party Directory', icon: Users, desc: 'Customer directory & balances' },
  { to: '/expenses', label: 'Operating Expenses', icon: Receipt, desc: 'Daily business expenses' },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, desc: 'Financial summaries & ledgers' },
  { to: '/settings', label: 'System Settings', icon: SlidersHorizontal, desc: 'Preferences & backup safeguards' },
]

export function BottomNavigation({ hidden = false }: BottomNavigationProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Track if current route belongs to the "More" items
  const isMoreRouteActive = MORE_MOBILE_ITEMS.some((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  )

  // Manage body class for FAB avoidance and scroll lock
  useEffect(() => {
    if (isMoreOpen) {
      document.body.classList.add('more-sheet-open')
    } else {
      document.body.classList.remove('more-sheet-open')
    }
    return () => {
      document.body.classList.remove('more-sheet-open')
    }
  }, [isMoreOpen])

  // Auto-close more sheet on route navigation
  useEffect(() => {
    setIsMoreOpen(false)
  }, [location.pathname])

  if (hidden) return null

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex md:hidden items-center justify-around z-40 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{
          height: 'calc(54px + max(0.5rem, env(safe-area-inset-bottom, 0px)))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Mobile Navigation"
      >
        {/* 4 Primary Navigation Items */}
        {PRIMARY_MOBILE_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="relative flex-1 flex items-center justify-center h-full transition-transform active:scale-95 cursor-pointer outline-none tap-highlight-transparent min-h-[48px] min-w-[48px]"
              aria-label={item.label}
              title={item.label}
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    'h-10 px-3.5 rounded-lg flex items-center justify-center transition-all duration-150 ease-out min-h-[40px]',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    className="transition-colors duration-150 shrink-0"
                  />
                </div>
              )}
            </NavLink>
          )
        })}

        {/* 5th Action Item: "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className="relative flex-1 flex items-center justify-center h-full transition-transform active:scale-95 cursor-pointer outline-none tap-highlight-transparent min-h-[48px] min-w-[48px]"
          aria-label="More navigation tabs"
          aria-expanded={isMoreOpen}
          title="More sections"
        >
          <div
            className={cn(
              'h-10 px-3.5 rounded-lg flex items-center justify-center transition-all duration-150 ease-out min-h-[40px]',
              isMoreRouteActive || isMoreOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            )}
          >
            <MoreHorizontal
              size={20}
              strokeWidth={isMoreRouteActive || isMoreOpen ? 2.4 : 1.8}
              className="transition-colors duration-150 shrink-0"
            />
          </div>
        </button>
      </nav>

      {/* ── More Navigation Bottom Sheet ── */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="More sections"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            className="relative z-10 w-full bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 safe-area-pb animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">More Sections</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of secondary routes */}
            <div className="mt-3 flex flex-col gap-1.5">
              {MORE_MOBILE_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)

                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false)
                      navigate(item.to)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer min-h-[48px] text-left border',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 font-semibold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-tight">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 shrink-0 ml-2" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BottomNavigation
