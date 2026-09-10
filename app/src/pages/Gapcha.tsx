import { useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  AlertCircle,
  Scale,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  fetchDispatches,
  fetchGapchaSales,
  fetchReconciliations,
  insertGapchaSale,
  deleteGapchaSale,
  insertGapchaSurplus,
  deleteGapchaSurplus,
  type GapchaSalePayload,
  type GapchaSurplusPayload,
} from '../lib/queries'
import { computeOverallGapchaStats } from '../lib/calculations'
import { useMonth } from '../context/MonthContext'
import type {
  Party,
  ReceiptWithParty,
  DispatchWithParty,
  GapchaSaleWithParty,
  GapchaReconciliationWithParty,
  OverallGapchaStats,
} from '../types'
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  todayStr,
} from '../types'
import {
  SectionHeader,
  KpiCard,
  Button,
  Field,
  TextInput,
  Select,
  ConfirmDelete,
  Table,
} from '../components/ui/UIComponents'

interface SaleFormState {
  partyId: string
  buyerName: string
  date: string
  weightGrams: string
  ratePerKg: string
  note: string
}

const EMPTY_SALE_FORM: SaleFormState = {
  partyId: '',
  buyerName: '',
  date: todayStr(),
  weightGrams: '',
  ratePerKg: '',
  note: '',
}

interface SurplusFormState {
  partyId: string
  date: string
  weightGrams: string
  note: string
}

const EMPTY_SURPLUS_FORM: SurplusFormState = {
  partyId: '',
  date: todayStr(),
  weightGrams: '',
  note: '',
}

