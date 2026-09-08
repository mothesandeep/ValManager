import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchParties,
  fetchReceipts,
  fetchDispatches,
  fetchExpenses,
  fetchPayments,
  fetchProductionOrders,
  fetchRolaReturns,
  computePartyStats,
} from '../lib/queries'
import type {
  Party,
  ReceiptWithParty,
  DispatchWithParty,
  Expense,
  ProductionWithReceipt,
  PartyStats,
} from '../types'
import { fmtDate, fmtKg, fmtMoney, isThisMonth } from '../types'
import { SectionHeader, KpiCard, Table } from '../components/ui/UIComponents'

export default function Dashboard() {
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [production, setProduction] = useState<ProductionWithReceipt[]>([])
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
          prodData,
          rolaData,
        ] = await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchExpenses(),
          fetchPayments(),
          fetchProductionOrders(),
          fetchRolaReturns(),
        ])

        setParties(partiesData)
        setReceipts(receiptsData)
        setDispatches(dispatchesData)
        setExpenses(expensesData)
        setProduction(prodData)

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
  const monthExpenses = expenses
    .filter((x) => isThisMonth(x.date))
    .reduce((sum, x) => sum + (Number(x.amount) || 0), 0)
  const inProgressCount = production.filter((p) => p.status !== 'Done').length

  const recentReceipts = [...receipts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  const recentDispatches = [...dispatches]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  return (
    <div>
      <SectionHeader
        title="Dashboard"
        subtitle="Jari Kasab Val — job-work overview"
      />

      {/* ── KPI Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard
          label="Parties"
          value={parties.length}
          loading={loading}
        />
        <KpiCard
          label="Production active"
          value={inProgressCount}
          sub="pending / in progress"
          loading={loading}
        />
        <KpiCard
          label="Rola pending"
          value={rolaPending}
          sub="to be returned"
          loading={loading}
        />
        <KpiCard
          label="Balance due"
          value={fmtMoney(totalDue)}
          tone="due"
          loading={loading}
        />
        <KpiCard
          label="Expenses"
          value={fmtMoney(monthExpenses)}
          sub="this month"
          tone="due"
          loading={loading}
        />
      </div>

      {/* ── 2-Column Tables ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receiving */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3
              className="font-semibold text-sm"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              Recent Receiving
            </h3>
            <Link
              to="/receiving"
              className="text-xs font-medium cursor-pointer"
              style={{ color: 'var(--color-brass)' }}
            >
              View all
            </Link>
          </div>
          <Table
            columns={['Date', 'Party', 'Net Wt']}
            rows={recentReceipts}
            emptyText="No receiving entries yet."
            renderRow={(r) => (
              <tr
                key={r.id}
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-3 py-2 font-medium">{r.party?.name ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {fmtKg(r.net_weight)}
                </td>
              </tr>
            )}
          />
        </div>

        {/* Recent Dispatch */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3
              className="font-semibold text-sm"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              Recent Dispatch
            </h3>
            <Link
              to="/dispatch"
              className="text-xs font-medium cursor-pointer"
              style={{ color: 'var(--color-brass)' }}
            >
              View all
            </Link>
          </div>
          <Table
            columns={['Date', 'Party', 'Net Val', 'Amount']}
            rows={recentDispatches}
            emptyText="No dispatch entries yet."
            renderRow={(d) => (
              <tr
                key={d.id}
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                <td className="px-3 py-2 font-medium">{d.party?.name ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {fmtKg(d.net_val_weight)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {d.amount ? fmtMoney(d.amount) : '—'}
                </td>
              </tr>
            )}
          />
        </div>
      </div>
    </div>
  )
}
