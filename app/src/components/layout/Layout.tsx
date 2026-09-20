import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackagePlus,
  Truck,
  RotateCcw,
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
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'

function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount } = useSync()

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
        <CloudOff size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-bold tracking-wide">
          {pendingCount > 0 ? `${pendingCount} pending` : 'Offline'}
        </span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
        <RefreshCw size={14} strokeWidth={2.5} className="animate-spin" />
        <span className="text-[10px] font-bold tracking-wide">Syncing...</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">
        <Cloud size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-bold tracking-wide">{pendingCount} pending</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 opacity-50" title="Synced">
      <Cloud size={14} strokeWidth={2.5} />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">Synced</span>
    </div>
  )
}

// All routes in the application
export const ALL_NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',        icon: LayoutDashboard, desc: 'Overview & quick metrics' },
  { to: '/parties',    label: 'Parties',          icon: Users,           desc: 'Customer directory & balances' },
  { to: '/receiving',  label: 'Receiving',        icon: PackagePlus,     desc: 'Raw yarn entry & tare weight' },
  { to: '/dispatch',   label: 'Dispatch',         icon: Truck,           desc: 'Finished kasab deliveries' },
  { to: '/rola',       label: 'Rola',             icon: RotateCcw,       desc: 'Empty spool returns' },
  { to: '/payments',   label: 'Payments',         icon: IndianRupee,     desc: 'Party payment receipts' },
  { to: '/expenses',   label: 'Expenses',         icon: Receipt,         desc: 'Daily business expenses' },
  { to: '/reports',    label: 'Reports',          icon: BarChart3,       desc: 'Financial & party ledgers' },
  { to: '/settings',   label: 'Settings',         icon: SlidersHorizontal, desc: 'Weight & party defaults' },
]

