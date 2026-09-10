import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
import { fmtDate, fmtKg, fmtMoney } from '../types'
import { SectionHeader, KpiCard, Table } from '../components/ui/UIComponents'

export default function Dashboard() {
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

        const computedStats = computePartyStats(
          partiesData,
          receiptsData,
          rolaData,
          dispatchesData,
          paymentsData,
          gapchaData,
          reconsData
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

  const overallGapcha = computeOverallGapchaStats(
    receipts,
    dispatches,
    gapchaSales,
    reconciliations,
    selectedMonth
  )

  const recentReceipts = [...monthReceipts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  const recentDispatches = [...monthDispatches]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Dashboard"
        subtitle="Jari Kasab Val — job-work overview & real-time metrics"
      />

      {/* ── KPI Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Active Parties"
          value={parties.length}
          sub="customer directory"
          loading={loading}
        />
        <KpiCard
          label="Kasab Received"
          value={fmtKg(monthReceivedNet)}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="Val Dispatched"
          value={fmtKg(monthDispatchNet)}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="In Workshop (Raw)"
          value={fmtKg(overallGapcha.unprocessedKasabWeight)}
          sub="processing stock"
          tone={overallGapcha.unprocessedKasabWeight > 0 ? 'due' : undefined}
          loading={loading}
        />
        <KpiCard
          label="Gapcha Available"
          value={fmtKg(overallGapcha.remainingGapchaWeight)}
          sub="surplus ready"
          tone={overallGapcha.remainingGapchaWeight > 0 ? 'positive' : undefined}
          loading={loading}
        />
        <KpiCard
          label="Rola Pending"
          value={rolaPending}
          sub="empty spools"
          loading={loading}
        />
        <KpiCard
          label="Total Balance Due"
          value={fmtMoney(totalDue)}
          tone="due"
          loading={loading}
        />
        <KpiCard
          label="Expenses"
          value={fmtMoney(monthExpenses)}
          sub={formattedMonth}
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
