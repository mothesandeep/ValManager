import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Truck,
  ChevronRight,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Search,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useMonth } from '@/context/MonthContext'
import { useData } from '@/hooks/useData'
import { MonthSelector } from '@/components/common/MonthSelector'
import { Logo } from '@/components/common/Logo'
import { SyncIndicator } from '@/components/common/SyncIndicator'
import { KpiCard } from '@/components/common/KpiCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { ReceiptWithParty } from '@/features/inward/types/inward.types'
import type { DispatchWithParty } from '@/features/outward/types/outward.types'
import { isRolaEntry } from '@/utils/calculations'
import { fmtDate } from '@/utils/date'
import { fmtKg, fmtMoney } from '@/utils/format'
import { PullToRefresh } from '@/components/common/PullToRefresh'

type ReceiptGroup = {
  key: string
  challanNo: string | null
  date: string
  partyId: string | null
  partyName: string
  entries: ReceiptWithParty[]
  totalNet: number
  totalRolaCount: number
}

type ChallanGroup = {
  key: string
  challanNo: string | null
  date: string
  partyId: string | null
  partyName: string
  entries: DispatchWithParty[]
  totalGross: number
  totalNet: number
  totalValNet: number
  totalRolaGross: number
  totalRolaCount: number
  totalAmount: number
  hasVal: boolean
  hasRola: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { filterByMonth, isAllTime, formattedMonth } = useMonth()
  const { parties, receipts, dispatches, expenses, partyStats: stats, isLoading: loading, refreshData } = useData()
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Shortcut: press '/' anywhere on the dashboard to immediately focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const matchedQuickParties = useMemo(() => {
    if (!quickSearch.trim()) return []
    const q = quickSearch.trim().toLowerCase()
    return parties
      .filter((p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)))
      .slice(0, 5)
  }, [quickSearch, parties])

  const totalDue = useMemo(
    () =>
      Object.values(stats).reduce(
        (sum, x) => sum + (x.balance > 0 ? x.balance : 0),
        0
      ),
    [stats]
  )

  const rolaPending = useMemo(
    () =>
      Object.values(stats).reduce(
        (sum, x) => sum + (x.rolaPending > 0 ? x.rolaPending : 0),
        0
      ),
    [stats]
  )

  const monthExpenses = useMemo(
    () =>
      filterByMonth(expenses).reduce(
        (sum, x) => sum + (Number(x.amount) || 0),
        0
      ),
    [filterByMonth, expenses]
  )

  const monthDispatches = useMemo(
    () => filterByMonth(dispatches),
    [filterByMonth, dispatches]
  )

  const monthDispatchNet = useMemo(
    () =>
      monthDispatches.reduce(
        (sum, d) => sum + (Number(d.net_val_weight) || 0),
        0
      ),
    [monthDispatches]
  )

  const monthReceipts = useMemo(
    () => filterByMonth(receipts),
    [filterByMonth, receipts]
  )

  const monthReceivedNet = useMemo(
    () =>
      monthReceipts.reduce((sum, r) => sum + (Number(r.net_weight) || 0), 0),
    [monthReceipts]
  )

  const monthRevenue = useMemo(
    () =>
      monthDispatches.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [monthDispatches]
  )

  const recentChallanGroups = useMemo((): ChallanGroup[] => {
    // If filtered month has records, display them; otherwise fallback to recent dispatches across all records
    const source = monthDispatches.length > 0 ? monthDispatches : dispatches
    const grouped: Map<string, DispatchWithParty[]> = new Map()
    for (const d of source) {
      // Group key: challan_no + party_id + date so entries merge accurately by challan & date
      const key = d.challan_no
        ? `ch:${d.challan_no}:${d.party_id}:${d.date}`
        : `id:${d.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }

    const list = Array.from(grouped.entries()).map(([key, rawEntries]) => {
      const entries = [...rawEntries].sort((a, b) => {
        const aIsRola = isRolaEntry(a) ? 1 : 0
        const bIsRola = isRolaEntry(b) ? 1 : 0
        return aIsRola - bIsRola
      })
      const first = entries[0]
      const totalGross = entries.reduce((s, e) => s + (Number(e.bore_gross_weight) || 0), 0)
      const totalValNet = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (!isR ? (Number(e.net_val_weight) || 0) : 0)
      }, 0)
      const totalRolaGross = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.bore_gross_weight) || 0) : 0)
      }, 0)
      const totalRolaCount = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.rola_count) || 0) : 0)
      }, 0)
      const totalNet = totalValNet + totalRolaGross
      const totalAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id,
        partyName: first.party?.name ?? '—',
        entries,
        totalGross,
        totalNet,
        totalValNet,
        totalRolaGross,
        totalRolaCount,
        totalAmount,
        hasVal: entries.some((e) => !isRolaEntry(e)),
        hasRola: entries.some((e) => isRolaEntry(e)),
      }
    })

    return list
      .sort((a, b) => (a.date < b.date ? 1 : (a.date > b.date ? -1 : 0)))
      .slice(0, 5)
  }, [monthDispatches, dispatches])

  const recentReceiptGroups = useMemo((): ReceiptGroup[] => {
    // If filtered month has records, display them; otherwise fallback to recent receipts across all records
    const source = monthReceipts.length > 0 ? monthReceipts : receipts
    const grouped: Map<string, ReceiptWithParty[]> = new Map()
    for (const r of source) {
      // Group key: challan_no + party_id + date so entries merge accurately by challan & date
      const key = r.challan_no
        ? `ch:${r.challan_no}:${r.party_id}:${r.date}`
        : `id:${r.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }

    const list = Array.from(grouped.entries()).map(([key, rawEntries]) => {
      const entries = [...rawEntries]
      const first = entries[0]
      const totalNet = entries.reduce((s, e) => s + (Number(e.net_weight) || 0), 0)
      const totalRolaCount = entries.reduce((s, e) => s + (Number(e.rola_count) || 0), 0)

      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id,
        partyName: first.party?.name ?? '—',
        entries,
        totalNet,
        totalRolaCount
      }
    })

    return list
      .sort((a, b) => (a.date < b.date ? 1 : (a.date > b.date ? -1 : 0)))
      .slice(0, 5)
  }, [monthReceipts, receipts])

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="space-y-4 md:space-y-6 pb-28 md:pb-16 animate-in fade-in duration-300 w-full">
        {/* ── Dashboard Top Branding Bar (Dashboard ONLY, Non-Sticky) ── */}
        <header className="flex items-center justify-between pb-1 select-none">
          {/* Left: Logo + "ValManager" + "• Synced" badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
              onClick={() => navigate('/')}
            >
              <Logo size={28} showText={false} />
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                <span className="text-amber-500 dark:text-amber-400">Val</span>Manager
              </span>
            </div>
            <SyncIndicator compact={true} />
          </div>

          {/* Right: Month Selector Dropdown + Quick Theme Toggle + Settings gear button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <MonthSelector
              isOpen={isDatePopoverOpen}
              onClose={() => setIsDatePopoverOpen(false)}
              onToggle={() => setIsDatePopoverOpen((prev) => !prev)}
            />
            <button
              type="button"
              onClick={toggleTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all select-none shrink-0 cursor-pointer"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" strokeWidth={2} />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all select-none shrink-0 cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* ── Zero-Friction Instant Action & Quick Entry Bar (Desktop Only — on mobile, FAB '+' & Bottom Nav handle entry) ── */}
        <div className="hidden md:block relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search input with autofocus & '/' keyboard shortcut */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                inputMode="search"
                autoCorrect="off"
                spellCheck={false}
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search party khata, challan #... (Press / to focus)"
                className="w-full h-10 pl-9 pr-14 text-xs sm:text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all"
              />
              <span className="hidden sm:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">
                /
              </span>
            </div>

            {/* 1-Click Entry Buttons: Zero clicks wasted */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/receiving?action=new')}
                className="flex-1 sm:flex-initial h-11 sm:h-10 min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="1-Click Record Inward Kasab"
              >
                <PackagePlus size={15} />
                <span>+ Inward</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dispatch?action=new')}
                className="flex-1 sm:flex-initial h-11 sm:h-10 min-h-[44px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="1-Click Record Outward Val Dispatch"
              >
                <Truck size={15} />
                <span>+ Outward</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/payments?action=new')}
                className="flex-1 sm:flex-initial h-11 sm:h-10 min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="1-Click Record Payment Settlement"
              >
                <Wallet size={15} />
                <span>+ Payment</span>
              </button>
            </div>
          </div>

          {/* Quick Party Search Dropdown Overlay */}
          {matchedQuickParties.length > 0 && (
            <div className="absolute left-2 right-2 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {matchedQuickParties.map((p) => {
                const pStat = stats[p.id]
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setQuickSearch('')
                      navigate(`/parties`)
                    }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">{p.name}</span>
                      {p.phone && <span className="text-[11px] text-slate-400 font-mono">{p.phone}</span>}
                    </div>
                    {pStat && (
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 block">
                          ₹{pStat.balance.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400">Balance</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 1. Unified 6-Card KPI Metrics Grid with Standardized Design Tokens ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <KpiCard
            label="BALANCE DUE"
            dotColor="amber"
            value={fmtMoney(totalDue)}
            subtitle="Party ledgers receivable"
            loading={loading}
            onClick={() => navigate('/parties')}
          />
          <KpiCard
            label={isAllTime ? 'EARNINGS' : 'MONTHLY'}
            dotColor="emerald"
            value={fmtMoney(monthRevenue)}
            subtitle={isAllTime ? 'All dispatches' : `${formattedMonth} revenue`}
            loading={loading}
          />
          <KpiCard
            label={isAllTime ? 'VAL DISPATCHED' : `VAL (${formattedMonth.toUpperCase()})`}
            dotColor="slate"
            value={monthDispatchNet.toFixed(3)}
            unit="kg"
            subtitle={isAllTime ? 'All finished val' : 'Finished val'}
            loading={loading}
            onClick={() => navigate('/dispatch')}
          />
          <KpiCard
            label={isAllTime ? 'KASAB RECEIVED' : `KASAB (${formattedMonth.toUpperCase()})`}
            dotColor="slate"
            value={monthReceivedNet.toFixed(3)}
            unit="kg"
            subtitle={isAllTime ? 'All raw intake' : 'Raw intake'}
            loading={loading}
            onClick={() => navigate('/receiving')}
          />
          <KpiCard
            label="ROLA PENDING"
            dotColor="blue"
            value={rolaPending.toLocaleString('en-IN')}
            unit="pcs"
            subtitle="With parties"
            loading={loading}
            onClick={() => navigate('/dispatch')}
          />
          <KpiCard
            label={isAllTime ? 'EXPENSES' : `EXPENSES (${formattedMonth.toUpperCase()})`}
            dotColor="rose"
            value={fmtMoney(monthExpenses)}
            valueClassName="text-rose-600 dark:text-rose-400"
            subtitle="Operating costs"
            loading={loading}
            onClick={() => navigate('/expenses')}
          />
        </div>

        {/* ── 3. Side-by-Side Recent Activity Containers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
          {/* Left Container: Recent Inward Receipts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-2">
                <span>Recent Inward Receipts</span>
              </h3>
              <Link
                to="/receiving"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3 animate-pulse">
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : recentReceiptGroups.length === 0 ? (
              <EmptyState
                icon={PackagePlus}
                title="No inward receipts"
                description={isAllTime ? 'No inward receipts recorded yet.' : `No inward receipts in ${formattedMonth}.`}
                actionLabel="+ Record Inward"
                onAction={() => navigate('/receiving?action=new')}
                className="border-0 shadow-none rounded-none py-10"
              />
            ) : (
              <>
                {/* Mobile Standardized Horizontal Scroll Table (< 768px) */}
                <div className="block md:hidden w-full overflow-x-auto overscroll-x-contain scrollbar-none rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 leading-tight select-none">
                      <tr className="h-8 select-none">
                        <th className="sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] px-2 py-2 w-14 min-w-[56px] max-w-[56px] font-mono text-[10px] font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider leading-tight border-b border-slate-200 dark:border-slate-800">
                          CH. #
                        </th>
                        <th className="px-2 py-2 min-w-[105px] max-w-[120px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">PARTY NAME</th>
                        <th className="px-2 py-2 text-center min-w-[70px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">DATE</th>
                        <th className="px-2 py-2 pr-2 text-right min-w-[75px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">NET</th>
                        <th className="px-2 py-2 pr-2.5 text-right min-w-[75px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">BAGS / ROLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentReceiptGroups.map((group) => (
                        <tr
                          key={group.key}
                          onClick={() => navigate('/receiving')}
                          className="border-b border-slate-100 dark:border-slate-800/80 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/40 cursor-pointer transition-colors select-none"
                        >
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] py-1.5 px-2 w-14 min-w-[56px] max-w-[56px] font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 leading-none align-middle whitespace-nowrap">
                            {group.challanNo ? (
                              <span className="truncate block font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs leading-none">
                                #{String(group.challanNo).replace(/^#/, '')}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-xs leading-none block">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 align-middle min-w-[105px] max-w-[120px] border-b border-slate-100 dark:border-slate-800/80 leading-tight">
                            <span
                              className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate block leading-tight max-w-[120px]"
                              title={group.partyName}
                            >
                              {group.partyName}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 align-middle text-left min-w-[70px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-none block">
                              {fmtDate(group.date)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 pr-2 align-middle text-right min-w-[75px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <span className="font-mono font-semibold text-xs text-ink dark:text-white tabular-nums leading-none block">
                              {group.totalNet.toFixed(3)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 pr-2.5 align-middle text-right min-w-[75px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 font-mono text-xs leading-none">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {group.entries.length}b
                              </span>
                              {group.totalRolaCount > 0 && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50 leading-none">
                                  {group.totalRolaCount}r
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto flex-1 rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                      <tr>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Challan</th>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Party</th>
                        <th className="py-2.5 px-3 text-center bg-slate-50 dark:bg-slate-900">Date</th>
                        <th className="py-2.5 px-3 text-right bg-slate-50 dark:bg-slate-900">Bags</th>
                        <th className="py-2.5 px-3 pr-4 text-right bg-slate-50 dark:bg-slate-900">Net Wt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentReceiptGroups.map((group) => (
                        <tr
                          key={group.key}
                          onClick={() => navigate('/receiving')}
                          className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 align-middle">
                            {group.challanNo ? (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200/60 dark:border-slate-700 whitespace-nowrap">
                                Ch. #{group.challanNo}
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200/60 dark:border-slate-700 whitespace-nowrap">
                                No Ch.
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle">
                            <span
                              className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block max-w-[130px] sm:max-w-[170px]"
                              title={group.partyName}
                            >
                              {group.partyName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-middle text-center">
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                              {fmtDate(group.date)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-middle text-right">
                            <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 font-medium">
                              {group.entries.length} bags
                            </span>
                          </td>
                          <td className="py-2.5 px-3 pr-4 align-middle text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono tabular-nums text-xs font-bold text-ink dark:text-white whitespace-nowrap">
                                {fmtKg(group.totalNet)}
                              </span>
                              {group.totalRolaCount > 0 && (
                                <span className="font-mono tabular-nums text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                  {group.totalRolaCount} rola
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Right Container: Recent Outward Dispatches */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-2">
                <span>Recent Outward Dispatches</span>
              </h3>
              <Link
                to="/dispatch"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3 animate-pulse">
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : recentChallanGroups.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No dispatch entries"
                description={isAllTime ? 'No dispatch entries recorded yet.' : `No dispatch entries in ${formattedMonth}.`}
                actionLabel="+ Record Outward"
                onAction={() => navigate('/dispatch?action=new')}
                className="border-0 shadow-none rounded-none py-10"
              />
            ) : (
              <>
                {/* Mobile Standardized Horizontal Scroll Table (< 768px) */}
                <div className="block md:hidden w-full overflow-x-auto overscroll-x-contain scrollbar-none rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 leading-tight select-none">
                      <tr className="h-8 select-none">
                        <th className="sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] px-2 py-2 w-14 min-w-[56px] max-w-[56px] font-mono text-[10px] font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider leading-tight border-b border-slate-200 dark:border-slate-800">
                          CH. #
                        </th>
                        <th className="px-2 py-2 min-w-[105px] max-w-[120px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">PARTY NAME</th>
                        <th className="px-2 py-2 text-center min-w-[70px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">DATE</th>
                        <th className="px-2 py-2 pr-2 text-right min-w-[75px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">NET</th>
                        <th className="px-2 py-2 text-right min-w-[75px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">ROLA / ENTRIES</th>
                        <th className="px-2 py-2 pr-2.5 text-right min-w-[75px] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentChallanGroups.map((group) => (
                        <tr
                          key={group.key}
                          onClick={() => navigate('/dispatch')}
                          className="border-b border-slate-100 dark:border-slate-800/80 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/40 cursor-pointer transition-colors select-none"
                        >
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] py-1.5 px-2 w-14 min-w-[56px] max-w-[56px] font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 leading-none align-middle whitespace-nowrap">
                            {group.challanNo ? (
                              <span className="truncate block font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs leading-none">
                                #{String(group.challanNo).replace(/^#/, '')}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-xs leading-none block">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 align-middle min-w-[105px] max-w-[120px] border-b border-slate-100 dark:border-slate-800/80 leading-tight">
                            <span
                              className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate block leading-tight max-w-[120px]"
                              title={group.partyName}
                            >
                              {group.partyName}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 align-middle text-left min-w-[70px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-none block">
                              {fmtDate(group.date)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 pr-2 align-middle text-right min-w-[75px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <span className="font-mono font-semibold text-xs text-ink dark:text-white tabular-nums leading-none block">
                              {group.totalNet.toFixed(3)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 align-middle text-right min-w-[75px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 font-mono text-xs leading-none">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                              </span>
                              {group.hasRola && (group.totalRolaCount > 0 || group.totalRolaGross > 0) && (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/50 leading-none">
                                  {group.totalRolaCount}r
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 pr-2.5 align-middle text-right min-w-[75px] border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                            {group.totalAmount > 0 ? (
                              <span className="font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums leading-none block">
                                {fmtMoney(group.totalAmount)}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 dark:text-slate-600 text-xs leading-none block">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto flex-1 rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                      <tr>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Challan</th>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Party</th>
                        <th className="py-2.5 px-3 text-center bg-slate-50 dark:bg-slate-900">Date</th>
                        <th className="py-2.5 px-3 text-right bg-slate-50 dark:bg-slate-900">Net Wt</th>
                        <th className="py-2.5 px-3 text-right bg-slate-50 dark:bg-slate-900">Rola</th>
                        <th className="py-2.5 px-3 pr-4 text-right bg-slate-50 dark:bg-slate-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentChallanGroups.map((group) => (
                        <tr
                          key={group.key}
                          onClick={() => navigate('/dispatch')}
                          className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 align-middle">
                            {group.challanNo ? (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200/60 dark:border-slate-700 whitespace-nowrap">
                                Ch. #{group.challanNo}
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200/60 dark:border-slate-700 whitespace-nowrap">
                                No Ch.
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle">
                            <span
                              className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block max-w-[120px] sm:max-w-[150px]"
                              title={group.partyName}
                            >
                              {group.partyName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-middle text-center">
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                              {fmtDate(group.date)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-middle text-right">
                            {group.totalValNet > 0 ? (
                              <span className="font-mono tabular-nums text-xs font-bold text-ink dark:text-white whitespace-nowrap">
                                {fmtKg(group.totalValNet)}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle text-right">
                            {group.hasRola && (group.totalRolaCount > 0 || group.totalRolaGross > 0) ? (
                              <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                {group.totalRolaCount} pcs
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">0 pcs</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 pr-4 align-middle text-right">
                            {group.totalAmount > 0 ? (
                              <span className="font-mono tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                {fmtMoney(group.totalAmount)}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 4. Analytics Shortcut Card / Banner ── */}
        <Link
          to="/reports"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 group cursor-pointer active:scale-[0.99] transition-all select-none"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center shrink-0 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Reports & Analytics
                </span>
                <span className="text-[10px] font-semibold tracking-wide text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-mono border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                  Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
                Performance, Margins & Ledgers
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        {/* ── 5. Bottom Party Directory Navigation Card ── */}
        <Link
          to="/parties"
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 group cursor-pointer active:scale-[0.99] transition-all select-none"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:border-slate-900 transition-all">
              <Users size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Party Directory
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono border border-slate-200/60 dark:border-slate-700 shrink-0">
                  {loading ? '...' : `${parties.length} Accounts`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
                Ledgers, outstanding party balances, and contact masters
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>
    </PullToRefresh>
  )
}
