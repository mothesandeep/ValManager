import { useState, useEffect } from 'react'
import {
  fetchParties,
  fetchReceipts,
  fetchDispatches,
  fetchExpenses,
  fetchPayments,
  fetchRolaReturns,
  fetchGapchaSales,
  fetchReconciliations,
  computePartyStats,
} from '../lib/queries'
import { computeOverallGapchaStats } from '../lib/calculations'
import { useMonth } from '../context/MonthContext'
import type {
  Party,
  ReceiptWithParty,
  DispatchWithParty,
  Expense,
  PartyStats,
  GapchaSaleWithParty,
  GapchaReconciliationWithParty,
} from '../types'
import { fmtKg, fmtMoney } from '../types'
import { SectionHeader, KpiCard, Table } from '../components/ui/UIComponents'

export default function Reports() {
  const { selectedMonth, filterByMonth, formattedMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [gapchaSales, setGapchaSales] = useState<GapchaSaleWithParty[]>([])
  const [reconciliations, setReconciliations] = useState<GapchaReconciliationWithParty[]>([])
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
          gapchaData,
          reconsData,
        ] = await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchExpenses(),
          fetchPayments(),
          fetchRolaReturns(),
          fetchGapchaSales(),
          fetchReconciliations(),
        ])

        setParties(partiesData)
        setReceipts(receiptsData)
        setDispatches(dispatchesData)
        setExpenses(expensesData)
        setGapchaSales(gapchaData)
        setReconciliations(reconsData)

        const computed = computePartyStats(
          partiesData,
          receiptsData,
          rolaData,
          dispatchesData,
          paymentsData,
          gapchaData,
          reconsData
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

  const monthDispatched = filterByMonth(dispatches).reduce((s, d) => {
    const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
    return s + (isRola ? Number(d.bore_gross_weight) || 0 : Number(d.net_val_weight) || 0)
  }, 0)

  const monthExpenses = filterByMonth(expenses).reduce(
    (s, x) => s + (Number(x.amount) || 0),
    0
  )

  const monthRevenue = filterByMonth(dispatches).reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0
  )

  const monthProfit = monthRevenue - monthExpenses

  const overallGapcha = computeOverallGapchaStats(
    receipts,
    dispatches,
    gapchaSales,
    reconciliations,
    selectedMonth
  )

  const partyRows = parties
    .map((p) => ({
      party: p,
      ...(stats[p.id] || {
        totalReceivedWeight: 0,
        totalDispatchWeight: 0,
        totalDispatchValue: 0,
        received: 0,
        balance: 0,
        gapchaWeight: 0,
        gapchaSold: 0,
        remainingGapcha: 0,
      }),
    }))
    .filter((r) => (r.totalDispatchValue || 0) > 0 || (r.received || 0) > 0 || (r.totalReceivedWeight || 0) > 0)
    .sort((a, b) => (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0))

  const gapchaPartyRows = parties
    .map((p) => ({
      party: p,
      ...(stats[p.id] || {
        totalReceivedWeight: 0,
        totalDispatchWeight: 0,
        gapchaWeight: 0,
        gapchaSold: 0,
        remainingGapcha: 0,
      }),
    }))
    .filter((r) => (r.totalReceivedWeight || 0) > 0 || (r.totalDispatchWeight || 0) > 0 || (r.gapchaWeight || 0) > 0)
    .sort((a, b) => (b.gapchaWeight || 0) - (a.gapchaWeight || 0))

  const duesSorted = parties
    .map((p) => ({ party: p, ...(stats[p.id] || { balance: 0 }) }))
    .filter((r) => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Reports"
        subtitle="Business performance at a glance, party-wise standing, and Gapcha surplus"
      />

      {/* ── Monthly KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Kasab received"
          value={fmtKg(monthReceived)}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="Val dispatched"
          value={fmtKg(monthDispatched)}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="Revenue billed"
          value={fmtMoney(monthRevenue)}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="Gapcha Avail"
          value={fmtKg(overallGapcha.remainingGapchaWeight)}
          sub="surplus stock"
          tone={overallGapcha.remainingGapchaWeight > 0 ? 'positive' : undefined}
          loading={loading}
        />
        <KpiCard
          label="Expenses"
          value={fmtMoney(monthExpenses)}
          sub={formattedMonth}
          tone="due"
          loading={loading}
        />
        <KpiCard
          label="Est. profit"
          value={fmtMoney(monthProfit)}
          sub="revenue − expenses"
          tone={monthProfit >= 0 ? 'positive' : 'due'}
          loading={loading}
        />
      </div>

      {/* ── Party-wise Profitability Table ────────────────────────── */}
      <div className="mb-6">
        <h3
          className="font-semibold mb-2 text-sm"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          Party-wise Profitability
        </h3>
        <Table
          columns={['Party', 'Total Dispatched', 'Total Value', 'Received', 'Balance Due']}
          rows={partyRows}
          emptyText="No dispatch value recorded yet."
          renderRow={(r) => (
            <tr
              key={r.party.id}
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {r.party.name}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {fmtKg(r.totalDispatchWeight)}
              </td>
              <td className="px-3 py-2 tabular-nums font-semibold">
                {fmtMoney(r.totalDispatchValue)}
              </td>
              <td
                className="px-3 py-2 tabular-nums font-medium"
                style={{ color: 'var(--color-positive)' }}
              >
                {fmtMoney(r.received)}
              </td>
              <td
                className="px-3 py-2 tabular-nums font-semibold"
                style={{
                  color:
                    r.balance > 0
                      ? 'var(--color-due)'
                      : r.balance < 0
                      ? 'var(--color-positive)'
                      : 'var(--color-ink)',
                }}
              >
                {fmtMoney(r.balance)}
              </td>
            </tr>
          )}
        />
      </div>

      {/* ── Party-wise Gapcha Surplus Table ───────────────────────── */}
      <div className="mb-6">
        <h3
          className="font-semibold mb-2 text-sm"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          Party-wise Gapcha / Surplus Weight
        </h3>
        <Table
          columns={['Party', 'Total Received', 'Total Dispatched', 'Gapcha Generated', 'Gapcha Sold', 'Available Stock']}
          rows={gapchaPartyRows}
          emptyText="No material movement recorded yet."
          renderRow={(r) => (
            <tr
              key={r.party.id}
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {r.party.name}
              </td>
              <td className="px-3 py-2 tabular-nums text-xs">
                {fmtKg(r.totalReceivedWeight)}
              </td>
              <td className="px-3 py-2 tabular-nums text-xs">
                {fmtKg(r.totalDispatchWeight)}
              </td>
              <td
                className="px-3 py-2 tabular-nums font-semibold text-xs"
                style={{
                  color: (r.gapchaWeight || 0) > 0 ? 'var(--color-brass)' : 'var(--color-ink)',
                }}
              >
                {fmtKg(r.gapchaWeight)}
              </td>
              <td className="px-3 py-2 tabular-nums text-xs text-[var(--color-ink-soft)]">
                {fmtKg(r.gapchaSold)}
              </td>
              <td
                className="px-3 py-2 tabular-nums font-bold text-xs"
                style={{
                  color: (r.remainingGapcha || 0) > 0 ? 'var(--color-positive)' : 'var(--color-ink-soft)',
                }}
              >
                {fmtKg(r.remainingGapcha)}
              </td>
            </tr>
          )}
        />
      </div>

      {/* ── Highest Pending Payments Table ────────────────────────── */}
      <div>
        <h3
          className="font-semibold mb-2 text-sm"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          Highest Pending Payments
        </h3>
        <Table
          columns={['Party', 'Balance Due']}
          rows={duesSorted}
          emptyText="No pending dues — all clear."
          renderRow={(r) => (
            <tr
              key={r.party.id}
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {r.party.name}
              </td>
              <td
                className="px-3 py-2 tabular-nums font-semibold"
                style={{ color: 'var(--color-due)' }}
              >
                {fmtMoney(r.balance)}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  )
}
