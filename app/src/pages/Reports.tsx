import { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Download,
  Receipt,
  Truck,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchExpenses } from '../lib/api/expenses'
import { fetchPayments } from '../lib/api/payments'
import { computePartyStats } from '../lib/api/stats'

import { useMonth } from '../context/MonthContext'
import type { Party, PartyStats } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import type { Expense } from '../features/expenses/types'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Reports() {
  const { filterByMonth, formattedMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<Record<string, PartyStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [
          partiesData,
          receiptsData,
          dispatchesData,
          expensesData,
          paymentsData,
        ] = await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchExpenses(),
          fetchPayments(),
        ])

        setParties(partiesData)
        setReceipts(receiptsData)
        setDispatches(dispatchesData)
        setExpenses(expensesData)

        const computed = computePartyStats(
          partiesData,
          receiptsData,
          dispatchesData,
          paymentsData
        )
        setStats(computed)
      } catch (err) {
        console.error('Error loading reports data:', err)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const monthReceived = useMemo(
    () => filterByMonth(receipts).reduce((s, r) => s + (Number(r.net_weight) || 0), 0),
    [filterByMonth, receipts]
  )

  const monthDispatched = useMemo(
    () => filterByMonth(dispatches).reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0),
    [filterByMonth, dispatches]
  )

  const monthExpenses = useMemo(
    () => filterByMonth(expenses).reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [filterByMonth, expenses]
  )

  const monthRevenue = useMemo(
    () => filterByMonth(dispatches).reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [filterByMonth, dispatches]
  )

  const monthProfit = monthRevenue - monthExpenses
  const profitMargin = monthRevenue > 0
    ? Math.max(0, ((monthProfit / monthRevenue) * 100)).toFixed(1)
    : '0.0'

  // All parties including zero activity parties at bottom
  const allPartyRows = useMemo(() => {
    return parties
      .map((p) => {
        const pStats = stats[p.id] || {
          totalReceivedWeight: 0,
          totalDispatchWeight: 0,
          totalDispatchValue: 0,
          received: 0,
          balance: 0,
        }
        const hasActivity =
          (Number(pStats.totalDispatchWeight) || 0) > 0 ||
          (Number(pStats.totalDispatchValue) || 0) > 0
        return {
          party: p,
          ...pStats,
          hasActivity,
        }
      })
      .sort((a, b) => {
        if (a.hasActivity && !b.hasActivity) return -1
        if (!a.hasActivity && b.hasActivity) return 1
        return (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0)
      })
  }, [parties, stats])

  // Active parties with actual dispatch/revenue data
  const activePartiesCount = useMemo(
    () =>
      allPartyRows.filter(
        (p) =>
          (Number(p.totalDispatchWeight) || 0) > 0 ||
          (Number(p.totalDispatchValue) || 0) > 0
      ).length,
    [allPartyRows]
  )

  // Highest pending balances
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

  // Download Party Statement CSV
  const handleDownloadPartyStatement = (r: (typeof allPartyRows)[0]) => {
    const headers = ['Field', 'Value']
    const rows = [
      ['Party Name', `"${r.party.name}"`],
      ['Phone', `"${r.party.phone || 'N/A'}"`],
      ['Reporting Month', `"${formattedMonth}"`],
      ['Total Val Dispatched (kg)', (r.totalDispatchWeight || 0).toFixed(3)],
      ['Billed Amount (INR)', r.totalDispatchValue || 0],
      ['Payment Received (INR)', r.received || 0],
      ['Net Balance (INR)', r.balance || 0],
      [
        'Standing Status',
        r.balance > 0 ? 'Overdue Receivable' : r.balance < 0 ? 'Advance Credit' : 'Cleared Account',
      ],
    ]
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_${r.party.name.replace(/\s+/g, '_')}_${formattedMonth.replace(/\s+/g, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Global Financial Executive Report Export
  const handleExportFinancialReport = () => {
    const lines: string[] = []
    lines.push('VALMANAGER EXECUTIVE FINANCIAL REPORT')
    lines.push(`Period,${formattedMonth}`)
    lines.push(`Generated Date,${new Date().toLocaleDateString('en-IN')}`)
    lines.push('')
    lines.push('--- MONTHLY OPERATIONAL METRICS ---')
    lines.push(`Kasab Inward Intake (kg),${monthReceived.toFixed(3)}`)
    lines.push(`Val Outward Dispatched (kg),${monthDispatched.toFixed(3)}`)
    lines.push(`Revenue Billed (INR),${monthRevenue}`)
    lines.push(`Operating Expenses (INR),${monthExpenses}`)
    lines.push(`Estimated Net Profit (INR),${monthProfit}`)
    lines.push(`Operating Profit Margin,${profitMargin}%`)
    lines.push(`Total Outstanding Receivables (INR),${totalPendingReceivables}`)
    lines.push('')
    lines.push('--- PARTY-WISE LEDGER STANDING ---')
    lines.push('Party Name,Phone,Val Dispatched (kg),Billed Amount (INR),Received (INR),Net Balance (INR),Status')
    for (const r of allPartyRows) {
      const statusStr = r.balance > 0
        ? 'Overdue'
        : r.balance < 0
        ? 'Advance Credit'
        : r.totalDispatchValue > 0
        ? 'Cleared'
        : (r.totalReceivedWeight || 0) > 0
        ? 'In Process'
        : 'No Activity'
      lines.push(
        `"${r.party.name}","${r.party.phone || ''}",${(r.totalDispatchWeight || 0).toFixed(3)},${
          r.totalDispatchValue || 0
        },${r.received || 0},${r.balance || 0},"${statusStr}"`
      )
    }

    const csvContent = lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `valmanager_financial_report_${formattedMonth.replace(/\s+/g, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Executive business performance, operating margins, and party standings"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportFinancialReport}
              className="px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Export Financial Report (PDF / Excel)</span>
            </button>
          </div>
        }
      />

      {/* ── Monthly Quick Metric Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kasab Received */}
        <div className="col-span-2 sm:col-span-1 rounded-xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Kasab Received
              </span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <Receipt size={15} />
              </span>
            </div>
            <div className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
              {(Number(monthReceived) || 0).toFixed(3)}{' '}
              <span className="text-[13px] text-slate-500 font-semibold tracking-normal">kg</span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-2">
            {formattedMonth} inward intake
          </div>
        </div>

        {/* Val Dispatched */}
        <div className="col-span-2 sm:col-span-1 rounded-xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Val Dispatched
              </span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <Truck size={15} />
              </span>
            </div>
            <div className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
              {(Number(monthDispatched) || 0).toFixed(3)}{' '}
              <span className="text-[13px] text-slate-500 font-semibold tracking-normal">kg</span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-2">
            {formattedMonth} outward deliveries
          </div>
        </div>

        {/* Revenue Billed */}
        <div className="rounded-xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Revenue Billed
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp size={15} />
              </span>
            </div>
            <div className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-emerald-700 mb-1.5">
              {fmtMoney(monthRevenue)}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-2">
            {formattedMonth} invoiced billing
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="rounded-xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Expenses
              </span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle size={15} />
              </span>
            </div>
            <div className="text-[26px] font-semibold tabular-nums leading-none tracking-tight text-rose-600 mb-1.5">
              {fmtMoney(monthExpenses)}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-2">
            {formattedMonth} operational burn
          </div>
        </div>

        {/* ── Modern Deep Slate EST. PROFIT Banner ─────────────── */}
        <div className="col-span-2 lg:col-span-4 rounded-xl p-6 bg-slate-900 text-white shadow-sm border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Estimated Net Profit (EBITDA)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <TrendingUp size={12} />
                  {profitMargin}% Margin
                </span>
              </div>
              <div
                className={`text-[34px] sm:text-[38px] font-black tabular-nums leading-none tracking-tight ${
                  monthProfit >= 0 ? 'text-white' : 'text-rose-400'
                }`}
              >
                {fmtMoney(monthProfit)}
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
              <div className="text-xs text-slate-400 mb-1">
                Billed Revenue ({fmtMoney(monthRevenue)}) – Expenses ({fmtMoney(monthExpenses)})
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {formattedMonth} Operating Accounting
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Pending Receivables Widget ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Top Receivables / Overdue
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {duesSorted.length} Action{duesSorted.length > 1 && 's'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unsettled party balances requiring collection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
              {fmtMoney(totalPendingReceivables)} Pending
            </span>
          </div>
        </div>

        {duesSorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
            No pending dues — all accounts are cleared.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {duesSorted.slice(0, 5).map((r) => (
              <div
                key={r.party.id}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {getInitials(r.party.name)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px] text-slate-900 tracking-tight">
                      {r.party.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pending collection • {r.party.phone ? `+91 ${r.party.phone}` : 'No phone listed'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[17px] font-black tabular-nums text-rose-600 tracking-tight">
                      {fmtMoney(r.balance)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Balance Due
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(r.party.name, r.party.phone, r.balance)}
                      title="Send WhatsApp Reminder"
                      aria-label="Send Reminder"
                      className="text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle size={13.5} className="text-emerald-600 shrink-0" />
                      <span>Send Reminder</span>
                    </button>
                    <a
                      href="/payments"
                      title="View Ledger in Payments"
                      aria-label="View Ledger"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Party-Wise Performance: Professional Ledger Table ─────── */}
      <div className="space-y-4 pb-12">
        <div className="flex items-center justify-between pl-1">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Party-Wise Performance ({allPartyRows.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive client volume, invoiced revenue, collections & standing
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl p-10 text-center text-sm border border-slate-200 bg-white shadow-xs text-slate-400">
            Loading performance data…
          </div>
        ) : allPartyRows.length === 0 ? (
          <EmptyState text="No party performance records available." />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Party Name</th>
                    <th className="py-3 px-4 text-right">Val Dispatched</th>
                    <th className="py-3 px-4 text-right">Billed Amount</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Net Outstanding</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPartyRows.map((r) => {
                    const hasOrders = (Number(r.totalDispatchWeight) || 0) > 0 || (Number(r.totalDispatchValue) || 0) > 0
                    const isOverdue = r.balance > 0
                    const isAdvance = r.balance < 0
                    const isCleared = hasOrders && r.balance === 0
                    const isInactive = !isOverdue && !isAdvance && !isCleared

                    return (
                      <tr
                        key={r.party.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          isInactive ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Party Name + Initials */}
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl font-extrabold text-[11px] flex items-center justify-center shrink-0 border ${
                                isOverdue
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                  : isAdvance
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {getInitials(r.party.name)}
                            </div>
                            <div>
                              <div className="font-bold text-[13px] text-slate-900 tracking-tight">
                                {r.party.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {r.party.phone ? `+91 ${r.party.phone}` : 'Party Account'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Val Dispatched */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-bold tabular-nums text-slate-900 text-[13px]">
                            {(Number(r.totalDispatchWeight) || 0).toFixed(3)}{' '}
                            <span className="text-[11px] font-semibold text-slate-400">kg</span>
                          </span>
                        </td>

                        {/* Billed Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-bold tabular-nums text-slate-900 text-[13px]">
                            {fmtMoney(r.totalDispatchValue)}
                          </span>
                        </td>

                        {/* Received */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-black tabular-nums text-emerald-600 text-[13px]">
                            {fmtMoney(r.received)}
                          </span>
                        </td>

                        {/* Net Outstanding */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isOverdue ? (
                            <span className="font-black tabular-nums text-rose-600 text-[13px]">
                              {fmtMoney(r.balance)}
                            </span>
                          ) : isAdvance ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              • {fmtMoney(Math.abs(r.balance))} (Adv)
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-slate-400 text-[13px]">
                              ₹0
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isOverdue ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          ) : isAdvance ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Advance
                            </span>
                          ) : isCleared ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                              No Activity
                            </span>
                          )}
                        </td>

                        {/* Report Download */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadPartyStatement(r)}
                            title={`Download statement for ${r.party.name}`}
                            aria-label="Download Statement"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition inline-flex items-center justify-center cursor-pointer"
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
              <span>
                Total Accounts: <strong className="text-slate-700">{allPartyRows.length}</strong> • Active Parties:{' '}
                <strong className="text-slate-700">{activePartiesCount}</strong>
              </span>
              <span>
                Net Ledger Outstanding:{' '}
                <strong className="text-rose-600 font-bold tabular-nums">
                  {fmtMoney(totalPendingReceivables)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
