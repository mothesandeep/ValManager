import { useState, useMemo, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackagePlus,
  Truck,
  IndianRupee,
  Receipt,
  BarChart3,
  SlidersHorizontal,
  Search,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { SyncIndicator } from '@/components/common/SyncIndicator'
import { useSync } from '@/context/SyncContext'
import { useData } from '@/hooks/useData'
import { CommandPalette } from '@/components/common/CommandPalette'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { SpeedDialFab } from '@/components/layout/SpeedDialFab'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { useTheme } from '@/hooks/useTheme'
import { useIsModalOpen } from '@/hooks/useIsModalOpen'
import { cn } from '@/utils/cn'

function CollapsedSyncDot() {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, syncError, triggerSync } = useSync()

  let tooltip = 'All data synced & secured'
  if (!isOnline) {
    tooltip = 'Offline — Working with local cache'
  } else if (isSyncing) {
    tooltip = 'Syncing pending changes...'
  } else if (syncError && pendingCount > 0) {
    tooltip = `Sync error: ${syncError}. Click to retry.`
  } else if (pendingCount > 0) {
    tooltip = `${pendingCount} changes queued. Click to sync now.`
  } else if (lastSyncTime) {
    tooltip = `Synced (Last: ${lastSyncTime.toLocaleTimeString()})`
  }

  return (
    <button
      type="button"
      onClick={() => void triggerSync()}
      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
      title={tooltip}
      aria-label="Sync status"
    >
      {!isOnline ? (
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/40" />
      ) : isSyncing ? (
        <RefreshCw size={14} className="animate-spin text-sky-500" />
      ) : pendingCount > 0 ? (
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/40" />
      ) : (
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/40 animate-pulse" />
      )}
    </button>
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
      { to: '/dispatch', label: 'Outward Dispatch', icon: Truck, desc: 'Finished val deliveries & rola' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { to: '/parties', label: 'Party Directory', icon: Users, desc: 'Customer directory & balances' },
      { to: '/payments', label: 'Billing & Payments', icon: IndianRupee, desc: 'Payment collections & dues' },
      { to: '/expenses', label: 'Operating Expenses', icon: Receipt, desc: 'Daily business expenses' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, desc: 'Financial summaries & ledgers' },
      { to: '/settings', label: 'System Settings', icon: SlidersHorizontal, desc: 'Weight & party defaults' },
    ],
  },
]


