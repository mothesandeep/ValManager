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
  Scale,
  SlidersHorizontal,
} from 'lucide-react'
import MonthSelector from '../ui/MonthSelector'

// All routes in the application
export const ALL_NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',        icon: LayoutDashboard, desc: 'Overview & quick metrics' },
  { to: '/parties',    label: 'Parties',          icon: Users,           desc: 'Customer directory & balances' },
  { to: '/receiving',  label: 'Receiving',        icon: PackagePlus,     desc: 'Raw yarn entry & tare weight' },
  { to: '/dispatch',   label: 'Dispatch',         icon: Truck,           desc: 'Finished kasab deliveries' },
  { to: '/gapcha',     label: 'Gapcha / Surplus', icon: Scale,           desc: 'Extra sellable weight stock' },
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
  { to: '/gapcha',     label: 'Gapcha / Surplus', icon: Scale,             desc: 'Extra sellable weight stock' },
  { to: '/rola',       label: 'Rola',             icon: RotateCcw,         desc: 'Empty spool returns' },
  { to: '/expenses',   label: 'Expenses',         icon: Receipt,           desc: 'Operating & machine costs' },
]
const MORE_ADMIN_ITEMS = [
  { to: '/reports',    label: 'Reports',          icon: BarChart3,         desc: 'Summary reports & ledger' },
  { to: '/settings',   label: 'Settings',         icon: SlidersHorizontal, desc: 'Weight & party defaults' },
]
const MORE_MOBILE_ITEMS = [...MORE_OPERATIONAL_ITEMS, ...MORE_ADMIN_ITEMS]

function KasabLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="shrink-0 shadow-sm rounded-xl">
      <defs>
        {/* Deep, rich mahogany/black background for maximum contrast */}
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24160a" />
          <stop offset="1" stopColor="#0B0704" />
        </linearGradient>
        
        {/* Ultra-realistic Metallic Gold for the Kasab thread */}
        <linearGradient id="goldThread" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A5A19" />
          <stop offset="20%" stopColor="#FCE38A" />
          <stop offset="40%" stopColor="#FFF2C8" />
          <stop offset="60%" stopColor="#C48E33" />
          <stop offset="85%" stopColor="#F4D068" />
          <stop offset="100%" stopColor="#4A2F0B" />
        </linearGradient>

        {/* Polished wood / dark gold for the spool ends */}
        <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d230e" />
          <stop offset="30%" stopColor="#a36e26" />
          <stop offset="70%" stopColor="#754c15" />
          <stop offset="100%" stopColor="#261508" />
        </linearGradient>

        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.75"/>
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#bgGrad)" />
      
      {/* Subtle outer glow/border */}
      <rect width="63" height="63" x="0.5" y="0.5" rx="15.5" stroke="url(#goldThread)" strokeOpacity="0.25" />
      <rect width="61" height="61" x="1.5" y="1.5" rx="14.5" stroke="#FFFFFF" strokeOpacity="0.04" />

      <g transform="translate(18, 12)" filter="url(#dropShadow)">
        
        {/* Main Thread Body (Cylinder) */}
        <path d="M 6,6 L 6,34 A 8 2.5 0 0 0 22 34 L 22,6 Z" fill="url(#goldThread)" />
        
        {/* Horizontal Thread Texture Lines for 3D realism */}
        <path d="M 6,10 A 8 2.5 0 0 0 22 10" fill="none" stroke="#684210" strokeWidth="0.8" opacity="0.8" />
        <path d="M 6,14 A 8 2.5 0 0 0 22 14" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />
        <path d="M 6,18 A 8 2.5 0 0 0 22 18" fill="none" stroke="#684210" strokeWidth="0.8" opacity="0.8" />
        <path d="M 6,22 A 8 2.5 0 0 0 22 22" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />
        <path d="M 6,26 A 8 2.5 0 0 0 22 26" fill="none" stroke="#684210" strokeWidth="0.8" opacity="0.8" />
        <path d="M 6,30 A 8 2.5 0 0 0 22 30" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />

        {/* Spool Bottom Flange */}
        <path d="M 2,33 C 2,30.5 26,30.5 26,33 L 26,35.5 C 26,38 2,38 2,35.5 Z" fill="url(#goldDark)" />
        {/* Spool Bottom Flange Hole */}
        <ellipse cx="14" cy="36" rx="3.5" ry="1.2" fill="#140C05" />
        
        {/* Spool Top Flange */}
        <path d="M 2,5 C 2,2.5 26,2.5 26,5 L 26,7.5 C 26,10 2,10 2,7.5 Z" fill="url(#goldDark)" />
        
        {/* Spool Top Inner Depth & Hole */}
        <ellipse cx="14" cy="5" rx="7.5" ry="2.2" fill="#211309" />
        <ellipse cx="14" cy="5.5" rx="3" ry="1" fill="#0A0602" />

        {/* Elegant unwinding thread looping around */}
        <path 
          d="M 22,22 C 37,20 40,40 25,43" 
          fill="none" 
          stroke="url(#goldThread)" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          filter="url(#glow)"
        />
        {/* Bright highlight on the unwinding thread */}
        <path 
          d="M 22,22 C 37,20 40,40 25,43" 
          fill="none" 
          stroke="#FFFFFF" 
          strokeWidth="0.8" 
          strokeLinecap="round" 
          opacity="0.6"
        />
      </g>
    </svg>
  )
}

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
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-2 shrink-0 gap-3 min-h-[56px] bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <KasabLogo size={28} />
          <h1
            className="text-sm sm:text-lg font-black text-gray-900 tracking-tight whitespace-nowrap hidden xs:block"
          >
            Kasab Val Manager
          </h1>
        </div>

        {/* Small Compact MonthSelector in Header */}
        <MonthSelector />
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
        <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-8 max-w-6xl w-full flex flex-col gap-4 sm:gap-5">
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
        className="sm:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 z-40 bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
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
