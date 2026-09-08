import { useState, useEffect } from 'react'
import {
  fetchParties,
  fetchReceipts,
  fetchDispatches,
  fetchExpenses,
  fetchPayments,
  fetchRolaReturns,
  computePartyStats,
} from '../lib/queries'
import type {
  Party,
  ReceiptWithParty,
  DispatchWithParty,
  Expense,
  PartyStats,
} from '../types'
import { fmtKg, fmtMoney, isThisMonth } from '../types'
import { SectionHeader, KpiCard, Table } from '../components/ui/UIComponents'

export default function Reports() {
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

        const computed = computePartyStats(
          partiesData,
          receiptsData,
          rolaData,
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

  const monthReceived = receipts
    .filter((r) => isThisMonth(r.date))
    .reduce((s, r) => s + (Number(r.net_weight) || 0), 0)

  const monthDispatched = dispatches
    .filter((d) => isThisMonth(d.date))
    .reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0)

  const monthExpenses = expenses
    .filter((x) => isThisMonth(x.date))
    .reduce((s, x) => s + (Number(x.amount) || 0), 0)

  const monthRevenue = dispatches
    .filter((d) => isThisMonth(d.date))
    .reduce((s, d) => s + (Number(d.amount) || 0), 0)

  const monthProfit = monthRevenue - monthExpenses

  const partyRows = parties
    .map((p) => ({ party: p, ...(stats[p.id] || { totalDispatchWeight: 0, totalDispatchValue: 0, received: 0, balance: 0 }) }))
    .filter((r) => (r.totalDispatchValue || 0) > 0 || (r.received || 0) > 0)
    .sort((a, b) => (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0))

  const duesSorted = parties
    .map((p) => ({ party: p, ...(stats[p.id] || { balance: 0 }) }))
    .filter((r) => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)

  return (
    <div>
      <SectionHeader
        title="Reports"
        subtitle="This month at a glance, and party-wise standing"
      />

      {/* ── Monthly KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard
          label="Kasab received"
          value={fmtKg(monthReceived)}
          sub="this month"
          loading={loading}
        />
        <KpiCard
          label="Val dispatched"
          value={fmtKg(monthDispatched)}
          sub="this month"
          loading={loading}
        />
        <KpiCard
          label="Revenue billed"
          value={fmtMoney(monthRevenue)}
          sub="this month"
          loading={loading}
        />
        <KpiCard
          label="Expenses"
          value={fmtMoney(monthExpenses)}
          sub="this month"
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