// 4 Primary Mobile Tabs + More — ordered by daily workflow
const PRIMARY_MOBILE_ITEMS = [
  { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { to: '/receiving', label: 'Receiving', icon: PackagePlus     },
  { to: '/dispatch',  label: 'Dispatch',  icon: Truck           },
  { to: '/payments',  label: 'Payments',  icon: IndianRupee     },
]

// Secondary Modules shown inside "More" sheet — split by group
const MORE_OPERATIONAL_ITEMS = [
  { to: '/parties',    label: 'Parties',          icon: Users,             desc: 'Customer directory & balances' },
  { to: '/rola',       label: 'Rola',             icon: RotateCcw,         desc: 'Empty spool returns' },
  { to: '/expenses',   label: 'Expenses',         icon: Receipt,           desc: 'Operating & machine costs' },
]
const MORE_ADMIN_ITEMS = [
  { to: '/reports',    label: 'Reports',          icon: BarChart3,         desc: 'Summary reports & ledger' },
  { to: '/settings',   label: 'Settings',         icon: SlidersHorizontal, desc: 'Weight & party defaults' },
]
const MORE_MOBILE_ITEMS = [...MORE_OPERATIONAL_ITEMS, ...MORE_ADMIN_ITEMS]



export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

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
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-2 shrink-0 gap-3 min-h-[56px] bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center min-w-0 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size={32} showText={true} />
        </div>

        <div className="flex items-center gap-3">
          <SyncIndicator />
          <MonthSelector />
        </div>
      </header>

      {/* ── Main Layout Body ───────────────────────────────────────── */}
      <div className="flex flex-1" style={{ minHeight: 'calc(100dvh - 56px)' }}>
        {/* ── Sidebar (desktop) ────────────────────────────────────── */}
        <nav
          className="hidden sm:flex flex-col gap-1 w-52 shrink-0 p-3"
          style={{ borderRight: '1px solid var(--color-border)' }}
          aria-label="Desktop Navigation"
        >
          {ALL_NAV_ITEMS.map((t) => {
            const Icon = t.icon
            const active =
              t.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(t.to)

            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-left transition-colors cursor-pointer min-h-[44px]"
                style={{
                  background: active ? 'var(--color-brass)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--color-ink)',
                }}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{t.label}</span>
              </NavLink>
            )
          })}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close menu backdrop"
          />

          {/* Sheet Container */}
          <div
            className="relative z-10 w-full rounded-t-[32px] border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 pb-8 space-y-4 bg-white"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-1 pb-3 border-b border-gray-100">
              <div>
                <h3
                  className="text-xl font-black text-gray-900 tracking-tight"
                >
                  More Modules
                </h3>
                <p className="text-xs font-bold text-gray-400">
                  Additional operational tools
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            {/* Sheet Navigation List — Operational group */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest px-1 pb-1 text-gray-400">Operational</p>
              {MORE_OPERATIONAL_ITEMS.map((item) => {
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
                      'w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] text-left transition-all min-h-[56px] cursor-pointer group',
                      isActive
                        ? 'bg-[#a57b3f]/10 shadow-sm'
                        : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-[#a57b3f] text-white shadow-sm ring-2 ring-[#a57b3f]/20'
                            : 'bg-gray-100 text-gray-400 group-hover:text-gray-600',
                        ].join(' ')}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div>
                        <div className={`text-[15px] font-bold leading-tight ${isActive ? 'text-[#a57b3f]' : 'text-gray-900'}`}>
                          {item.label}
                        </div>
                        <div className="text-[12px] font-medium text-gray-400 leading-tight mt-1">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className={isActive ? 'text-[#a57b3f]' : 'text-gray-300'}
                    />
                  </button>
                )
              })}
            </div>

            {/* Reports & Admin group */}
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-extrabold uppercase tracking-widest px-1 pb-1 pt-1 text-gray-400">Reports & Admin</p>
              {MORE_ADMIN_ITEMS.map((item) => {
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
                      'w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] text-left transition-all min-h-[56px] cursor-pointer group',
                      isActive
                        ? 'bg-[#a57b3f]/10 shadow-sm'
                        : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-[#a57b3f] text-white shadow-sm ring-2 ring-[#a57b3f]/20'
                            : 'bg-gray-100 text-gray-400 group-hover:text-gray-600',
                        ].join(' ')}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <div>
                        <div className={`text-[15px] font-bold leading-tight ${isActive ? 'text-[#a57b3f]' : 'text-gray-900'}`}>
                          {item.label}
                        </div>
                        <div className="text-[12px] font-medium text-gray-400 leading-tight mt-1">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className={isActive ? 'text-[#a57b3f]' : 'text-gray-300'}
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
        className="sm:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 z-40 bg-white/85 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
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
              className="flex flex-col items-center justify-center min-h-[56px] py-1 transition-all select-none cursor-pointer outline-none tap-highlight-transparent"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center w-full relative pt-1">
                  <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-[#a57b3f]/10' : ''}`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`relative z-10 transition-colors ${isActive ? 'text-[#a57b3f]' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[10px] font-black tracking-tight leading-tight mt-1 text-center transition-colors duration-300 ${isActive ? 'text-[#a57b3f]' : 'text-gray-400'}`}>
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
          className="flex flex-col items-center justify-center min-h-[56px] py-1 transition-all select-none cursor-pointer outline-none tap-highlight-transparent"
          aria-label="Open more modules menu"
          aria-expanded={isMoreOpen}
        >
          <div className="flex flex-col items-center justify-center w-full relative pt-1">
            <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${isMoreActive || isMoreOpen ? 'bg-[#a57b3f]/10' : ''}`}>
              <MoreHorizontal size={22} strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2} className={`relative z-10 transition-colors ${isMoreActive || isMoreOpen ? 'text-[#a57b3f]' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] font-black tracking-tight leading-tight mt-1 text-center transition-colors duration-300 ${isMoreActive || isMoreOpen ? 'text-[#a57b3f]' : 'text-gray-400'}`}>
              More
            </span>
          </div>
        </button>
      </nav>
    </div>
  )
}
