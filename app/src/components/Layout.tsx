import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackagePlus,
  Cog,
  Truck,
  RotateCcw,
  IndianRupee,
  Receipt,
  BarChart3,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react'

// All 9 routes in the application matching kasab-val-manager.jsx
export const ALL_NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard, desc: 'Overview & quick metrics' },
  { to: '/parties',    label: 'Parties',    icon: Users,           desc: 'Customer directory & balances' },
  { to: '/receiving',  label: 'Receiving',  icon: PackagePlus,     desc: 'Raw yarn entry & tare weight' },
  { to: '/production', label: 'Production', icon: Cog,             desc: 'Daily production batches' },
  { to: '/dispatch',   label: 'Dispatch',   icon: Truck,           desc: 'Finished kasab deliveries' },
  { to: '/rola',       label: 'Rola',       icon: RotateCcw,       desc: 'Empty spool returns' },
  { to: '/payments',   label: 'Payments',   icon: IndianRupee,     desc: 'Party payment receipts' },
  { to: '/expenses',   label: 'Expenses',   icon: Receipt,         desc: 'Daily business expenses' },
  { to: '/reports',    label: 'Reports',    icon: BarChart3,       desc: 'Financial & party ledgers' },
]

// 4 Primary Mobile Tabs + More
const PRIMARY_MOBILE_ITEMS = [
  { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { to: '/parties',   label: 'Parties',   icon: Users           },
  { to: '/receiving', label: 'Receiving', icon: PackagePlus     },
  { to: '/dispatch',  label: 'Dispatch',  icon: Truck           },
]

// 5 Secondary Modules shown inside "More" sheet
const MORE_MOBILE_ITEMS = [
  { to: '/production', label: 'Production', icon: Cog,         desc: 'Daily batch entries' },
  { to: '/rola',       label: 'Rola',       icon: RotateCcw,   desc: 'Empty spool returns' },
  { to: '/payments',   label: 'Payments',   icon: IndianRupee, desc: 'Party payments & receipts' },
  { to: '/expenses',   label: 'Expenses',   icon: Receipt,     desc: 'Operating & machine costs' },
  { to: '/reports',    label: 'Reports',    icon: BarChart3,   desc: 'Summary reports & ledger' },
]

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
    location.pathname.startsWith(item.to)
  )

  const dateDisplay = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

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
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
        style={{
          background: 'var(--color-ink)',
          borderBottom: '1px solid var(--color-brass-dark)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: 'var(--color-brass)' }}
          />
          <h1
            className="text-base sm:text-lg font-semibold text-white tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Kasab Val Manager
          </h1>
        </div>
        <span className="text-xs hidden sm:block" style={{ color: '#C9C2B4' }}>
          {dateDisplay}
        </span>
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
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors cursor-pointer"
                style={{
                  background: active ? 'var(--color-brass)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--color-ink)',
                }}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{t.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* ── Main content view ─────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-8 max-w-6xl w-full">
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
            className="relative z-10 w-full rounded-t-2xl border-t shadow-2xl p-4 pb-8 space-y-3"
            style={{
              background: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-1 pb-2 border-b border-[var(--color-border)]">
              <div>
                <h3
                  className="text-base font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
                >
                  More Modules
                </h3>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Additional operational tools
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Sheet Navigation List */}
            <div className="space-y-1 pt-1">
              {MORE_MOBILE_ITEMS.map((item) => {
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
                      'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-colors min-h-[48px] cursor-pointer',
                      isActive
                        ? 'bg-[var(--color-brass)]/15 border border-[var(--color-brass)]/30 text-[var(--color-brass)]'
                        : 'hover:bg-[var(--color-border-soft)] text-[var(--color-ink)] border border-transparent',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          isActive
                            ? 'bg-[var(--color-brass)] text-white'
                            : 'bg-[var(--color-paper)] text-[var(--color-ink-soft)] border border-[var(--color-border)]',
                        ].join(' ')}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">
                          {item.label}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] leading-tight mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={isActive ? 'text-[var(--color-brass)]' : 'text-[var(--color-ink-soft)]'}
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
        className="sm:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 z-40"
        style={{
          background: 'var(--color-ink)',
          borderTop: '1px solid var(--color-brass-dark)',
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
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center min-h-[52px] py-2 px-1 transition-colors select-none cursor-pointer',
                  isActive
                    ? 'text-[var(--color-brass)]'
                    : 'text-[#9C9384] hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-tight mt-0.5 text-center truncate max-w-full">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}

        {/* 5th Tab: "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={[
            'flex flex-col items-center justify-center min-h-[52px] py-2 px-1 transition-colors select-none cursor-pointer',
            isMoreActive || isMoreOpen
              ? 'text-[var(--color-brass)]'
              : 'text-[#9C9384] hover:text-white',
          ].join(' ')}
          aria-label="Open more modules menu"
          aria-expanded={isMoreOpen}
        >
          <MoreHorizontal size={18} strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2} />
          <span className="text-[10px] font-medium leading-tight mt-0.5 text-center truncate max-w-full">
            More
          </span>
        </button>
      </nav>
    </div>
  )
}
