import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Truck,
  ChevronRight,
  Wallet,
  TrendingUp,
  Users,
} from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchExpenses } from '../lib/api/expenses'
import { fetchPayments } from '../lib/api/payments'
import { fetchRolaReturns } from '../lib/api/rola'
import { computePartyStats } from '../lib/api/stats'


import { useMonth } from '../context/MonthContext'
import type { Party, PartyStats } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import type { Expense } from '../features/expenses/types'
import { fmtDate } from '../utils/date'
import { fmtKg, fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'

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
  const { filterByMonth } = useMonth()
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
          rolaData,
        ] = await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchExpenses(),
          fetchPayments(),
          fetchRolaReturns(),
        ])

        setParties(partiesData)
        setReceipts(receiptsData)
        setDispatches(dispatchesData)
        setExpenses(expensesData)

        const computedStats = computePartyStats(
          partiesData,
          receiptsData,
          rolaData,
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
  const monthDispatchNet = monthDispatches.reduce((sum, d) => {
    const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
    return sum + (isRola ? Number(d.bore_gross_weight) || 0 : Number(d.net_val_weight) || 0)
  }, 0)

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
    <div className="space-y-5 pb-8 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      {/* Title — hidden on mobile, visible on desktop */}
      <div className="hidden sm:block">
        <PageHeader
          title="Dashboard"
          description="Jari Kasab Val — overview & real-time metrics"
        />
      </div>



      {/* Hero Numbers (Primary KPIs) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-[24px] p-5 sm:p-6 bg-white shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-amber-600" />
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
              Baaki<br/>Milna Hai
            </div>
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

        <div className="rounded-[24px] p-5 sm:p-6 bg-white shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
              Is Mahine<br/>Kamaai
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-28 rounded-lg bg-gray-100 animate-pulse mt-1" />
            ) : (
              <div className="text-[28px] sm:text-[34px] font-black text-gray-900 leading-none tabular-nums tracking-tighter">
                {fmtMoney(monthRevenue)}
              </div>
            )}
            <div className="text-[11px] font-semibold text-gray-400 mt-1.5 tracking-wide">Current month's earnings</div>
          </div>
        </div>
      </div>

      {/* 4 Secondary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Val Bheja', value: fmtKg(monthDispatchNet), sub: null, color: 'text-gray-900' },
          { label: 'Kasab Aaya', value: fmtKg(monthReceivedNet), sub: null, color: 'text-[var(--color-brass)]' },
          { label: 'Rola Pending', value: `${rolaPending} pcs`, sub: 'parties ke paas', color: rolaPending > 0 ? 'text-[var(--color-brass)]' : 'text-gray-400' },
          { label: 'Kharcha', value: fmtMoney(monthExpenses), sub: null, color: monthExpenses > 0 ? 'text-[var(--color-due)]' : 'text-gray-400' },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="rounded-[16px] px-4 py-3 sm:py-3.5 bg-white shadow-sm border border-gray-100 transition-shadow hover:shadow-md"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
              {label}
            </div>
            {loading ? (
              <div className="h-6 w-16 rounded bg-gray-100 animate-pulse mb-1" />
            ) : (
              <div className={`text-[19px] sm:text-[22px] font-black tabular-nums leading-none tracking-tighter ${color} ${sub ? 'mb-1' : ''}`}>
                {value}
              </div>
            )}
            {sub && (
              <div className="text-[11px] font-medium text-gray-400 truncate">
                {sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2-Column Side-by-Side: Recent Received (Left) & Recent Dispatch (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start pt-2">
        {/* Left Column: Recent Received */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-[17px] tracking-tight text-gray-900">
              Recent Received
            </h3>
            <Link
              to="/receiving"
              className="text-sm font-bold flex items-center gap-0.5 text-[var(--color-brass)] hover:text-[var(--color-brass-dark)] transition-colors"
            >
              View all <ChevronRight size={16} strokeWidth={2.5} />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[76px] p-4 flex items-center gap-4">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto"></div>
                </div>
              ))}
            </div>
          ) : recentReceiptGroups.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-gray-200 py-10 flex flex-col items-center justify-center text-center">
              <PackagePlus size={32} className="text-gray-300 mb-3" />
              <div className="text-[13px] font-bold text-gray-500">No receiving entries this month</div>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-100/80">
              {recentReceiptGroups.map((group) => {
                const uniqueColors = Array.from(new Set(group.entries.map(e => e.color).filter(Boolean)))
                return (
                  <div
                    key={group.key}
                    onClick={() => navigate('/receiving')}
                    className="px-5 py-4 cursor-pointer hover:bg-amber-50/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap mb-3">
                      {group.challanNo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-amber-50 text-amber-800 border border-amber-200/50">
                          Ch. #{group.challanNo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-gray-50 text-gray-500 border border-gray-200/50">
                          No Ch.
                        </span>
                      )}
                      <span className="font-bold text-[15px] text-gray-900 truncate group-hover:text-[#a57b3f] transition-colors">
                        {group.partyName}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium ml-auto">
                        {fmtDate(group.date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                            Net Kasab
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-[#a57b3f]">
                            {fmtKg(group.totalNet)}
                          </span>
                        </div>

                        {group.totalRolaCount > 0 && (
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                              Rola
                            </span>
                            <span className="text-[15px] font-black tabular-nums tracking-tight text-gray-700">
                              {group.totalRolaCount} <span className="text-[11px] font-bold text-gray-400">pcs</span>
                            </span>
                          </div>
                        )}
                        
                        {uniqueColors.length > 0 && (
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                              Item
                            </span>
                            <span className="text-[13px] font-bold tracking-tight text-gray-500 truncate">
                              {uniqueColors.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                            Bags
                         </span>
                         <span className="text-[15px] font-black text-gray-600">
                           {group.entries.length}
                         </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Dispatch */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-extrabold text-[17px] tracking-tight text-gray-900">
              Recent Dispatch
            </h3>
            <Link
              to="/dispatch"
              className="text-sm font-bold flex items-center gap-0.5 text-[var(--color-brass)] hover:text-[var(--color-brass-dark)] transition-colors"
            >
              View all <ChevronRight size={16} strokeWidth={2.5} />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[96px] p-4 flex items-center gap-4">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto"></div>
                </div>
              ))}
            </div>
          ) : recentChallanGroups.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-gray-200 py-10 flex flex-col items-center justify-center text-center">
              <Truck size={32} className="text-gray-300 mb-3" />
              <div className="text-[13px] font-bold text-gray-500">No dispatch entries this month</div>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-100/80">
              {recentChallanGroups.map((group) => (
                <div
                  key={group.key}
                  onClick={() => navigate('/dispatch')}
                  className="px-5 py-4 cursor-pointer hover:bg-amber-50/30 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap mb-3">
                    {group.challanNo ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-amber-50 text-amber-800 border border-amber-200/50">
                        Ch. #{group.challanNo}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-gray-50 text-gray-500 border border-gray-200/50">
                        No Ch.
                      </span>
                    )}
                    <span className="font-bold text-[15px] text-gray-900 truncate group-hover:text-[#a57b3f] transition-colors">
                      {group.partyName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium ml-auto">
                      {fmtDate(group.date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                      {group.totalValNet > 0 && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                            Net Val
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-[#a57b3f]">
                            {fmtKg(group.totalValNet)}
                          </span>
                        </div>
                      )}

                      {group.hasRola && group.totalRolaGross > 0 && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                            Rola Wt
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-gray-700">
                            {fmtKg(group.totalRolaGross)}
                          </span>
                        </div>
                      )}

                      {group.hasRola && group.totalRolaCount > 0 && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                            Return
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-gray-700">
                            {group.totalRolaCount} <span className="text-[11px] font-bold text-gray-400">pcs</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {group.totalAmount > 0 && (
                      <div className="flex flex-col text-right shrink-0 bg-green-50/50 px-2.5 py-1 rounded-lg border border-green-100/50">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600/70 mb-0.5">
                          Paisa
                        </span>
                        <span className="text-[15px] font-black tabular-nums tracking-tight text-emerald-600">
                          {fmtMoney(group.totalAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 sm:p-5 rounded-[24px] border border-gray-100 bg-white shadow-sm hover:shadow-md active:scale-[0.99] transition-all group cursor-pointer"
          onClick={() => navigate('/parties')}
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-[16px] bg-[#a57b3f]/10 flex items-center justify-center shrink-0 group-hover:bg-[#a57b3f] transition-colors">
               <Users size={24} className="text-[#a57b3f] group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="font-bold text-[17px] text-gray-900 tracking-tight">
                Party Directory
              </div>
              <div className="text-[13px] font-medium text-gray-400 mt-0.5">
                {loading ? 'Loading...' : `${parties.length} registered parties`}
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#a57b3f]/10 transition-colors">
            <ChevronRight size={20} className="text-gray-400 group-hover:text-[#a57b3f] transition-colors" />
          </div>
        </button>
      </div>
    </div>
  )
}
