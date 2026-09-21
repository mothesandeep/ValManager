import { useState, useEffect } from 'react'
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
import { fmtKg, fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

export default function Reports() {
  const { filterByMonth, formattedMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<Record<string, PartyStats>>({})
  const [, setLoading] = useState(true)

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

  const monthReceived = filterByMonth(receipts).reduce(
    (s, r) => s + (Number(r.net_weight) || 0),
    0
  )

  const monthDispatched = filterByMonth(dispatches).reduce(
    (s, d) => s + (Number(d.net_val_weight) || 0),
    0
  )

  const monthExpenses = filterByMonth(expenses).reduce(
    (s, x) => s + (Number(x.amount) || 0),
    0
  )

  const monthRevenue = filterByMonth(dispatches).reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0
  )

  const monthProfit = monthRevenue - monthExpenses

  const partyRows = parties
    .map((p) => ({
      party: p,
      ...(stats[p.id] || {
        totalReceivedWeight: 0,
        totalDispatchWeight: 0,
        totalDispatchValue: 0,
        received: 0,
        balance: 0,
      }),
    }))
    .filter((r) => (r.totalDispatchValue || 0) > 0 || (r.received || 0) > 0 || (r.totalReceivedWeight || 0) > 0)
    .sort((a, b) => (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0))

  const duesSorted = parties
    .map((p) => ({ party: p, ...(stats[p.id] || { balance: 0 }) }))
    .filter((r) => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Business performance at a glance and party-wise standing"
      />

      {/* ── Monthly KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 lg:col-span-1 rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Kasab Received</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-ink)] mb-1.5">
            {fmtKg(monthReceived)} <span className="text-[14px] text-[var(--color-ink-soft)] font-bold tracking-normal">kg</span>
          </div>
          <div className="text-[10px] font-medium text-[var(--color-ink-soft)]">{formattedMonth}</div>
        </div>
        <div className="col-span-2 lg:col-span-1 rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Val Dispatched</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-ink)] mb-1.5">
            {fmtKg(monthDispatched)} <span className="text-[14px] text-[var(--color-ink-soft)] font-bold tracking-normal">kg</span>
          </div>
          <div className="text-[10px] font-medium text-[var(--color-ink-soft)]">{formattedMonth}</div>
        </div>
        <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-positive-bg)] shadow-[var(--shadow-sm)] border border-[var(--color-positive-border)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-positive)] mb-2">Revenue Billed</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-positive)] mb-1.5">
            {fmtMoney(monthRevenue)}
          </div>
          <div className="text-[10px] font-bold text-[var(--color-positive)]">{formattedMonth}</div>
        </div>
        <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-negative-bg)] shadow-[var(--shadow-sm)] border border-red-100/50 transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-negative)] mb-2">Expenses</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-negative)] mb-1.5">
            {fmtMoney(monthExpenses)}
          </div>
          <div className="text-[10px] font-bold text-[var(--color-negative)]">{formattedMonth}</div>
        </div>
        <div className="col-span-2 lg:col-span-4 rounded-[var(--radius-xl)] p-6 bg-gradient-to-br from-[var(--color-ink)] to-gray-800 shadow-[var(--shadow-md)] transition-all flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Est. Profit</div>
            <div className={`text-[32px] font-black tabular-nums leading-none tracking-tight ${monthProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {fmtMoney(monthProfit)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium text-gray-400 mb-0.5">Revenue - Expenses</div>
            <div className="text-[11px] font-bold text-gray-500">{formattedMonth}</div>
          </div>
        </div>
      </div>

      {/* ── Highest Pending Payments ────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1 flex items-center justify-between">
          <span>Highest Pending Payments</span>
          {duesSorted.length > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px]">{duesSorted.length} Action{duesSorted.length > 1 && 's'}</span>}
        </h2>
        {duesSorted.length === 0 ? (
          <EmptyState text="No pending dues — all clear." />
        ) : (
          <div className="space-y-3">
            {duesSorted.slice(0, 5).map((r) => (
              <div
                key={r.party.id}
                className="rounded-[var(--radius-xl)] p-4 bg-[var(--color-card)] border border-red-100 shadow-[var(--shadow-sm)] flex items-center justify-between hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="font-bold text-[15px] text-gray-900 tracking-tight">{r.party.name}</div>
                <div className="text-[17px] font-black tabular-nums text-red-600 tracking-tight">
                  {fmtMoney(r.balance)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Party-wise Profitability ────────────────────────── */}
      <div className="pb-10">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Party-wise Performance</h2>
        {partyRows.length === 0 ? (
          <EmptyState text="No dispatch value recorded yet." />
        ) : (
          <div className="space-y-3">
            {partyRows.map((r) => (
              <div
                key={r.party.id}
                className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-extrabold text-[16px] text-gray-900 tracking-tight">{r.party.name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Total Dispatched</div>
                    <div className="font-bold tabular-nums text-gray-900 text-[14px]">{fmtKg(r.totalDispatchWeight)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Total Value</div>
                    <div className="font-black tabular-nums text-gray-900 text-[14px]">{fmtMoney(r.totalDispatchValue)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Received</div>
                    <div className="font-black tabular-nums text-emerald-600 text-[14px]">{fmtMoney(r.received)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Balance Due</div>
                    <div className={`font-black tabular-nums text-[14px] ${r.balance > 0 ? 'text-red-600' : r.balance < 0 ? 'text-emerald-500' : 'text-gray-900'}`}>
                      {fmtMoney(r.balance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
