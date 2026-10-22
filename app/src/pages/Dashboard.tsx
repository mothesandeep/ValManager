import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Truck,
  ChevronRight,
  Wallet,
  TrendingUp,
  Users,
  Plus,
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
import { fmtDate } from '../utils/date'
import { fmtKg, fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'

const fmtShortDate = (d?: string | null) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const isRolaEntry = (d: DispatchWithParty) => d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'


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
  const { filterByMonth, isAllTime, formattedMonth, setAllTime } = useMonth()
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

        const computedStats = computePartyStats(
          partiesData,
          receiptsData,
          dispatchesData,
          paymentsData
        )
        setStats(computedStats)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const totalDue = Object.values(stats).reduce(
    (sum, x) => sum + (x.balance > 0 ? x.balance : 0),
    0
  )
  const rolaPending = Object.values(stats).reduce(
    (sum, x) => sum + (x.rolaPending > 0 ? x.rolaPending : 0),
    0
  )

  const monthExpenses = filterByMonth(expenses).reduce(
    (sum, x) => sum + (Number(x.amount) || 0),
    0
  )

  const monthDispatches = filterByMonth(dispatches)
  const monthDispatchNet = monthDispatches.reduce(
    (sum, d) => sum + (Number(d.net_val_weight) || 0),
    0
  )

  const monthReceipts = filterByMonth(receipts)
  const monthReceivedNet = monthReceipts.reduce((sum, r) => sum + (Number(r.net_weight) || 0), 0)

  const monthRevenue = monthDispatches.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  const recentChallanGroups = useMemo((): ChallanGroup[] => {
    const grouped: Map<string, DispatchWithParty[]> = new Map()
    for (const d of monthDispatches) {
      // Group key: challan_no + party_id only (date excluded — same challan must always merge)
      const key = d.challan_no
        ? `ch:${d.challan_no}:${d.party_id}`
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
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  }, [monthDispatches])

  const recentReceiptGroups = useMemo((): ReceiptGroup[] => {
    const grouped: Map<string, ReceiptWithParty[]> = new Map()
    for (const r of monthReceipts) {
      const key = r.challan_no
        ? `ch:${r.challan_no}:${r.party_id}`
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
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  }, [monthReceipts])

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-500 w-full">
      {/* Title — hidden on mobile, visible on desktop */}
      <div className="hidden sm:block">
        <PageHeader
          title="Dashboard"
          description="Jari Kasab Val — overview & real-time metrics"
        />
      </div>



      {/* Hero Numbers (Primary KPIs) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl p-5 sm:p-6 bg-white shadow-sm border border-slate-200/60 flex flex-col group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-amber-600" />
            </div>
            <h2 className="text-[12px] font-black text-gray-500 uppercase tracking-widest leading-[1.15] opacity-80">
              Balance<br/>Due
            </h2>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-28 rounded-lg bg-gray-100 animate-pulse mt-1" />
            ) : (
              <div className="text-[28px] sm:text-[34px] font-black text-gray-900 leading-none tabular-nums tracking-tighter">
                {fmtMoney(totalDue)}
              </div>
            )}
            <div className="text-[11px] font-semibold text-gray-400 mt-1.5 tracking-wide">Pending from parties</div>
          </div>
        </div>

        <div className="rounded-xl p-5 sm:p-6 bg-white shadow-sm border border-slate-200/60 flex flex-col group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-[12px] font-black text-[#58a176] uppercase tracking-widest leading-[1.15] opacity-80">
              {isAllTime ? 'Total' : 'Monthly'}<br/>Earnings
            </h2>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-28 rounded-lg bg-gray-100 animate-pulse mt-1" />
            ) : (
              <div className="text-[28px] sm:text-[34px] font-black text-gray-900 leading-none tabular-nums tracking-tighter">
                {fmtMoney(monthRevenue)}
              </div>
            )}
            <div className="text-[11px] font-semibold text-gray-400 mt-1.5 tracking-wide">
              {isAllTime ? 'All-time earnings' : `${formattedMonth}'s earnings`}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Secondary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: isAllTime ? 'Val Dispatched' : `Val (${formattedMonth})`, value: fmtKg(monthDispatchNet), sub: isAllTime ? 'All time' : null, color: 'text-slate-900' },
          { label: isAllTime ? 'Kasab Received' : `Kasab (${formattedMonth})`, value: fmtKg(monthReceivedNet), sub: isAllTime ? 'All time' : null, color: 'text-slate-900' },
          { label: 'Rola Pending', value: `${rolaPending} pcs`, sub: 'with parties', color: rolaPending > 0 ? 'text-slate-900' : 'text-slate-400' },
          { label: isAllTime ? 'Total Expenses' : `Expenses (${formattedMonth})`, value: fmtMoney(monthExpenses), sub: isAllTime ? 'All time' : null, color: monthExpenses > 0 ? 'text-rose-600' : 'text-slate-400' },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3 sm:py-3.5 bg-white shadow-xs border border-slate-200/80 transition-shadow hover:shadow-sm"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
              {label}
            </div>
            {loading ? (
              <div className="h-6 w-16 rounded bg-slate-100 animate-pulse mb-1" />
            ) : (
              <div className={`text-[19px] sm:text-[22px] font-semibold tabular-nums leading-none tracking-tight ${color} ${sub ? 'mb-1' : ''}`}>
                {value}
              </div>
            )}
            {sub && (
              <div className="text-[11px] font-medium text-slate-400 truncate">
                {sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2-Column Side-by-Side: Recent Received (Left) & Recent Dispatch (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch pt-2">
        {/* Left Column: Recent Inward Receipts */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-[17px] tracking-tight text-slate-900">
              Recent Inward Receipts
            </h3>
            <Link
              to="/receiving"
              className="text-sm font-semibold flex items-center gap-0.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              View all <ChevronRight size={16} strokeWidth={2.2} />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden divide-y divide-gray-100 flex-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[68px] p-4 flex items-center gap-4">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto"></div>
                </div>
              ))}
            </div>
          ) : recentReceiptGroups.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 px-4 flex flex-col items-center justify-center text-center flex-1 bg-white">
              <PackagePlus size={32} className="text-gray-300 mb-3" />
              <div className="text-[13px] font-bold text-gray-500">
                {isAllTime ? 'No receiving entries recorded' : `No receiving entries in ${formattedMonth}`}
              </div>
              {!isAllTime && receipts.length > 0 && (
                <button
                  type="button"
                  onClick={setAllTime}
                  className="mt-2.5 text-xs font-bold text-[var(--color-brass)] hover:underline cursor-pointer"
                >
                  View all {receipts.length} entries in All Time
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-x-auto flex-1 flex flex-col justify-between">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75">
                    <th className="pl-4 pr-1.5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date / Ch.</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Party</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Net Wt</th>
                    <th className="pl-2 pr-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Bags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReceiptGroups.map((group) => {
                    const uniqueColors = Array.from(new Set(group.entries.map(e => e.color).filter(Boolean)))
                    const primaryColor = uniqueColors[0] || '—'
                    const extraColorsCount = uniqueColors.length - 1
                    return (
                      <tr
                        key={group.key}
                        onClick={() => navigate('/receiving')}
                        className="cursor-pointer hover:bg-slate-50/75 transition-colors group"
                      >
                        <td className="pl-4 pr-1.5 py-3.5 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-slate-500 font-medium leading-none whitespace-nowrap" title={fmtDate(group.date)}>
                              {fmtShortDate(group.date)}
                            </span>
                            {group.challanNo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 w-fit leading-none">
                                #{group.challanNo}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium tracking-wide bg-slate-100 text-slate-500 border border-slate-200/60 w-fit leading-none">
                                No Ch.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3.5 align-middle">
                          <span className="font-medium text-[13px] text-slate-900 whitespace-nowrap block" title={group.partyName}>
                            {group.partyName}
                          </span>
                        </td>
                        <td className="px-2 py-3.5 align-middle">
                          <div className="flex items-center gap-1">
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/70 text-[10.5px] font-semibold max-w-[85px] truncate"
                              title={primaryColor}
                            >
                              {primaryColor}
                            </span>
                            {extraColorsCount > 0 && (
                              <span
                                title={uniqueColors.slice(1).join(', ')}
                                className="inline-flex items-center px-1 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-[9.5px] font-bold cursor-help shrink-0"
                              >
                                +{extraColorsCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3.5 align-middle text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[13px] font-semibold tabular-nums text-slate-900 leading-none whitespace-nowrap">
                              {fmtKg(group.totalNet)}
                            </span>
                            {group.totalRolaCount > 0 && (
                              <span className="text-[9.5px] font-medium tracking-wide text-slate-500 whitespace-nowrap">
                                Rola: {group.totalRolaCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="pl-2 pr-5 py-3.5 align-middle text-right">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/70">
                            {group.entries.length}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Recent Outward Dispatch */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-[17px] tracking-tight text-slate-900">
              Recent Outward Dispatch
            </h3>
            <Link
              to="/dispatch"
              className="text-sm font-semibold flex items-center gap-0.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              View all <ChevronRight size={16} strokeWidth={2.2} />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden divide-y divide-gray-100 flex-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[68px] p-4 flex items-center gap-4">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto"></div>
                </div>
              ))}
            </div>
          ) : recentChallanGroups.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 px-4 flex flex-col items-center justify-center text-center flex-1 bg-white">
              <Truck size={32} className="text-gray-300 mb-3" />
              <div className="text-[13px] font-bold text-gray-500">
                {isAllTime ? 'No dispatch entries recorded' : `No dispatch entries in ${formattedMonth}`}
              </div>
              {!isAllTime && dispatches.length > 0 && (
                <button
                  type="button"
                  onClick={setAllTime}
                  className="mt-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  View all {dispatches.length} entries in All Time
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-x-auto flex-1 flex flex-col justify-between">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75">
                    <th className="pl-4 pr-1.5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date / Ch.</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Party</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Net Wt</th>
                    <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Rola</th>
                    <th className="pl-2 pr-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentChallanGroups.map((group) => (
                    <tr
                      key={group.key}
                      onClick={() => navigate('/dispatch')}
                      className="cursor-pointer hover:bg-slate-50/75 transition-colors group"
                    >
                      <td className="pl-4 pr-1.5 py-3.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-slate-500 font-medium leading-none whitespace-nowrap" title={fmtDate(group.date)}>
                            {fmtShortDate(group.date)}
                          </span>
                          {group.challanNo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 w-fit leading-none">
                              #{group.challanNo}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium tracking-wide bg-slate-100 text-slate-500 border border-slate-200/60 w-fit leading-none">
                              No Ch.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3.5 align-middle">
                        <span className="font-medium text-[13px] text-slate-900 whitespace-nowrap block" title={group.partyName}>
                          {group.partyName}
                        </span>
                      </td>
                      <td className="px-2 py-3.5 align-middle text-right">
                        {group.totalValNet > 0 ? (
                          <span className="text-[13px] font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                            {fmtKg(group.totalValNet)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3.5 align-middle text-right">
                        {group.hasRola && (group.totalRolaGross > 0 || group.totalRolaCount > 0) ? (
                          <div className="flex flex-col items-end gap-0.5">
                            {group.totalRolaGross > 0 && (
                              <span className="text-[12px] font-medium tabular-nums text-slate-700 leading-none whitespace-nowrap">
                                {fmtKg(group.totalRolaGross)}
                              </span>
                            )}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
                              {group.totalRolaCount} pcs
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60">
                            0 pcs
                          </span>
                        )}
                      </td>
                      <td className="pl-2 pr-5 py-3.5 align-middle text-right">
                        {group.totalAmount > 0 ? (
                          <span className="inline-flex items-center text-[12.5px] font-semibold tabular-nums text-emerald-700 whitespace-nowrap">
                            {fmtMoney(group.totalAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Quick Operations & Party Directory Widget */}
      <div className="pt-2">
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Party Directory info link */}
          <Link
            to="/parties"
            className="flex items-center gap-3.5 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
              <Users size={22} className="text-slate-700 group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[16px] text-slate-900 tracking-tight group-hover:text-slate-900 group-hover:underline transition-colors">
                <span>Party Directory</span>
                <span className="text-xs font-semibold text-slate-400">
                  ({loading ? '...' : parties.length} registered accounts)
                </span>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-[12px] font-medium text-slate-500 mt-0.5">
                View party ledgers, outstanding balances & contact masters
              </div>
            </div>
          </Link>

          {/* Right: Quick Action shortcut buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/receiving')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} className="text-white" />
              <span>New Inward</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dispatch')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} className="text-white" />
              <span>New Dispatch</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} className="text-white" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
