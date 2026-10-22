import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackagePlus,
  Truck,
  IndianRupee,
  Receipt,
  BarChart3,
  MoreHorizontal,
  X,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import MonthSelector from '../common/MonthSelector'
import { useSync } from '../../context/SyncContext'
import { RefreshCw } from 'lucide-react'
import { fetchParties } from '../../lib/api/parties'
import { fetchReceipts } from '../../lib/api/receipts'
import { fetchDispatches } from '../../lib/api/dispatch'
import { fetchPayments } from '../../lib/api/payments'
import { fetchExpenses } from '../../lib/api/expenses'

function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount } = useSync()

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200/70 text-[11px] font-semibold tracking-wide shrink-0 shadow-xs" title="Offline - Working with local cache">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>{pendingCount > 0 ? `${pendingCount} offline` : 'Offline'}</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200/70 text-[11px] font-semibold tracking-wide shrink-0 shadow-xs" title="Syncing changes...">
        <RefreshCw size={12} strokeWidth={2.5} className="animate-spin text-sky-500" />
        <span>Syncing...</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-semibold tracking-wide shrink-0 shadow-xs" title={`${pendingCount} mutations queued`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>{pendingCount} pending</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold tracking-wide shrink-0 shadow-xs select-none h-[36px]" title="All data synced & secured">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="hidden sm:inline">Synced</span>
    </div>
  )
}

