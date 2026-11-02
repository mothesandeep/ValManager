import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  MessageCircle,
  Layers,
  Printer,
  X,
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { useReportsMetrics } from '@/hooks/useReportsMetrics'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Party } from '@/features/parties/types/party.types'
import PartyKhataModal from '@/features/parties/components/PartyKhataModal'
import { getPartyInitials } from '@/features/parties/utils'
import { getCompanySettings } from '@/features/settings/utils'
import { fmtMoney } from '@/utils/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { KpiCard } from '@/components/common/KpiCard'
import { PullToRefresh } from '@/components/common/PullToRefresh'

const EXPENSE_COLOR_MAP: Record<string, { bar: string; dot: string }> = {
  Rent: { bar: 'bg-blue-500', dot: 'bg-blue-500' },
  Consumables: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  Maintenance: { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Transport: { bar: 'bg-sky-500', dot: 'bg-sky-500' },
  Labor: { bar: 'bg-slate-500', dot: 'bg-slate-500' },
  Utilities: { bar: 'bg-cyan-500', dot: 'bg-cyan-500' },
  Other: { bar: 'bg-slate-400', dot: 'bg-slate-400' },
}

export default function Reports() {
  const { parties, receipts, dispatches, payments, partyStats: stats, loading, refreshData } = useData()
  const { formattedMonth } = useMonth()

  const [activeKhataParty, setActiveKhataParty] = useState<Party | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const company = useMemo(() => getCompanySettings(), [])

  const {
    periodReceived,
    periodDispatched,
    periodExpenses,
    periodRevenue,
    periodProfit,
    profitMargin,
    categoryExpenses,
    activeCategories,
    allPartyRows,
    activePartiesCount,
  } = useReportsMetrics()

  // Party Performance sorting state
  const [sortField, setSortField] = useState<'party' | 'inward' | 'outward' | 'balance'>('outward')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (field: 'party' | 'inward' | 'outward' | 'balance') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder(field === 'party' ? 'asc' : 'desc')
    }
  }

  const sortedPartyRows = useMemo(() => {
    return [...allPartyRows].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'party':
          comparison = a.party.name.localeCompare(b.party.name)
          break
        case 'inward':
          comparison = (Number(a.totalReceivedWeight) || 0) - (Number(b.totalReceivedWeight) || 0)
          break
        case 'outward':
          comparison = (Number(a.totalDispatchWeight) || 0) - (Number(b.totalDispatchWeight) || 0)
          break
        case 'balance':
          comparison = (Number(a.balance) || 0) - (Number(b.balance) || 0)
          break
        default:
          comparison = 0
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [allPartyRows, sortField, sortOrder])

  // Highest pending balances (Overall ledger standing)
  const duesSorted = useMemo(() => {
    return parties
      .map((p) => ({ party: p, ...(stats[p.id] || { balance: 0 }) }))
      .filter((r) => (r.balance || 0) > 0)
      .sort((a, b) => b.balance - a.balance)
  }, [parties, stats])

  const totalPendingReceivables = useMemo(
    () => duesSorted.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0),
    [duesSorted]
  )

  const rangeDescription = formattedMonth

  // Send WhatsApp Reminder
  const handleSendReminder = (partyName: string, phone: string | null | undefined, balance: number) => {
    const cleanPhone = (phone || '').replace(/\D/g, '')
    const msg = `Namaste ${partyName}, your account balance on ValManager has an outstanding payment of ${fmtMoney(balance)}. Kindly arrange settlement at your earliest convenience. Thank you!`
    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      void navigator.clipboard.writeText(msg)
      alert(`Reminder copied to clipboard for ${partyName} (${fmtMoney(balance)})`)
    }
  }

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="flex flex-col pb-28 md:pb-16 w-full">
        {/* ── Standardized Universal Page Header ── */}
        <PageHeader
          title="Reports & Analytics"
          subtitle="Executive performance & tax summaries"
          showBack={true}
          rightAction={
            <MonthSelector
              isOpen={isDatePopoverOpen}
              onClose={() => setIsDatePopoverOpen(false)}
              onToggle={() => setIsDatePopoverOpen((prev) => !prev)}
            />
          }
        />

        {/* ── 2. Executive Net Profit Hero Banner (Top Hero Metric) ──────── */}
        <div className="rounded-2xl bg-slate-950 dark:bg-slate-900 border border-slate-800/80 p-4 shadow-md text-white mt-4 mb-3 relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {/* Top: Net margin badge + Margin percentage */}
          <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-400 bg-slate-800/90 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              ESTIMATED NET MARGIN
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              <TrendingUp size={12} />
              +{profitMargin}% Margin
            </span>
          </div>

          {/* Center: Large bold net margin */}
          <div
            className={`relative z-10 text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight ${periodProfit >= 0 ? 'text-white' : 'text-rose-400'
              }`}
          >
            {fmtMoney(periodProfit)}
          </div>

          {/* Bottom: Formula breakdown text */}
          <div className="relative z-10 text-[11px] text-slate-400 font-mono mt-2 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span>
              Revenue <strong className="text-emerald-400 font-bold">({fmtMoney(periodRevenue)})</strong>
            </span>
            <span className="text-slate-600 font-bold">−</span>
            <span>
              Expenses <strong className="text-rose-400 font-bold">({fmtMoney(periodExpenses)})</strong>
            </span>
            <span className="text-slate-600 font-bold">=</span>
            <span>
              Net Yield <strong className="text-white font-bold">({fmtMoney(periodProfit)})</strong>
            </span>
          </div>
        </div>

        {/* 4 Metric Grid: 2-column grid on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="Kasab Received"
            value={(Number(periodReceived) || 0).toFixed(3)}
            unit="kg"
            subtitle="Inward intake volume"
            dotColor="slate"
            loading={loading}
          />
          <KpiCard
            label="Val Dispatched"
            value={(Number(periodDispatched) || 0).toFixed(3)}
            unit="kg"
            subtitle="Finished delivery"
            dotColor="slate"
            loading={loading}
          />
          <KpiCard
            label="Revenue Billed"
            value={fmtMoney(periodRevenue)}
            subtitle="Invoiced production"
            dotColor="emerald"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
          <KpiCard
            label="Expenses"
            value={fmtMoney(periodExpenses)}
            subtitle="Operational burn"
            dotColor="rose"
            valueClassName="text-rose-600 dark:text-rose-400"
            loading={loading}
          />
        </div>

        {/* ── 3. Compact Insights & Allocation Panels ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Top Receivables / Overdue */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
                      Top Receivables / Overdue
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {duesSorted.length > 0
                        ? `${duesSorted.length} pending account${duesSorted.length === 1 ? '' : 's'} requiring collection`
                        : 'Unsettled party balances requiring collection'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60 tabular-nums shrink-0">
                  {fmtMoney(totalPendingReceivables)} Due
                </span>
              </div>

              {duesSorted.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-1.5" />
                  No pending dues — all accounts are cleared.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
                  {duesSorted.slice(0, 5).map((r) => (
                    <div
                      key={r.party.id}
                      className="p-2.5 rounded-lg flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {getPartyInitials(r.party.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {r.party.name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                            {r.party.phone ? `+91 ${r.party.phone}` : 'No phone listed'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            {fmtMoney(r.balance)}
                          </div>
                          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Overdue
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendReminder(r.party.name, r.party.phone, r.balance)}
                          title={`Send WhatsApp Reminder to ${r.party.name}`}
                          className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <MessageCircle size={10} className="fill-white" />
                          </span>
                          <span className="font-medium">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-4">
              <span>Showing top {Math.min(5, duesSorted.length)} pending parties</span>
              <a
                href="/payments"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Open Ledger</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          {/* Right: Operating Expense Allocation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Operating Expense Allocation
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Percentage distribution by active categories
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                {fmtMoney(periodExpenses)}
              </span>
            </div>

            {periodExpenses === 0 || activeCategories.length === 0 ? (
              <div className="py-5 sm:py-6 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-1.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
                <Layers size={20} className="text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <span className="text-[11px]">No operational expenses logged for this period</span>
              </div>
            ) : (
              <>
                {/* Horizontal Stacked Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    {activeCategories.map((c) => {
                      const pct = Math.max(0, (c.amount / periodExpenses) * 100)
                      const colorClass = EXPENSE_COLOR_MAP[c.category]?.bar || 'bg-slate-400'
                      return (
                        <div
                          key={c.category}
                          style={{ width: `${pct}%` }}
                          className={`${colorClass} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                          title={`${c.category}: ${fmtMoney(c.amount)} (${c.percentage}%)`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                    <span>0%</span>
                    <span>Category Allocation Breakdown</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Compact Legend Table */}
                <div className="overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Category</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                        <th className="py-1.5 px-3 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeCategories.map((c) => {
                        const colors = EXPENSE_COLOR_MAP[c.category] || {
                          dot: 'bg-slate-400',
                          bar: 'bg-slate-400',
                        }
                        return (
                          <tr key={c.category} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-1.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{c.category}</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100 text-xs">
                              {fmtMoney(c.amount)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-medium tabular-nums text-slate-500 dark:text-slate-400 text-xs">
                              {c.percentage}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 4. 'Party Performance' Compact Data Table ──────────── */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-950 dark:text-white tracking-tight">
              Party Performance
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100/80 dark:bg-slate-800 px-3 py-1 rounded-xl font-medium font-mono">
              {allPartyRows.length} Accounts
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl p-10 text-center text-sm border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-slate-400">
              Loading performance data…
            </div>
          ) : allPartyRows.length === 0 ? (
            <EmptyState
              title="No party performance records"
              description="Records will populate once inward or outward transactions are recorded."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mt-2">
              <div className="relative w-full">
                <div
                  className="w-full overflow-x-auto overscroll-x-contain scrollbar-thin"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                  tabIndex={0}
                  role="region"
                  aria-label="Party Performance Table"
                >
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 select-none">
                      <tr className="select-none">
                        {/* 1. PARTY NAME */}
                        <th
                          onClick={() => toggleSort('party')}
                          className="py-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 leading-tight select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left w-[130px] min-w-[120px] max-w-[145px]"
                        >
                          <div className="flex items-center gap-1">
                            <span>Party Name</span>
                            {sortField === 'party' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white" />
                            ) : (
                              <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                        </th>

                        {/* 2. INWARD (KG) */}
                        <th
                          onClick={() => toggleSort('inward')}
                          className="py-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 leading-tight select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right w-[88px] min-w-[80px]"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Inward (kg)</span>
                            {sortField === 'inward' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white" />
                            ) : (
                              <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                        </th>

                        {/* 3. OUTWARD (KG) */}
                        <th
                          onClick={() => toggleSort('outward')}
                          className="py-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 leading-tight select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right w-[88px] min-w-[80px]"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Outward (kg)</span>
                            {sortField === 'outward' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white" />
                            ) : (
                              <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                        </th>

                        {/* 4. NET LEDGER */}
                        <th
                          onClick={() => toggleSort('balance')}
                          className="py-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 leading-tight select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right w-[105px] min-w-[95px]"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Net Ledger</span>
                            {sortField === 'balance' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white" />
                            ) : (
                              <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {sortedPartyRows.map((r) => {
                        const isOverdue = r.balance > 0
                        const isAdvance = r.balance < 0

                        return (
                          <tr
                            key={r.party.id}
                            onClick={() => setActiveKhataParty(r.party)}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 active:bg-slate-50 dark:active:bg-slate-800/80 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80"
                          >
                            {/* 1. PARTY NAME - Clean bold text matching Inward/Outward design */}
                            <td className="py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/80 align-middle leading-tight whitespace-nowrap w-[130px] min-w-[120px] max-w-[145px]">
                              <span className="font-semibold text-xs text-slate-900 dark:text-white tracking-tight truncate block max-w-[130px] sm:max-w-[200px]">
                                {r.party.name}
                              </span>
                            </td>

                            {/* 2. INWARD (KG) */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap align-middle border-b border-slate-100 dark:border-slate-800/80 w-[88px] min-w-[80px]">
                              {(Number(r.totalReceivedWeight) || 0).toFixed(3)}{' '}
                              <span className="text-[10px] font-sans text-slate-400 font-normal">kg</span>
                            </td>

                            {/* 3. OUTWARD (KG) */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-900 dark:text-white whitespace-nowrap align-middle font-medium border-b border-slate-100 dark:border-slate-800/80 w-[88px] min-w-[80px]">
                              {(Number(r.totalDispatchWeight) || 0).toFixed(3)}{' '}
                              <span className="text-[10px] font-sans text-slate-400 font-normal">kg</span>
                            </td>

                            {/* 4. NET LEDGER */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-xs tabular-nums whitespace-nowrap align-middle border-b border-slate-100 dark:border-slate-800/80 w-[105px] min-w-[95px]">
                              {isOverdue ? (
                                <span className="text-rose-600 dark:text-rose-400">
                                  {fmtMoney(r.balance)} Due
                                </span>
                              ) : isAdvance ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {fmtMoney(Math.abs(r.balance))} Adv
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  ₹0
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standard Professional Summary Footer Bar */}
              <div className="h-9 px-3 sm:px-4 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
                <div className="flex items-center gap-1.5 truncate">
                  <span>
                    Showing <strong className="font-semibold text-slate-900 dark:text-white font-mono">{allPartyRows.length}</strong> Accounts (<strong className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{activePartiesCount} Active</strong>)
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-mono tabular-nums">
                    Net Due: <strong className="font-bold text-rose-600 dark:text-rose-400">{fmtMoney(totalPendingReceivables)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Printable Executive Report Modal ───────────────────────── */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10">
              {/* Modal Actions Toolbar (hidden in print) */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print modal-header">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-emerald-400" />
                  <span className="text-sm font-bold tracking-tight">Print Executive Financial Report</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print / Save PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Content Body */}
              <div id="printable-manifest" className="p-8 sm:p-10 overflow-y-auto no-scrollbar space-y-6 text-slate-900 text-xs printable-document">
                {/* Header Letterhead */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                    {company.companyName}
                  </h1>
                  {company.gstin && (
                    <p className="text-[11px] font-mono font-bold text-slate-700">
                      GSTIN: {company.gstin}
                    </p>
                  )}
                  {company.address && (
                    <p className="text-xs text-slate-600">
                      {company.address}
                    </p>
                  )}
                  {(company.phone || company.email) && (
                    <p className="text-[11px] text-slate-500">
                      {company.phone ? `Phone: ${company.phone}` : ''} {company.email ? `• Email: ${company.email}` : ''}
                    </p>
                  )}
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black tracking-widest uppercase border border-slate-200">
                      EXECUTIVE FINANCIAL & OPERATIONAL AUDIT REPORT
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1">
                    Scope: <strong>{rangeDescription}</strong> • Generated on {new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid grid-cols-4 gap-3 py-2">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Kasab Received</span>
                    <span className="text-base font-black tabular-nums">{periodReceived.toFixed(3)} kg</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Val Dispatched</span>
                    <span className="text-base font-black tabular-nums">{periodDispatched.toFixed(3)} kg</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Revenue Billed</span>
                    <span className="text-base font-black tabular-nums text-emerald-700">{fmtMoney(periodRevenue)}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Net Profit (EBITDA)</span>
                    <span className="text-base font-black tabular-nums text-slate-900">{fmtMoney(periodProfit)} ({profitMargin}%)</span>
                  </div>
                </div>

                {/* Category-wise Expenses Breakdown */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Operating Expenses Breakdown
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {categoryExpenses.map((c) => (
                      <div key={c.category} className="p-2 border border-slate-200 rounded-lg">
                        <div className="text-[10px] text-slate-500 font-semibold">{c.category}</div>
                        <div className="font-bold text-xs tabular-nums text-slate-800">{fmtMoney(c.amount)}</div>
                        <div className="text-[9px] text-slate-400">{c.percentage}% of total</div>
                      </div>
                    ))}
                    <div className="p-2 border border-slate-300 bg-slate-100/70 rounded-lg">
                      <div className="text-[10px] font-bold text-slate-700">Total Expenses</div>
                      <div className="font-black text-xs tabular-nums text-rose-700">{fmtMoney(periodExpenses)}</div>
                      <div className="text-[9px] text-slate-500 font-medium">100% total</div>
                    </div>
                  </div>
                </div>

                {/* Party Performance Table */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Party Accounts Summary & Net Standing ({activePartiesCount} Active Accounts)
                  </h3>
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-300 font-bold uppercase text-slate-600">
                        <th className="py-1 px-2">Party</th>
                        <th className="py-1 px-2 text-right">Inward (kg)</th>
                        <th className="py-1 px-2 text-right">Outward (kg)</th>
                        <th className="py-1 px-2 text-right">Billed</th>
                        <th className="py-1 px-2 text-right">Received</th>
                        <th className="py-1 px-2 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allPartyRows.filter(r => r.hasActivity || r.balance !== 0).map((r) => (
                        <tr key={r.party.id}>
                          <td className="py-1.5 px-2 font-bold">{r.party.name}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{r.totalReceivedWeight.toFixed(3)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{r.totalDispatchWeight.toFixed(3)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{fmtMoney(r.totalDispatchValue)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-emerald-700">{fmtMoney(r.received)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums font-bold">
                            {r.balance > 0 ? (
                              <span className="text-rose-700">{fmtMoney(r.balance)}</span>
                            ) : r.balance < 0 ? (
                              <span className="text-emerald-700">{fmtMoney(Math.abs(r.balance))} (Adv)</span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-bold">
                        <td className="py-1.5 px-2">Total Outstanding Receivables</td>
                        <td colSpan={4}></td>
                        <td className="py-1.5 px-2 text-right text-rose-700 font-black tabular-nums text-xs">
                          {fmtMoney(totalPendingReceivables)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures Footer */}
                <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-400 h-10 w-48 mx-auto" />
                    <span className="font-bold text-slate-700 block mt-1">Prepared By (Accounts)</span>
                    <span className="text-[10px] text-slate-400">ValManager Automated Engine</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-10 w-48 mx-auto" />
                    <span className="font-bold text-slate-700 block mt-1">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-400">For {company.companyName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Party Khata Ledger Modal (Slide-up on Row Tap) ─────────── */}
        {activeKhataParty && (
          <PartyKhataModal
            isOpen={Boolean(activeKhataParty)}
            onClose={() => setActiveKhataParty(null)}
            party={activeKhataParty}
            stats={stats[activeKhataParty.id] || null}
            receipts={receipts}
            dispatches={dispatches}
            payments={payments}
            onDataChange={refreshData}
          />
        )}
      </div>
    </PullToRefresh>
  )
}
