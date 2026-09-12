import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Truck,
  IndianRupee,
  ChevronRight,
} from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchExpenses } from '../lib/api/expenses'
import { fetchPayments } from '../lib/api/payments'
import { fetchRolaReturns } from '../lib/api/rola'
import { computePartyStats } from '../lib/api/stats'


import { useMonth } from '../context/MonthContext'
import type {
  Party,
  ReceiptWithParty,
  DispatchWithParty,
  Expense,
  PartyStats,
} from '../types'
import { fmtDate, fmtKg, fmtMoney } from '../types'
import { SectionHeader } from '../components/ui/SectionHeader'

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
    <div className="space-y-5 pb-8 animate-in fade-in duration-500">
      {/* Title — hidden on mobile, visible on desktop */}
      <div className="hidden sm:block">
        <SectionHeader
          title="Dashboard"
          subtitle="Jari Kasab Val — overview & real-time metrics"
        />
      </div>

      {/* 3 Premium Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate('/receiving?action=new')}
          className="group relative flex flex-col items-center justify-center gap-3 py-6 px-2 rounded-[24px] bg-gradient-to-b from-amber-50/80 to-amber-100/50 hover:from-amber-100 hover:to-amber-200/60 active:scale-[0.97] transition-all cursor-pointer shadow-[0_4px_20px_-4px_rgba(251,191,36,0.15)] hover:shadow-[0_8px_25px_-5px_rgba(251,191,36,0.25)] border border-amber-200/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(217,119,6,0.3)] group-hover:scale-105 transition-transform duration-300 relative z-10 ring-1 ring-amber-300/50">
            <PackagePlus size={26} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 text-center mt-1">
            <div className="text-[13px] font-black text-amber-900 tracking-tight">Kasab Aaya</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dispatch?action=new')}
          className="group relative flex flex-col items-center justify-center gap-3 py-6 px-2 rounded-[24px] bg-gradient-to-b from-blue-50/80 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/60 active:scale-[0.97] transition-all cursor-pointer shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_25px_-5px_rgba(59,130,246,0.2)] border border-blue-200/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform duration-300 relative z-10 ring-1 ring-blue-400/50">
            <Truck size={26} strokeWidth={2.5} />
          </div>
          <div className="relative z-10 text-center mt-1">
            <div className="text-[13px] font-black text-blue-900 tracking-tight">Val Bheja</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/payments?action=new')}
          className="group relative flex flex-col items-center justify-center gap-3 py-6 px-2 rounded-[24px] bg-gradient-to-b from-emerald-50/80 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/60 active:scale-[0.97] transition-all cursor-pointer shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_25px_-5px_rgba(16,185,129,0.2)] border border-emerald-200/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(5,150,105,0.3)] group-hover:scale-105 transition-transform duration-300 relative z-10 ring-1 ring-emerald-300/50">
            <IndianRupee size={26} strokeWidth={3} />
          </div>
          <div className="relative z-10 text-center mt-1">
            <div className="text-[13px] font-black text-emerald-900 tracking-tight">Paisa Aaya</div>
          </div>
        </button>
      </div>

      {/* Hero Numbers (Primary KPIs) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-[24px] p-5 relative overflow-hidden bg-gradient-to-br from-[#9a5311] to-[#703906] shadow-[0_8px_30px_-8px_rgba(154,83,17,0.4)] border border-[#c4772b]/30">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <IndianRupee size={100} strokeWidth={3} className="text-white transform rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              Baaki Milna Hai
            </div>
            {loading ? (
              <div className="h-9 w-28 rounded-lg bg-white/10 animate-pulse mt-1" />
            ) : (
              <div className="text-[28px] sm:text-4xl font-black text-white leading-none tabular-nums tracking-tight drop-shadow-md">
                {fmtMoney(totalDue)}
              </div>
            )}
            <div className="text-[11px] font-medium text-amber-200/80 mt-2 tracking-wide">sabka pending</div>
          </div>
        </div>

        <div className="rounded-[24px] p-5 relative overflow-hidden bg-gradient-to-br from-[#126b3a] to-[#0a4524] shadow-[0_8px_30px_-8px_rgba(18,107,58,0.4)] border border-[#239958]/30">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <IndianRupee size={100} strokeWidth={3} className="text-white transform -rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              Is Mahine Kamaai
            </div>
            {loading ? (
              <div className="h-9 w-28 rounded-lg bg-white/10 animate-pulse mt-1" />
            ) : (
              <div className="text-[28px] sm:text-4xl font-black text-white leading-none tabular-nums tracking-tight drop-shadow-md">
                {fmtMoney(monthRevenue)}
              </div>
            )}
            <div className="text-[11px] font-medium text-emerald-200/80 mt-2 tracking-wide">{formattedMonth}</div>
          </div>
        </div>
      </div>

      {/* 4 Secondary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Val Bheja', value: fmtKg(monthDispatchNet), sub: formattedMonth, color: 'text-blue-600', bg: 'bg-blue-50/50' },
          { label: 'Kasab Aaya', value: fmtKg(monthReceivedNet), sub: formattedMonth, color: 'text-[#a57b3f]', bg: 'bg-[#a57b3f]/5' },
          { label: 'Rola Pending', value: `${rolaPending} pcs`, sub: 'parties ke paas', color: rolaPending > 0 ? 'text-[#a57b3f]' : 'text-gray-400', bg: 'bg-[#a57b3f]/5' },
          { label: 'Kharcha', value: fmtMoney(monthExpenses), sub: formattedMonth, color: monthExpenses > 0 ? 'text-red-600' : 'text-gray-400', bg: 'bg-red-50/50' },
        ].map(({ label, value, sub, color, bg }) => (
          <div
            key={label}
            className={`rounded-[20px] p-4.5 bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100/80 ${bg} transition-all hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]`}
          >
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
              {label}
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded bg-gray-100 animate-pulse mb-1" />
            ) : (
              <div className={`text-[19px] font-black tabular-nums leading-none tracking-tight ${color} mb-1.5`}>
                {value}
              </div>
            )}
            <div className="text-[10px] font-medium text-gray-400">
              {sub}
            </div>
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
              className="text-[13px] font-bold flex items-center gap-0.5 text-[#a57b3f] hover:text-[#8f6932] transition-colors"
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-[#a57b3f] text-white shadow-sm">
                          Ch. #{group.challanNo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-gray-100 text-gray-500">
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
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                            Net Kasab
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-[#a57b3f]">
                            {fmtKg(group.totalNet)}
                          </span>
                        </div>

                        {group.totalRolaCount > 0 && (
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                              Rola
                            </span>
                            <span className="text-[15px] font-black tabular-nums tracking-tight text-gray-700">
                              {group.totalRolaCount} <span className="text-[11px] font-bold text-gray-400">pcs</span>
                            </span>
                          </div>
                        )}
                        
                        {uniqueColors.length > 0 && (
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                              Item
                            </span>
                            <span className="text-[13px] font-bold tracking-tight text-gray-500 truncate max-w-[120px]">
                              {uniqueColors.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                         <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                            Bags
                         </span>
                         <span className="text-[13px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200/50">
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
              className="text-[13px] font-bold flex items-center gap-0.5 text-[#a57b3f] hover:text-[#8f6932] transition-colors"
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-[#a57b3f] text-white shadow-sm">
                        Ch. #{group.challanNo}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-gray-100 text-gray-500">
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
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                            Net Val
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-[#a57b3f]">
                            {fmtKg(group.totalValNet)}
                          </span>
                        </div>
                      )}

                      {group.hasRola && group.totalRolaGross > 0 && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
                            Rola Wt
                          </span>
                          <span className="text-[15px] font-black tabular-nums tracking-tight text-gray-700">
                            {fmtKg(group.totalRolaGross)}
                          </span>
                        </div>
                      )}

                      {group.hasRola && group.totalRolaCount > 0 && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
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

      {/* Parties Row */}
      <div className="pt-2">
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-5 rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:border-gray-200 active:scale-[0.99] transition-all group cursor-pointer"
          onClick={() => navigate('/parties')}
        >
          <div className="text-left">
            <div className="font-extrabold text-[17px] text-gray-900 group-hover:text-[#a57b3f] transition-colors tracking-tight">
              Party Directory
            </div>
            <div className="text-[13px] font-medium text-gray-500 mt-0.5">
              {loading ? 'Loading...' : `${parties.length} parties registered`}
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