// All routes grouped into ERP sections
export interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  desc: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'CORE',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & business metrics' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/receiving', label: 'Inward Receipts', icon: PackagePlus, desc: 'Raw yarn entry & tare weight' },
      { to: '/dispatch',  label: 'Outward Dispatch', icon: Truck,       desc: 'Finished val deliveries & rola' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { to: '/parties',   label: 'Party Directory',   icon: Users,        desc: 'Customer directory & balances' },
      { to: '/payments',  label: 'Billing & Payments', icon: IndianRupee,  desc: 'Payment collections & dues' },
      { to: '/expenses',  label: 'Operating Expenses', icon: Receipt,      desc: 'Daily business expenses' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { to: '/reports',   label: 'Reports & Analytics', icon: BarChart3,         desc: 'Financial summaries & ledgers' },
      { to: '/settings',  label: 'System Settings',     icon: SlidersHorizontal, desc: 'Weight & party defaults' },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((sec) => sec.items)

// 4 Primary Mobile Tabs + More — ordered by daily workflow
const PRIMARY_MOBILE_ITEMS = [
  { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { to: '/receiving', label: 'Inward',    icon: PackagePlus     },
  { to: '/dispatch',  label: 'Outward',   icon: Truck           },
  { to: '/expenses',  label: 'Expenses',  icon: Receipt         },
]

// Secondary Modules shown inside "More" sheet — split by section
const MORE_FINANCE_ITEMS = [
  { to: '/parties',  label: 'Party Directory',   icon: Users,       desc: 'Customer directory & balances' },
  { to: '/payments', label: 'Billing & Payments', icon: IndianRupee, desc: 'Payment collections & dues' },
]
const MORE_SYSTEM_ITEMS = [
  { to: '/reports',  label: 'Reports & Analytics', icon: BarChart3,         desc: 'Financial summaries & ledgers' },
  { to: '/settings', label: 'System Settings',     icon: SlidersHorizontal, desc: 'Weight & party defaults' },
]
const MORE_MOBILE_ITEMS = [...MORE_FINANCE_ITEMS, ...MORE_SYSTEM_ITEMS]



export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [navCounts, setNavCounts] = useState<{ [key: string]: number }>({})

  // Fetch live counts for navigation items
  useEffect(() => {
    let isMounted = true
    async function loadCounts() {
      try {
        const [parties, receipts, dispatches, payments, expenses] = await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchPayments(),
          fetchExpenses(),
        ])
        if (isMounted) {
          setNavCounts({
            '/parties': parties.length,
            '/receiving': receipts.length,
            '/dispatch': dispatches.length,
            '/payments': payments.length,
            '/expenses': expenses.length,
          })
        }
      } catch (err) {
        console.error('Failed to load nav counts:', err)
      }
    }
    loadCounts()
    return () => {
      isMounted = false
    }
  }, [location.pathname])

  // Close more sheet automatically on navigation
  useEffect(() => {
    setIsMoreOpen(false)
  }, [location.pathname])

  // Close sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false)
    }
    if (isMoreOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMoreOpen])

  // Check if current route is inside the "More" items
  const isMoreActive = MORE_MOBILE_ITEMS.some((item) =>
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to)
  )

  return (
    <div
      style={{
        background: 'var(--color-paper)',
        minHeight: '100dvh',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
      className="w-full flex flex-col"
    >
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2.5 shrink-0 gap-3 min-h-[58px] bg-white/90 backdrop-blur-xl border-b border-gray-100/90 shadow-[0_2px_20px_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center shrink-0 cursor-pointer pr-2" onClick={() => navigate('/')}>
          <Logo size={34} showText={true} />
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          <SyncIndicator />
          {location.pathname !== '/settings' && (
            <>
              <div className="h-4 w-px bg-gray-200/80 hidden sm:block" />
              <MonthSelector />
            </>
          )}
        </div>
      </header>

      {/* ── Main Layout Body ───────────────────────────────────────── */}
      <div className="flex flex-1" style={{ minHeight: 'calc(100dvh - 58px)' }}>
        {/* ── Sidebar (desktop) ────────────────────────────────────── */}
        <nav
          className="hidden sm:flex flex-col w-72 shrink-0 px-3.5 py-4 sticky top-[58px] h-[calc(100vh-58px)] overflow-y-auto bg-white/70 backdrop-blur-md border-r border-slate-200/80 scrollbar-hide select-none"
          aria-label="Desktop Navigation"
        >
          <div className="flex flex-col gap-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col">
                <div className="px-3 pb-1.5 text-[10px] font-black tracking-wider text-slate-400 uppercase select-none">
                  {section.title}
                </div>
                <div className="flex flex-col gap-1">
                  {section.items.map((t) => {
                    const Icon = t.icon
                    const active =
                      t.to === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(t.to)
                    const count = navCounts[t.to]

                    return (
                      <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.to === '/'}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors duration-150 cursor-pointer min-h-[40px] group outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 border-0 select-none ${
                          active
                            ? 'bg-slate-900 text-white font-medium rounded-lg'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg'
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={active ? 2.2 : 2}
                          className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 transition-colors'}
                        />
                        <span className="flex-1 whitespace-nowrap">{t.label}</span>
                        {count !== undefined && count > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold tabular-nums transition-colors shrink-0 ${
                              active
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 group-hover:text-slate-800'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Main content view ───────── */}
        <main className="flex-1 p-4 sm:p-6 pb-32 sm:pb-8 max-w-6xl w-full flex flex-col gap-4 sm:gap-5">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile More Bottom Sheet ──────────────────────────────── */}
      {isMoreOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close menu backdrop"
          />

          {/* Sheet Container */}
          <div
            className="relative z-10 w-full rounded-t-[32px] border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 pb-8 space-y-4 bg-white"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100">
              <div>
                <h3
                  className="text-xl font-black text-slate-900 tracking-tight"
                >
                  More Modules
                </h3>
                <p className="text-xs font-bold text-slate-400">
                  Additional operational tools
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            {/* Sheet Navigation List — Finance group */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest px-1 pb-1 text-slate-400">Finance</p>
              {MORE_FINANCE_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.to)
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to)
                      setIsMoreOpen(false)
                    }}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] text-left transition-colors min-h-[56px] cursor-pointer group outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border-0 select-none',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 group-hover:text-slate-600',
                        ].join(' ')}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div>
                        <div className={`text-[15px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </div>
                        <div className={`text-[12px] font-medium leading-tight mt-1 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className={isActive ? 'text-slate-300' : 'text-slate-300'}
                    />
                  </button>
                )
              })}
            </div>

            {/* System group */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest px-1 pb-1 pt-1 text-slate-400">System</p>
              {MORE_SYSTEM_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.to)
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to)
                      setIsMoreOpen(false)
                    }}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] text-left transition-colors min-h-[56px] cursor-pointer group outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border-0 select-none',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 group-hover:text-slate-600',
                        ].join(' ')}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div>
                        <div className={`text-[15px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </div>
                        <div className={`text-[12px] font-medium leading-tight mt-1 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className={isActive ? 'text-slate-300' : 'text-slate-300'}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile 5-Item Bottom Bar ───────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 z-40 bg-white/90 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Mobile Navigation"
      >
        {PRIMARY_MOBILE_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex flex-col items-center justify-center min-h-[56px] py-1 transition-all select-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border-0 tap-highlight-transparent"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center w-full relative pt-1">
                  <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-slate-900 text-white' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`relative z-10 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight leading-tight mt-1 text-center transition-colors duration-300 ${isActive ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          )
        })}

        {/* 5th Tab: "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className="flex flex-col items-center justify-center min-h-[56px] py-1 transition-all select-none cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border-0 tap-highlight-transparent"
          aria-label="Open more modules menu"
          aria-expanded={isMoreOpen}
        >
          <div className="flex flex-col items-center justify-center w-full relative pt-1">
            <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${isMoreActive || isMoreOpen ? 'bg-slate-900 text-white' : ''}`}>
              <MoreHorizontal size={20} strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2} className={`relative z-10 transition-colors ${isMoreActive || isMoreOpen ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className={`text-[10px] font-bold tracking-tight leading-tight mt-1 text-center transition-colors duration-300 ${isMoreActive || isMoreOpen ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
              More
            </span>
          </div>
        </button>
      </nav>
    </div>
  )
}