export default function Gapcha() {
  const { selectedMonth, filterByMonth, formattedMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [sales, setSales] = useState<GapchaSaleWithParty[]>([])
  const [surplusLogs, setSurplusLogs] = useState<GapchaReconciliationWithParty[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState<'parties' | 'sales' | 'surplus'>('parties')

  // Modals & form state
  const [isSaleOpen, setIsSaleOpen] = useState(false)
  const [saleForm, setSaleForm] = useState<SaleFormState>(EMPTY_SALE_FORM)
  const [isSurplusOpen, setIsSurplusOpen] = useState(false)
  const [surplusForm, setSurplusForm] = useState<SurplusFormState>(EMPTY_SURPLUS_FORM)

  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null)
  const [deletingSurplusId, setDeletingSurplusId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [partiesData, receiptsData, dispatchesData, salesData, surplusData] =
        await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchDispatches(),
          fetchGapchaSales(),
          fetchReconciliations(),
        ])
      setParties(partiesData)
      setReceipts(receiptsData)
      setDispatches(dispatchesData)
      setSales(salesData)
      setSurplusLogs(surplusData)
    } catch (err) {
      console.error('Error loading gapcha data:', err)
      setErrorMsg('Could not load Gapcha data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Overall calculations for the selected month
  const overallStats: OverallGapchaStats = computeOverallGapchaStats(
    receipts,
    dispatches,
    sales,
    surplusLogs,
    selectedMonth
  )

  const filteredReceipts = filterByMonth(receipts)
  const filteredDispatches = filterByMonth(dispatches)
  const filteredSales = filterByMonth(sales)
  const filteredSurplus = filterByMonth(surplusLogs)

  // Party-wise automated month calculation rows
  const partyRows = parties.map((p) => {
    const pReceipts = filteredReceipts.filter((r) => r.party_id === p.id)
    const pDispatches = filteredDispatches.filter((d) => d.party_id === p.id)
    const pSales = filteredSales.filter((s) => s.party_id === p.id)
    const pSurplus = filteredSurplus.filter((rc) => rc.party_id === p.id)

    const receivedNet = Math.round(
      pReceipts.reduce((sum, r) => sum + (Number(r.net_weight) || 0), 0) * 1000
    ) / 1000

    const returnedNet = Math.round(
      pDispatches.reduce((sum, d) => {
        const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
        const wt = isRola
          ? Number(d.bore_gross_weight) || 0
          : Number(d.net_val_weight) || 0
        return sum + wt
      }, 0) * 1000
    ) / 1000

    // Pending raw yarn currently in workshop = Received Net - Returned Net
    const pendingStock = Math.round(Math.max(0, receivedNet - returnedNet) * 1000) / 1000

    // Legitimate Gapcha created
    const gapchaCreated = Math.round(
      pSurplus.reduce((sum, rc) => sum + (Number(rc.gapcha_weight) || 0), 0) * 1000
    ) / 1000

    const gapchaSold = Math.round(
      pSales.reduce((sum, s) => sum + (Number(s.weight_kg) || 0), 0) * 1000
    ) / 1000

    const availableGapcha = Math.round(Math.max(0, gapchaCreated - gapchaSold) * 1000) / 1000

    const hasActivity =
      receivedNet > 0 ||
      returnedNet > 0 ||
      pendingStock > 0 ||
      availableGapcha > 0 ||
      pReceipts.length > 0 ||
      pDispatches.length > 0

    return {
      party: p,
      receivedNet,
      returnedNet,
      pendingStock,
      gapchaCreated,
      gapchaSold,
      availableGapcha,
      receiptCount: pReceipts.length,
      dispatchCount: pDispatches.length,
      hasActivity,
    }
  })

  // Sale form calculation
  const saleWeightKg = (() => {
    if (!saleForm.weightGrams) return 0
    let w = parseFloat(saleForm.weightGrams) || 0
    if (w > 500) w = w / 1000
    return w
  })()

  const saleRate = parseFloat(saleForm.ratePerKg || '0') || 0
  const saleAmount =
    saleWeightKg > 0 && saleRate > 0
      ? Math.round(saleWeightKg * saleRate * 100) / 100
      : null

  const submitSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleForm.buyerName.trim()) {
      setErrorMsg('Please enter buyer name')
      return
    }

    if (saleWeightKg <= 0) {
      setErrorMsg('Weight sold must be greater than 0')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: GapchaSalePayload = {
      party_id: saleForm.partyId || null,
      buyer_name: saleForm.buyerName.trim(),
      date: saleForm.date,
      weight_kg: saleWeightKg,
      rate_per_kg: saleRate > 0 ? saleRate : null,
      amount: saleAmount,
      note: saleForm.note.trim() || null,
    }

    try {
      await insertGapchaSale(payload)
      setIsSaleOpen(false)
      setSaleForm(EMPTY_SALE_FORM)
      await loadData()
    } catch (err: unknown) {
      console.error('Save sale error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not record sale — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteGapchaSale(id)
      setDeletingSaleId(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete sale error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  // Surplus form calculation
  const surplusWeightKg = (() => {
    if (!surplusForm.weightGrams) return 0
    let w = parseFloat(surplusForm.weightGrams) || 0
    if (w > 500) w = w / 1000
    return w
  })()

  const submitSurplus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!surplusForm.partyId) {
      setErrorMsg('Please select a party')
      return
    }

    if (surplusWeightKg <= 0) {
      setErrorMsg('Surplus weight must be greater than 0')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: GapchaSurplusPayload = {
      party_id: surplusForm.partyId,
      date: surplusForm.date,
      gapcha_weight: surplusWeightKg,
      note: surplusForm.note.trim() || null,
    }

    try {
      await insertGapchaSurplus(payload)
      setIsSurplusOpen(false)
      setSurplusForm(EMPTY_SURPLUS_FORM)
      await loadData()
    } catch (err: unknown) {
      console.error('Save surplus error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not log surplus — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSurplus = async (id: string) => {
    try {
      await deleteGapchaSurplus(id)
      setDeletingSurplusId(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete surplus error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <SectionHeader
        title="Gapcha / Extra Sellable Surplus"
        subtitle="Automatic month-wise reconciliation of Kasab received vs Val & Empty Rola returned"
      />

      {errorMsg && (
        <div
          className="rounded-lg p-3 text-xs font-medium flex items-center justify-between shadow-xs"
          style={{
            background: 'var(--color-due-bg)',
            color: 'var(--color-due)',
            border: '1px solid color-mix(in srgb, var(--color-due) 25%, transparent)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 3 KPI Cards (Consolidated Overview) ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="In Workshop"
          value={fmtKg(overallStats.unprocessedKasabWeight)}
          sub={`${overallStats.totalReceivedNetWeight.toFixed(3)} received − ${overallStats.totalReturnedNetWeight.toFixed(3)} returned`}
          loading={loading}
        />
        <KpiCard
          label="Available to Sell"
          value={fmtKg(overallStats.remainingGapchaWeight)}
          sub={`${overallStats.totalGapchaGenerated.toFixed(3)} created − ${overallStats.totalGapchaSold.toFixed(3)} sold`}
          tone={overallStats.remainingGapchaWeight > 0 ? 'positive' : undefined}
          loading={loading}
        />
        <KpiCard
          label="Sold This Month"
          value={fmtKg(overallStats.totalGapchaSold)}
          sub={overallStats.totalGapchaRevenue > 0 ? `${fmtMoney(overallStats.totalGapchaRevenue)} revenue` : 'No sales yet'}
          tone={overallStats.totalGapchaSold > 0 ? 'positive' : undefined}
          loading={loading}
        />
      </div>

      {/* ── Navigation Tabs & Inline Actions ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]">
        <nav className="flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('parties')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'parties'
                ? 'border-[var(--color-brass)] text-[var(--color-brass)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Layers size={15} /> Party Standing ({parties.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-[var(--color-brass)] text-[var(--color-brass)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Scale size={15} /> Sales History Ledger ({filteredSales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('surplus')}
            className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'surplus'
                ? 'border-[var(--color-brass)] text-[var(--color-brass)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Sparkles size={15} /> Tare Surplus Log ({filteredSurplus.length})
          </button>
        </nav>

        <div className="flex items-center gap-2 pb-2 sm:pb-2.5 shrink-0">
          <Button
            variant="ghost"
            onClick={() => {
              setSurplusForm({
                partyId: parties[0]?.id || '',
                date: todayStr(),
                weightGrams: '',
                note: '',
              })
              setIsSurplusOpen(true)
            }}
          >
            <Sparkles size={14} /> Log Tare Surplus
          </Button>
          <Button
            onClick={() => {
              setSaleForm({ ...EMPTY_SALE_FORM, date: todayStr() })
              setIsSaleOpen(true)
            }}
          >
            <Scale size={14} /> Record Gapcha Sale
          </Button>
        </div>
      </div>

      {/* ── Tab 1: Party Standing Table ─────────────────────────── */}
      {activeTab === 'parties' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
            <span className="font-medium">{parties.length} Parties</span>
            <span
              className="inline-flex items-center gap-1 text-[var(--color-ink-soft)] cursor-help"
              title={`Auto-calculated for ${formattedMonth}: Received Net − Dispatched Net = Pending Stock.`}
            >
              <Info size={13} />
              <span>Pending = Received − Dispatched</span>
            </span>
          </div>

          <Table
            columns={[
              'Party',
              'Received',
              'Dispatched',
              'Pending',
              'Gapcha',
              'Actions',
            ]}
            rows={partyRows}
            emptyText="No parties found."
            renderRow={(r) => {
              if (!r.hasActivity) {
                return (
                  <tr
                    key={r.party.id}
                    className="hover:bg-[#FAF8F3] transition-colors opacity-75 hover:opacity-100"
                    style={{ borderTop: '1px solid var(--color-border-soft)' }}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-sm text-[var(--color-ink)]">{r.party.name}</div>
                    </td>
                    <td colSpan={4} className="px-4 py-3.5 whitespace-nowrap text-xs text-[var(--color-ink-soft)] italic">
                      No activity this month
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSaleForm({
                              ...EMPTY_SALE_FORM,
                              partyId: r.party.id,
                              date: todayStr(),
                            })
                            setIsSaleOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] cursor-pointer transition-colors"
                          title="Record Gapcha Sale for this party"
                        >
                          <Scale size={13} /> Sell
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSurplusForm({
                              partyId: r.party.id,
                              date: todayStr(),
                              weightGrams: '',
                              note: '',
                            })
                            setIsSurplusOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] cursor-pointer transition-colors"
                          title="Log tare surplus for this party"
                        >
                          <Sparkles size={13} /> + Surplus
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr
                  key={r.party.id}
                  className="hover:bg-[#FAF8F3] transition-colors"
                  style={{ borderTop: '1px solid var(--color-border-soft)' }}
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-semibold text-sm text-[var(--color-ink)]">{r.party.name}</div>
                    <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                      {r.receiptCount} receipts · {r.dispatchCount} dispatches
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-semibold text-[var(--color-ink)]">
                    {fmtKg(r.receivedNet)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-semibold text-[var(--color-ink)]">
                    {fmtKg(r.returnedNet)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-semibold text-[var(--color-ink)]">
                    {fmtKg(r.pendingStock)}
                  </td>
                  <td
                    className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-bold"
                    style={{
                      color:
                        r.availableGapcha > 0
                          ? 'var(--color-brass)'
                          : 'var(--color-ink-soft)',
                    }}
                  >
                    {fmtKg(r.availableGapcha)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSaleForm({
                            ...EMPTY_SALE_FORM,
                            partyId: r.party.id,
                            date: todayStr(),
                          })
                          setIsSaleOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-brass)] text-white hover:opacity-90 cursor-pointer shadow-xs transition-opacity"
                        title="Sell available Gapcha for this party"
                      >
                        <Scale size={13} /> Sell
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSurplusForm({
                            partyId: r.party.id,
                            date: todayStr(),
                            weightGrams: '',
                            note: '',
                          })
                          setIsSurplusOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-paper)] cursor-pointer shadow-xs transition-colors"
                        title="Log legitimate tare surplus for this party"
                      >
                        <Sparkles size={13} /> + Surplus
                      </button>
                    </div>
                  </td>
                </tr>
              )
            }}
          />
        </div>
      )}

      {/* ── Tab 2: Sales History Ledger ─────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
            <p>Gapcha sales recorded for <strong>{formattedMonth}</strong></p>
            <span className="font-semibold text-[var(--color-positive)]">
              Total Revenue: {fmtMoney(overallStats.totalGapchaRevenue)}
            </span>
          </div>
          <Table
            columns={[
              'Date',
              'Buyer',
              'Origin Party',
              'Weight Sold',
              'Rate',
              'Amount',
              'Notes',
              'Actions',
            ]}
            rows={filteredSales}
            emptyText="No Gapcha sales found for this period."
            renderRow={(s) => (
              <tr
                key={s.id}
                className="hover:bg-[#FAF8F3] transition-colors"
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                  {fmtDate(s.date)}
                </td>
                <td className="px-4 py-3.5 font-semibold text-sm text-[var(--color-ink)]">
                  {s.buyer_name}
                </td>
                <td className="px-4 py-3.5 text-sm text-[var(--color-ink-soft)]">
                  {s.party?.name || 'General Stock'}
                </td>
                <td className="px-4 py-3.5 tabular-nums font-semibold text-sm text-[var(--color-ink)]">
                  {fmtKg(s.weight_kg)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-sm text-[var(--color-ink-soft)]">
                  {s.rate_per_kg ? `₹${s.rate_per_kg}/kg` : '—'}
                </td>
                <td className="px-4 py-3.5 tabular-nums font-bold text-sm text-[var(--color-positive)]">
                  {s.amount ? fmtMoney(s.amount) : '—'}
                </td>
                <td className="px-4 py-3.5 text-sm text-[var(--color-ink-soft)] max-w-xs truncate">
                  {s.note || '—'}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => setDeletingSaleId(s.id)}
                    className="p-1.5 rounded-lg text-[var(--color-due)] hover:bg-[var(--color-due-bg)] cursor-pointer transition-colors"
                    title="Delete Sale"
                    aria-label="Delete Sale"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* ── Tab 3: Tare Surplus Log ──────────────────────────────── */}
      {activeTab === 'surplus' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
            <p>Legitimate tare surplus weight logged for <strong>{formattedMonth}</strong></p>
            <span className="font-semibold text-[var(--color-brass)]">
              Total Created: {fmtKg(overallStats.totalGapchaGenerated)}
            </span>
          </div>
          <Table
            columns={[
              'Date',
              'Party',
              'Surplus Weight',
              'Notes / Reference',
              'Actions',
            ]}
            rows={filteredSurplus}
            emptyText="No tare surplus records logged yet. Click '+ Log Tare Surplus' to add legitimate surplus."
            renderRow={(rc) => (
              <tr
                key={rc.id}
                className="hover:bg-[#FAF8F3] transition-colors"
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                  {fmtDate(rc.date)}
                </td>
                <td className="px-4 py-3.5 text-sm font-semibold text-[var(--color-ink)]">
                  {rc.party?.name || '—'}
                </td>
                <td
                  className="px-4 py-3.5 tabular-nums font-bold text-sm"
                  style={{
                    color:
                      Number(rc.gapcha_weight) > 0
                        ? 'var(--color-positive)'
                        : 'var(--color-ink-soft)',
                  }}
                >
                  {fmtKg(rc.gapcha_weight)}
                </td>
                <td className="px-4 py-3.5 text-sm text-[var(--color-ink-soft)] max-w-xs truncate">
                  {rc.note || '—'}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => setDeletingSurplusId(rc.id)}
                    className="p-1.5 rounded-lg text-[var(--color-due)] hover:bg-[var(--color-due-bg)] cursor-pointer transition-colors"
                    title="Delete Surplus Record"
                    aria-label="Delete Surplus Record"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* ── Record Gapcha Sale Modal ────────────────────────────── */}
      {isSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl p-5 bg-white border border-[var(--color-border)] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-soft)]">
              <h3
                className="text-base font-bold flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
              >
                <Scale size={18} className="text-[var(--color-brass)]" />
                Record Gapcha Sale
              </h3>
              <button
                type="button"
                onClick={() => setIsSaleOpen(false)}
                className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={submitSale} className="pt-3 space-y-3">
              <Field label="Buyer / Customer Name *">
                <TextInput
                  required
                  placeholder="e.g. Ramesh Bhai / Local Trader"
                  value={saleForm.buyerName}
                  onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *">
                  <TextInput
                    type="date"
                    required
                    value={saleForm.date}
                    onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                  />
                </Field>

                <Field label="Origin Party (Optional)">
                  <Select
                    value={saleForm.partyId}
                    onChange={(e) => setSaleForm({ ...saleForm, partyId: e.target.value })}
                  >
                    <option value="">-- General Stock --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Weight (kg or g) *">
                  <TextInput
                    required
                    type="number"
                    step="any"
                    placeholder="e.g. 5.500"
                    value={saleForm.weightGrams}
                    onChange={(e) => setSaleForm({ ...saleForm, weightGrams: e.target.value })}
                  />
                </Field>

                <Field label="Rate (₹/kg)">
                  <TextInput
                    type="number"
                    step="any"
                    placeholder="e.g. 250"
                    value={saleForm.ratePerKg}
                    onChange={(e) => setSaleForm({ ...saleForm, ratePerKg: e.target.value })}
                  />
                </Field>

                <Field label="Total Amount">
                  <div className="h-9 px-3 flex items-center rounded-md border border-[var(--color-border-soft)] bg-[var(--color-paper)] text-xs font-bold tabular-nums text-[var(--color-brass)]">
                    {saleAmount !== null ? fmtMoney(saleAmount) : '—'}
                  </div>
                </Field>
              </div>

              <Field label="Notes / Reference">
                <TextInput
                  placeholder="e.g. Cash payment received"
                  value={saleForm.note}
                  onChange={(e) => setSaleForm({ ...saleForm, note: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-soft)]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSaleOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Sale'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Log Tare Surplus Modal ──────────────────────────────── */}
      {isSurplusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl p-5 bg-white border border-[var(--color-border)] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-soft)]">
              <h3
                className="text-base font-bold flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
              >
                <Sparkles size={18} className="text-[var(--color-brass)]" />
                Log Legitimate Tare Surplus (Gapcha)
              </h3>
              <button
                type="button"
                onClick={() => setIsSurplusOpen(false)}
                className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={submitSurplus} className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Party *">
                  <Select
                    required
                    value={surplusForm.partyId}
                    onChange={(e) => setSurplusForm({ ...surplusForm, partyId: e.target.value })}
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Date *">
                  <TextInput
                    type="date"
                    required
                    value={surplusForm.date}
                    onChange={(e) => setSurplusForm({ ...surplusForm, date: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Surplus Weight (kg or grams) *">
                <TextInput
                  required
                  type="number"
                  step="any"
                  placeholder="e.g. 1.250 (or 1250 for grams)"
                  value={surplusForm.weightGrams}
                  onChange={(e) => setSurplusForm({ ...surplusForm, weightGrams: e.target.value })}
                />
              </Field>

              <Field label="Notes / Lot Reference">
                <TextInput
                  placeholder="e.g. 200g rola vs 70g bungri tare surplus from Lot 1"
                  value={surplusForm.note}
                  onChange={(e) => setSurplusForm({ ...surplusForm, note: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-soft)]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSurplusOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Logging...' : 'Log Surplus'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Sale Modal ───────────────────────────── */}
      {deletingSaleId && (
        <ConfirmDelete
          onConfirm={() => handleDeleteSale(deletingSaleId)}
          onCancel={() => setDeletingSaleId(null)}
        />
      )}

      {/* ── Confirm Delete Surplus Modal ────────────────────────── */}
      {deletingSurplusId && (
        <ConfirmDelete
          onConfirm={() => handleDeleteSurplus(deletingSurplusId)}
          onCancel={() => setDeletingSurplusId(null)}
        />
      )}
    </div>
  )
}
