import { useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  AlertCircle,
  Scale,
  Layers,
  Sparkles,
  X,
} from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchGapchaSales, fetchReconciliations, insertGapchaSale, deleteGapchaSale, insertGapchaSurplus, deleteGapchaSurplus, type GapchaSalePayload, type GapchaSurplusPayload } from '../lib/api/gapcha'


import { computeOverallGapchaStats } from '../features/gapcha/calculations'
import { useMonth } from '../context/MonthContext'
import type { Party } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import type { GapchaSaleWithParty, GapchaReconciliationWithParty, OverallGapchaStats } from '../features/gapcha/types'
import { fmtDate, todayStr } from '../utils/date'
import { fmtKg, fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { EmptyState } from '../components/ui/EmptyState'

interface SaleFormState {
  id: string | null
  partyId: string
  buyerName: string
  date: string
  weightGrams: string
  ratePerKg: string
  note: string
}

const EMPTY_SALE_FORM: SaleFormState = {
  id: null,
  partyId: '',
  buyerName: '',
  date: todayStr(),
  weightGrams: '',
  ratePerKg: '',
  note: '',
}

interface SurplusFormState {
  id: string | null
  partyId: string
  date: string
  weightGrams: string
  note: string
}

const EMPTY_SURPLUS_FORM: SurplusFormState = {
  id: null,
  partyId: '',
  date: todayStr(),
  weightGrams: '',
  note: '',
}

export default function Gapcha() {
  const { selectedMonth, filterByMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [sales, setSales] = useState<GapchaSaleWithParty[]>([])
  const [surplusLogs, setSurplusLogs] = useState<GapchaReconciliationWithParty[]>([])
  const [, setLoading] = useState(true)

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
      <PageHeader
        title="Gapcha / Extra Sellable Surplus"
        description="Automatic month-wise reconciliation of Kasab received vs Val & Empty Rola returned"
        actions={
          <div className="hidden sm:flex gap-2">
            <Button
              onClick={() => {
                setSurplusForm({ id: null, partyId: parties[0]?.id || '', date: todayStr(), weightGrams: '', note: '' })
                setIsSurplusOpen(true)
              }}
              variant="secondary"
            >
              <Sparkles size={16} /> Log Tare Surplus
            </Button>
            <Button
              onClick={() => {
                setSaleForm({ ...EMPTY_SALE_FORM, date: todayStr() })
                setIsSaleOpen(true)
              }}
              variant="primary"
            >
              <Scale size={16} /> Record Gapcha Sale
            </Button>
          </div>
        }
      />

      {errorMsg && (
        <div
          className="rounded-[16px] p-4 text-xs font-bold flex items-center justify-between shadow-sm bg-red-50 text-red-600 border border-red-100"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 3 KPI Cards (Consolidated Overview) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">In Workshop</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-ink)] mb-2">
            {fmtKg(overallStats.unprocessedKasabWeight)} <span className="text-[14px] text-[var(--color-ink-soft)] font-bold tracking-normal">kg</span>
          </div>
          <div className="text-[10px] font-medium text-[var(--color-ink-soft)]">{overallStats.totalReceivedNetWeight.toFixed(3)} received − {overallStats.totalReturnedNetWeight.toFixed(3)} returned</div>
        </div>
        
        <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-brass-soft)] shadow-[var(--shadow-sm)] border border-[var(--color-brass-soft)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-brass-dark)] mb-2">Available To Sell</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-brass-dark)] mb-2">
            {fmtKg(overallStats.remainingGapchaWeight)} <span className="text-[14px] text-[var(--color-brass)] font-bold tracking-normal">kg</span>
          </div>
          <div className="text-[10px] font-bold text-[var(--color-brass-dark)]">{overallStats.totalGapchaGenerated.toFixed(3)} created − {overallStats.totalGapchaSold.toFixed(3)} sold</div>
        </div>

        <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-positive-bg)] shadow-[var(--shadow-sm)] border border-[var(--color-positive-border)] transition-all">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-positive)] mb-2">Sold This Month</div>
          <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-positive)] mb-2">
            {fmtKg(overallStats.totalGapchaSold)} <span className="text-[14px] text-[var(--color-positive)] font-bold tracking-normal">kg</span>
          </div>
          <div className="text-[10px] font-bold text-[var(--color-positive)]">
            {overallStats.totalGapchaRevenue > 0 ? `${fmtMoney(overallStats.totalGapchaRevenue)} revenue` : 'No sales yet'}
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────── */}
      <div className="flex overflow-x-auto pb-4 mb-2 gap-2 hide-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('parties')}
          className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold tracking-wide transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'parties'
              ? 'bg-[#a57b3f]/10 text-[#8c6530] shadow-sm'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          <Layers size={16} /> Party Standing ({parties.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold tracking-wide transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-[#a57b3f]/10 text-[#8c6530] shadow-sm'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          <Scale size={16} /> Sales History Ledger ({filteredSales.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('surplus')}
          className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold tracking-wide transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'surplus'
              ? 'bg-[#a57b3f]/10 text-[#8c6530] shadow-sm'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          <Sparkles size={16} /> Tare Surplus Log ({filteredSurplus.length})
        </button>
      </div>

      {/* ── Action Buttons ───────────────────── */}
      <div className="sm:hidden flex gap-3 mb-6">
        <button
          onClick={() => {
            setSurplusForm({ id: null, partyId: parties[0]?.id || '', date: todayStr(), weightGrams: '', note: '' })
            setIsSurplusOpen(true)
          }}
          className="flex-1 py-3 px-6 rounded-2xl font-bold text-[#8c6530] bg-[#a57b3f]/10 hover:bg-[#a57b3f]/20 border border-[#a57b3f]/20 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          <Sparkles size={16} /> Log Tare Surplus
        </button>
        <button
          onClick={() => {
            setSaleForm({ ...EMPTY_SALE_FORM, date: todayStr() })
            setIsSaleOpen(true)
          }}
          className="flex-1 py-3 px-6 rounded-2xl font-black text-white bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer border border-[#a57b3f]/50"
        >
          <Scale size={16} /> Record Gapcha Sale
        </button>
      </div>

      {/* ── Tab 1: Party Standing ─────────────────────────── */}
      {activeTab === 'parties' && (
        <div className="pb-28">
          <div className="space-y-3">
            {partyRows.map((r) => (
              <div
                key={r.party.id}
                className={`rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border ${
                  r.hasActivity ? 'border-[var(--color-border)] shadow-[var(--shadow-sm)]' : 'border-[var(--color-border)] shadow-none opacity-60'
                } transition-all`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-[16px] text-gray-900 tracking-tight">{r.party.name}</h3>
                </div>
                
                {r.hasActivity ? (
                  <div className="grid grid-cols-2 gap-y-5 gap-x-2">
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Received (Net)</div>
                      <div className="font-bold tabular-nums text-gray-900 text-[14px]">{fmtKg(r.receivedNet)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Dispatched (Net)</div>
                      <div className="font-bold tabular-nums text-gray-900 text-[14px]">{fmtKg(r.returnedNet)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Gapcha Created</div>
                      <div className="font-black tabular-nums text-emerald-600 text-[14px]">{fmtKg(r.gapchaCreated)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#a57b3f]/70 mb-1">Available Gapcha</div>
                      <div className="font-black tabular-nums text-[#8c6530] text-[14px]">
                        {fmtKg(r.availableGapcha)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] font-medium text-gray-400 italic">No activity this month</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Sales History Ledger ─────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="pb-28">
          {filteredSales.length === 0 ? (
            <EmptyState text="No gapcha sales recorded yet for this month." />
          ) : (
            <div className="space-y-3">
              {filteredSales.map((s) => (
                <div
                  key={s.id}
                  className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brass-soft)] transition-all flex flex-col group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-extrabold text-[16px] text-gray-900 tracking-tight">{s.buyer_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-gray-400">{fmtDate(s.date)}</span>
                        {s.party && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#a57b3f]/70">{s.party.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletingSaleId(s.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Weight</div>
                      <div className="font-black tabular-nums text-gray-900 text-[14px]">{fmtKg(s.weight_kg)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Rate</div>
                      <div className="font-bold tabular-nums text-gray-600 text-[14px]">{s.rate_per_kg ? `₹${s.rate_per_kg}/kg` : '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Total</div>
                      <div className="font-black tabular-nums text-emerald-600 text-[16px]">{s.amount !== null ? fmtMoney(s.amount) : '—'}</div>
                    </div>
                  </div>
                  {s.note && <div className="mt-3 text-[12px] font-medium text-gray-400 italic">"{s.note}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Tare Surplus Log ─────────────────────────── */}
      {activeTab === 'surplus' && (
        <div className="pb-28">
          {filteredSurplus.length === 0 ? (
            <EmptyState text="No tare surplus logged yet." />
          ) : (
            <div className="space-y-3">
              {filteredSurplus.map((rc) => (
                <div
                  key={rc.id}
                  className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-extrabold text-[16px] text-gray-900 tracking-tight">{rc.party?.name ?? '—'}</h3>
                      <div className="text-[11px] font-bold text-gray-400 mt-1">{fmtDate(rc.date)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletingSurplusId(rc.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#a57b3f]/70 mb-1">Surplus Logged</div>
                      <div className="font-black tabular-nums text-[#8c6530] text-[16px]">{fmtKg(rc.gapcha_weight)}</div>
                    </div>
                    {rc.note && <div className="text-[12px] font-medium text-gray-400 italic text-right max-w-[60%]">"{rc.note}"</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sale Add/Edit Modal ───────────────────────── */}
      {isSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:max-w-[480px] max-h-[95vh] sm:max-h-[85dvh] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-300 ease-out">
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start border-b border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-emerald-600/70 uppercase mb-1.5">
                  {saleForm.id ? 'EDIT SALE' : 'NEW SALE'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Record Gapcha Sale
                </h2>
              </div>
              <button 
                onClick={() => setIsSaleOpen(false)}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submitSale} className="p-6 bg-[#fcfcfb] space-y-5 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Buyer Name *</label>
                  <input
                    required
                    placeholder="e.g. Ramesh Bhai"
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-white border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[15px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={saleForm.buyerName}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-white border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={saleForm.date}
                      onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Origin Party</label>
                    <select
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-white border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm appearance-none cursor-pointer"
                      value={saleForm.partyId}
                      onChange={(e) => setSaleForm({ ...saleForm, partyId: e.target.value })}
                    >
                      <option value="">-- General Stock --</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Weight (kg/g) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="5.500"
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-[#a57b3f]/10 border border-[#a57b3f]/30 rounded-[14px] sm:rounded-xl text-[16px] sm:text-[15px] font-black tabular-nums text-[#8c6530] placeholder:text-[#a57b3f]/40 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={saleForm.weightGrams}
                      onChange={(e) => setSaleForm({ ...saleForm, weightGrams: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Rate (₹/kg)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="250"
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[16px] sm:text-[15px] font-black tabular-nums text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={saleForm.ratePerKg}
                      onChange={(e) => setSaleForm({ ...saleForm, ratePerKg: e.target.value })}
                    />
                  </div>
                </div>
                
                {saleAmount !== null && (
                  <div className="rounded-[14px] p-4 bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600/70">Total Revenue</span>
                    <span className="text-[20px] font-black tabular-nums text-emerald-600">{fmtMoney(saleAmount)}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Notes</label>
                  <input
                    placeholder="e.g. Cash payment received"
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={saleForm.note}
                    onChange={(e) => setSaleForm({ ...saleForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex sm:justify-end gap-3 pb-2 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSaleOpen(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-none sm:px-6 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-black text-white bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] shadow-[0_4px_12px_rgba(165,123,63,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#a57b3f]/50 text-[15px] sm:text-sm"
                >
                  {saving ? 'Saving...' : 'Save Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Surplus Add/Edit Modal ───────────────────────── */}
      {isSurplusOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-300 ease-out">
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start border-b border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-[#a57b3f] uppercase mb-1.5">
                  {surplusForm.id ? 'EDIT SURPLUS' : 'LOG TARE SURPLUS'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Log Tare Surplus
                </h2>
              </div>
              <button 
                onClick={() => setIsSurplusOpen(false)}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submitSurplus} className="p-6 bg-[#fcfcfb] space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Party *</label>
                  <select
                    required
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-white border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[15px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm appearance-none cursor-pointer"
                    value={surplusForm.partyId}
                    onChange={(e) => setSurplusForm({ ...surplusForm, partyId: e.target.value })}
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-white border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={surplusForm.date}
                      onChange={(e) => setSurplusForm({ ...surplusForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Weight (kg/g) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="1.250"
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-[#a57b3f]/10 border border-[#a57b3f]/30 rounded-[14px] sm:rounded-xl text-[16px] sm:text-[15px] font-black tabular-nums text-[#8c6530] placeholder:text-[#a57b3f]/40 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={surplusForm.weightGrams}
                      onChange={(e) => setSurplusForm({ ...surplusForm, weightGrams: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Notes</label>
                  <input
                    placeholder="e.g. 200g rola vs 70g bungri tare surplus"
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={surplusForm.note}
                    onChange={(e) => setSurplusForm({ ...surplusForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex sm:justify-end gap-3 pb-2 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSurplusOpen(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-none sm:px-6 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-black text-white bg-gradient-to-b from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-700 text-[15px] sm:text-sm"
                >
                  {saving ? 'Logging...' : 'Log Surplus'}
                </button>
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