export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('valmanager_sidebar_collapsed')
      if (stored !== null) return stored === 'true'
      // Auto-collapse when opening in half-screen/tablet width (< 1024px)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        return true
      }
      return false
    } catch {
      return false
    }
  })
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const { theme, resolvedTheme, toggleTheme } = useTheme()

  // Auto-adapt sidebar collapse when browser window is snapped to half-screen
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      try {
        const stored = localStorage.getItem('valmanager_sidebar_collapsed')
        if (stored === null) {
          setIsSidebarCollapsed(e.matches)
        }
      } catch { }
    }
    handleMediaChange(mediaQuery)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange)
      return () => mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  // Listen for global keyboard shortcuts (Cmd+K, N+I, N+O, etc.)
  const { pendingSequence } = useGlobalShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
  })

  // Check and run rolling daily safety snapshot ("The Oops Button" disaster recovery safeguard)
  useEffect(() => {
    import('@/services/storage/autoBackupService').then(({ checkAndRunDailyAutoSnapshot }) => {
      checkAndRunDailyAutoSnapshot().catch(() => { })
    })
  }, [])

  const { parties, receipts, dispatches, payments, expenses } = useData()

  // Real-time live counts for navigation items from reactive data store
  const navCounts = useMemo<{ [key: string]: number }>(
    () => ({
      '/parties': parties.length,
      '/receiving': receipts.length,
      '/dispatch': dispatches.length,
      '/payments': payments.length,
      '/expenses': expenses.length,
    }),
    [parties.length, receipts.length, dispatches.length, payments.length, expenses.length]
  )


  // Toggle desktop sidebar collapse
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('valmanager_sidebar_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Check if current route is a primary tab view (Dashboard, Inward, Outward, Billing, Expenses)
  // Check if current route is Settings
  const isSettingsPage = location.pathname === '/settings' || location.pathname.startsWith('/settings/')

  // Check if any modal or bottom sheet is open
  const isModalOpen = useIsModalOpen()

  return (
    <div
      style={{
        background: 'var(--color-paper)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
      className="min-h-dvh w-full bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150 relative"
    >
      {/* ── Full-Height Sidebar (Google AI Studio Pattern: fixed inset-y-0 left-0, hidden on mobile) ── */}
      <nav
        className={`hidden md:flex fixed inset-y-0 left-0 flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 select-none transition-all duration-200 ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'
          }`}
        aria-label="Sidebar Navigation"
      >
        {/* Top Header Section: Logo + Title + Collapse Toggle + Quick Search */}
        {isSidebarCollapsed ? (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 flex flex-col items-center gap-2.5">
            <div
              className="w-10 h-10 flex items-center justify-center cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => navigate('/')}
              title="ValManager Home"
            >
              <Logo size={28} showText={false} />
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Search or Action (⌘K)"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>
        ) : (
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex items-center gap-2.5 cursor-pointer min-w-0"
                onClick={() => navigate('/')}
              >
                <Logo size={30} showText={false} />
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  <span className="text-blue-600 dark:text-blue-400">Val</span>Manager
                </span>
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            {/* Quick Search Button (⌘K) */}
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all text-xs cursor-pointer shadow-2xs group"
              title="Quick Search or Action (Cmd + K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                <span className="font-medium truncate text-slate-500 dark:text-slate-400">Search or jump...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded shadow-2xs shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Middle Navigation Section: Vertical links with active state indicator */}
        {isSidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-thin flex flex-col items-center">
            {NAV_SECTIONS.flatMap((section) => section.items).map((t) => {
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
                  title={`${t.label} (${t.desc})`}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer outline-none select-none ${active
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.3 : 1.9}
                    className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors'}
                  />
                  {count !== undefined && count > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </NavLink>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col">
                <div className="px-3 pb-1.5 text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
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
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13px] text-left transition-colors duration-150 cursor-pointer min-h-[40px] group outline-none select-none relative ${active
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Icon
                            size={17}
                            strokeWidth={active ? 2.3 : 1.9}
                            className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0'}
                          />
                          <span className={`whitespace-nowrap truncate transition-colors ${active ? '!text-blue-600 dark:!text-blue-400 font-semibold' : ''}`}>
                            {t.label}
                          </span>
                        </div>
                        {count !== undefined && count > 0 && (
                          <span
                            className={`ml-auto px-2 py-0.5 rounded-full text-[10.5px] font-bold tabular-nums transition-colors shrink-0 text-right ${active
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200/80 dark:group-hover:bg-slate-700 group-hover:text-slate-800 dark:group-hover:text-slate-200'
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
        )}

        {/* Bottom Footer Section: User Profile + Sync Status + Theme Switcher */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
          {!isSidebarCollapsed ? (
            <div className="space-y-2.5">
              {/* Status Controls Row: Synced Badge + Theme Toggle */}
              <div className="flex items-center justify-between gap-2">
                <SyncIndicator compact={false} />
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 h-[36px] rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer shadow-2xs select-none transition-colors"
                  title={`Active Theme: ${theme.toUpperCase()} (Resolved: ${resolvedTheme}) • Click to toggle`}
                  aria-label="Toggle theme mode"
                >
                  {resolvedTheme === 'dark' ? (
                    <Moon size={14} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Sun size={14} className="text-amber-500 shrink-0" />
                  )}
                  <span className="capitalize">{resolvedTheme}</span>
                </button>
              </div>

              {/* Workspace Profile Info */}
              <div className="flex items-center gap-2.5 px-1 py-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  K
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    Kasab Val Manager
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Surat Jari Enterprise
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 py-1">
              <CollapsedSyncDot />
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
                title={`Theme: ${resolvedTheme} • Click to toggle`}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <Moon size={16} className="text-indigo-400" />
                ) : (
                  <Sun size={16} className="text-amber-500" />
                )}
              </button>
              <div
                className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-sm select-none"
                title="Kasab Val Manager (Surat Jari Enterprise)"
              >
                K
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Open Canvas Content Area (Google AI Studio Pattern: min-h-dvh md:pl-[72px] / md:pl-64) ── */}
      <main
        id="main-content"
        className={cn(
          'min-h-dvh bg-slate-50/70 dark:bg-slate-950 flex flex-col transition-all duration-200',
          isSidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-64'
        )}
      >
        <div
          className={cn(
            'flex-1 px-3 sm:px-5 md:px-6 lg:px-8 max-w-7xl w-full mx-auto pt-[max(0.875rem,env(safe-area-inset-top))] md:pt-6',
            isSettingsPage ? 'pb-8' : 'pb-24 md:pb-14'
          )}
        >
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Instagram-Style Minimal Bottom Navigation Bar (< 768px) ─── */}
      <BottomNavigation hidden={isSettingsPage} />

      {/* ── Expandable Floating Speed-Dial Action Button (FAB) ──────── */}
      {!isSettingsPage && !isModalOpen && (
        <SpeedDialFab />
      )}

      {/* ── Global Command Palette Modal ───────────────────────────── */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />

      {/* ── Floating Two-Key Sequence Shortcut Indicator ────────────── */}
      {pendingSequence === 'n' && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold">
            Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">I</kbd> for Inward or <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">O</kbd> for Outward
          </span>
        </div>
      )}
    </div>
  )
}

export { AppShell as Layout }
export default AppShell
