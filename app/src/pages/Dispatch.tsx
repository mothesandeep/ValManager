import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react'
import {
  fetchParties,
  fetchDispatches,
  insertDispatches,
  updateDispatch,
  deleteDispatch,
  type DispatchPayload,
} from '../lib/queries'
import type { Party, DispatchWithParty } from '../types'
import { fmtDate, fmtKg, fmtMoney, todayStr } from '../types'
import {
  SectionHeader,
  KpiCard,
  Button,
  Field,
  Select,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'
import { useMonth } from '../context/MonthContext'
import { resolvePartyBungariWeight, getTarRate } from '../lib/settings'

type DispatchType = 'Val' | 'Rola'

// Available Tar (cord count) options for Val dispatch
const TAR_OPTIONS = [4, 6, 8, 9, 10, 12, 14, 16, 18] as const

interface BagItem {
  id: string
  gross: string      // in kg
  bungariCount: string  // integer for Val
  rolaCount: string     // integer for Rola
  // bungariWeightGrams is no longer a per-bag field — resolved from party settings
}

interface FormHeader {
  partyId: string
  date: string
  dispatchType: DispatchType
  challanNo: string
  tar: string          // Cord count for Val (e.g. "8", "9", "10")
  twistType: 'S' | 'Z' // S or Z twist type for Val
}

export default function Dispatch() {
  const { filterByMonth, formattedMonth } = useMonth()
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [header, setHeader] = useState<FormHeader>({
    partyId: '',
    date: todayStr(),
    dispatchType: 'Val',
    challanNo: '',
    tar: '8',
    twistType: 'S',
  })

  // bungariWeightGrams is now resolved from party settings, stored per-session
  const [rememberedBungariWeight, setRememberedBungariWeight] = useState<string>('70')

  const createBlankBag = (): BagItem => ({
    id: Math.random().toString(36).substring(2, 9),
    gross: '',
    bungariCount: '',
    rolaCount: '',
  })

  // Separate bag lists to isolate Val and Rola data
  const [valBags, setValBags] = useState<BagItem[]>([createBlankBag()])
  const [rolaBags, setRolaBags] = useState<BagItem[]>([createBlankBag()])

  // Auto-computed rate based on Tar only (S/Z is twist type only, no rate difference)
  const autoRate = header.dispatchType === 'Val'
    ? getTarRate(header.tar)
    : 0

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [dispatchesData, partiesData] = await Promise.all([
        fetchDispatches(),
        fetchParties(),
      ])
      setDispatches(dispatchesData)
      setParties(partiesData)
    } catch (err) {
      console.error('Error loading dispatches:', err)
      setErrorMsg('Could not load dispatch entries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredDispatches = filterByMonth(dispatches)
  const isRolaEntry = (d: DispatchWithParty) => d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'

  const monthValNet = Math.round(
    filteredDispatches
      .filter((d) => !isRolaEntry(d))
      .reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0) * 1000
  ) / 1000

  const monthRolaNet = Math.round(
    filteredDispatches
      .filter((d) => isRolaEntry(d))
      .reduce((s, d) => s + (Number(d.bore_gross_weight) || 0), 0) * 1000
  ) / 1000

  const monthDispatchedTotal = Math.round((monthValNet + monthRolaNet) * 1000) / 1000
  const monthBilling = filteredDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  const handlePartyChange = (newPartyId: string) => {
    const selectedParty = parties.find((p) => p.id === newPartyId)
    const partyBungari = String(resolvePartyBungariWeight(selectedParty))
    setHeader((prev) => ({ ...prev, partyId: newPartyId }))
    setRememberedBungariWeight(partyBungari)
  }

  const startAdd = () => {
    setEditingId(null)
    const firstParty = parties[0]
    const initialBungari = String(resolvePartyBungariWeight(firstParty))
    setRememberedBungariWeight(initialBungari)
    setHeader({
      partyId: firstParty?.id || '',
      date: todayStr(),
      dispatchType: 'Val',
      challanNo: '',
      tar: '8',
      twistType: 'S',
    })
    setValBags([createBlankBag()])
    setRolaBags([createBlankBag()])
    setIsOpen(true)
    setErrorMsg(null)
  }

  const startEdit = (d: DispatchWithParty) => {
    setEditingId(d.id)
    const type: DispatchType = (d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola') ? 'Rola' : 'Val'

    // Restore bungari weight from saved record for display purposes
    const bCount = d.bungari_count ?? 0
    let histBungariWeight = '70'
    if (d.bungari_weight_g) {
      histBungariWeight = String(d.bungari_weight_g)
    } else if (bCount > 0 && d.net_val_weight !== null && d.net_val_weight !== undefined) {
      histBungariWeight = String(
        Math.round(((d.bore_gross_weight - d.net_val_weight) * 1000) / bCount)
      )
    }
    setRememberedBungariWeight(histBungariWeight)

    // Try to infer Tar from cord_count field if present
    const inferredTar = d.cord_count ? String(d.cord_count) : '8'
    const inferredTwist: 'S' | 'Z' = (d.twist_type === 'Z') ? 'Z' : 'S'

    setHeader({
      partyId: d.party_id || parties[0]?.id || '',
      date: d.date,
      dispatchType: type,
      challanNo: d.challan_no || '',
      tar: inferredTar,
      twistType: inferredTwist,
    })

    const loadedBag: BagItem = {
      id: d.id,
      gross: String(d.bore_gross_weight),
      bungariCount: String(bCount),
      rolaCount: String(d.rola_count ?? 0),
    }

    if (type === 'Val') {
      setValBags([loadedBag])
      setRolaBags([createBlankBag()])
    } else {
      setRolaBags([loadedBag])
      setValBags([createBlankBag()])
    }
    setIsOpen(true)
    setErrorMsg(null)
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingId(null)
    setErrorMsg(null)
  }

  const addBag = () => {
    if (header.dispatchType === 'Val') {
      setValBags((prev) => [...prev, createBlankBag()])
    } else {
      setRolaBags((prev) => [...prev, createBlankBag()])
    }
  }

  const removeBag = (id: string) => {
    if (header.dispatchType === 'Val') {
      if (valBags.length <= 1) return
      setValBags((prev) => prev.filter((b) => b.id !== id))
    } else {
      if (rolaBags.length <= 1) return
      setRolaBags((prev) => prev.filter((b) => b.id !== id))
    }
  }

  const updateBag = (id: string, field: keyof BagItem, val: string) => {
    if (header.dispatchType === 'Val') {
      setValBags((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
      )
    } else {
      setRolaBags((prev) =>
        prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
      )
    }
  }

  // Calculate tare, net & amount for a bag
  const calcBagValues = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    // Auto handle if user typed grams as whole number (e.g. 18500 => 18.5 kg)
    if (grossKg > 500) {
      grossKg = grossKg / 1000
    }

    if (header.dispatchType === 'Val') {
      const bungariCount = parseInt(b.bungariCount, 10) || 0
      // bungariWeightG resolved from party/global settings (not user-entered)
      const bungariWeightG = parseInt(rememberedBungariWeight, 10) || 70
      const tareKg = (bungariCount * bungariWeightG) / 1000
      const netKg = Math.max(0, grossKg - tareKg)
      // Rate auto-resolved from Tar + Twist settings
      const rate = autoRate
      const amount =
        rate > 0 && grossKg > 0 ? Math.round(netKg * rate * 100) / 100 : null

      return {
        grossKg,
        bungariCount,
        bungariWeightG,
        tareKg,
        netKg,
        amount,
        rolaCount: 0,
      }
    } else {
      // Rola Dispatch (Empty Spools)
      const rolaCount = parseInt(b.rolaCount, 10) || 0
      return {
        grossKg,
        bungariCount: 0,
        bungariWeightG: 0,
        tareKg: 0,
        netKg: grossKg,
        amount: null,
        rolaCount,
      }
    }
  }

  const currentBags = header.dispatchType === 'Val' ? valBags : rolaBags

  const bagCalculations = currentBags.map((b) => ({
    bag: b,
    ...calcBagValues(b),
  }))

  const totalGross = bagCalculations.reduce((sum, b) => sum + b.grossKg, 0)
  const totalNet = bagCalculations.reduce((sum, b) => sum + b.netKg, 0)
  const totalBungari = bagCalculations.reduce((sum, b) => sum + b.bungariCount, 0)
  const totalRola = bagCalculations.reduce((sum, b) => sum + b.rolaCount, 0)
  const totalAmount = bagCalculations.reduce((sum, b) => sum + (b.amount || 0), 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!header.partyId) {
      setErrorMsg('Please select a party')
      return
    }

    if (!header.date) {
      setErrorMsg('Please select a date')
      return
    }

    if (header.dispatchType === 'Val') {
      if (!header.tar) {
        setErrorMsg('Please select Tar (cord count) for Val dispatch')
        return
      }
    }

    // Validate all bags in active mode
    for (let i = 0; i < bagCalculations.length; i++) {
      const { grossKg, tareKg } = bagCalculations[i]
      const bNum = i + 1
      if (grossKg <= 0) {
        setErrorMsg(`Bag #${bNum}: Gross weight must be greater than 0`)
        return
      }
      if (header.dispatchType === 'Val' && tareKg >= grossKg && grossKg > 0) {
        setErrorMsg(`Bag #${bNum}: Tare (${fmtKg(tareKg)}) cannot exceed gross weight (${fmtKg(grossKg)})`)
        return
      }
    }

    setSaving(true)
    setErrorMsg(null)

    const rateVal = header.dispatchType === 'Val' ? autoRate : null
    const tarNum = header.dispatchType === 'Val' ? parseInt(header.tar, 10) || null : null

    try {
      if (editingId) {
        // Single bag update
        const val = bagCalculations[0]
        const payload: DispatchPayload = {
          party_id: header.partyId,
          date: header.date,
          dispatch_type: header.dispatchType,
          challan_no: header.challanNo.trim() || null,
          cord_count: tarNum,
          twist_type: header.dispatchType === 'Val' ? header.twistType : null,
          bungari_count: header.dispatchType === 'Val' ? val.bungariCount : 0,
          bungari_weight_g: header.dispatchType === 'Val' ? val.bungariWeightG : null,
          bore_gross_weight: val.grossKg,
          net_val_weight: header.dispatchType === 'Val' ? val.netKg : null,
          rate_per_kg: rateVal,
          amount: val.amount,
          rola_count: header.dispatchType === 'Rola' ? val.rolaCount : 0,
        }
        await updateDispatch(editingId, payload)
      } else {
        // Multi-bag batch insert for active mode
        const payloads: DispatchPayload[] = bagCalculations.map((val) => ({
          party_id: header.partyId,
          date: header.date,
          dispatch_type: header.dispatchType,
          challan_no: header.challanNo.trim() || null,
          cord_count: tarNum,
          twist_type: header.dispatchType === 'Val' ? header.twistType : null,
          bungari_count: header.dispatchType === 'Val' ? val.bungariCount : 0,
          bungari_weight_g: header.dispatchType === 'Val' ? val.bungariWeightG : null,
          bore_gross_weight: val.grossKg,
          net_val_weight: header.dispatchType === 'Val' ? val.netKg : null,
          rate_per_kg: rateVal,
          amount: val.amount,
          rola_count: header.dispatchType === 'Rola' ? val.rolaCount : 0,
        }))
        await insertDispatches(payloads)
      }

      closeForm()
      await loadData()
    } catch (err: unknown) {
      console.error('Save dispatch error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save dispatch — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDispatch(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete dispatch error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Dispatch"
        subtitle="Finished Val and Empty Rola delivered to parties — weight, bungari, billing"
        action={
          !isOpen &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> New Dispatch
            </Button>
          )
        }
      />

      {/* ── Month Summary KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Total Dispatched"
          value={fmtKg(monthDispatchedTotal)}
          sub={formattedMonth}
          tone="positive"
          loading={loading}
        />
        <KpiCard
          label="Val Net Weight"
          value={fmtKg(monthValNet)}
          sub="finished jari"
          loading={loading}
        />
        <KpiCard
          label="Empty Rolas Returned"
          value={fmtKg(monthRolaNet)}
          sub="returned spools"
          loading={loading}
        />
        <KpiCard
          label="Dispatch Value"
          value={fmtMoney(monthBilling)}
          sub={formattedMonth}
          tone="positive"
          loading={loading}
        />
      </div>

      {errorMsg && (
        <div
          className="rounded-lg p-3 mb-4 text-xs font-medium flex items-center justify-between shadow-xs"
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

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording dispatch entries." />
      )}

      {/* ── Add / Edit Form (Consistent Bag-List Layout) ──────────── */}
      {isOpen && (
        <form
          onSubmit={submit}
          className="mb-6 p-4 rounded-lg bg-white border border-[var(--color-border)] shadow-xs"
        >
          {/* 1. Leading Prominent Segmented Toggle */}
          <div className="mb-4 pb-3 border-b border-[var(--color-border-soft)]">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] gap-1 shadow-inner">
              <button
                type="button"
                disabled={Boolean(editingId)}
                onClick={() => setHeader({ ...header, dispatchType: 'Val' })}
                className={`min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center text-center ${
                  header.dispatchType === 'Val'
                    ? 'bg-[var(--color-brass)] text-white shadow-xs font-bold'
                    : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/70'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                title="Finished Goods (Val) — Billable"
              >
                Val (Finished Goods)
              </button>
              <button
                type="button"
                disabled={Boolean(editingId)}
                onClick={() => setHeader({ ...header, dispatchType: 'Rola' })}
                className={`min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center text-center ${
                  header.dispatchType === 'Rola'
                    ? 'bg-[var(--color-brass)] text-white shadow-xs font-bold'
                    : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/70'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                title="Empty Spools Return (Rola) — Non-billable"
              >
                Rola (Empty Return)
              </button>
            </div>
          </div>

          {/* 2. Top Header Row: Party, Date, Tar+S/Z (Val only), Challan */}
          <div
            className={`grid gap-3 mb-4 pb-3 border-b border-[var(--color-border-soft)] ${
              header.dispatchType === 'Val'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            <Field label="Party *">
              <Select
                required
                value={header.partyId}
                onChange={(e) => handlePartyChange(e.target.value)}
              >
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Date">
              <input
                type="date"
                required
                value={header.date}
                onChange={(e) => setHeader({ ...header, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm text-[var(--color-ink)] bg-white focus:outline-hidden focus:ring-2 focus:ring-[var(--color-brass)]"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </Field>

            {header.dispatchType === 'Val' && (
              <>
                <Field label="Tar (Cord Count) *">
                  <Select
                    required
                    value={header.tar}
                    onChange={(e) => setHeader({ ...header, tar: e.target.value })}
                  >
                    {TAR_OPTIONS.map((t) => (
                      <option key={t} value={String(t)}>{t} Tar</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Type (S / Z) *">
                  <div className="grid grid-cols-2 gap-1.5 h-full">
                    {(['S', 'Z'] as const).map((twist) => (
                      <button
                        key={twist}
                        type="button"
                        onClick={() => setHeader({ ...header, twistType: twist })}
                        className={`py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border ${
                          header.twistType === twist
                            ? 'bg-[var(--color-brass)] text-white border-[var(--color-brass)] shadow-xs'
                            : 'bg-white text-[var(--color-ink-soft)] border-[var(--color-border)] hover:border-[var(--color-brass)]/60 hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {twist}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Auto-computed rate display */}
                <Field label="Rate (auto)">
                  <div className="flex items-center h-full px-3 py-2 rounded-lg border bg-[var(--color-paper)] text-sm font-bold tabular-nums" style={{ borderColor: 'var(--color-border)', color: 'var(--color-brass)' }}>
                    ₹{autoRate}/kg
                    <span className="ml-auto text-[10px] font-normal text-[var(--color-ink-soft)]">{header.tar}T·{header.twistType}</span>
                  </div>
                </Field>
              </>
            )}

            <Field label="Challan Number">
              <input
                type="text"
                placeholder="e.g. CH-200"
                value={header.challanNo}
                onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm text-[var(--color-ink)] bg-white focus:outline-hidden focus:ring-2 focus:ring-[var(--color-brass)]"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </Field>
          </div>

          {/* 3. Bag Entries Section */}
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--color-ink-soft)] px-1 flex-wrap gap-2">
              <span className="font-semibold text-[var(--color-ink)]">
                Bag Entries ({currentBags.length})
              </span>
              {header.dispatchType === 'Val' && (
                <span className="text-[11px] text-[var(--color-ink-soft)] bg-[var(--color-paper)] px-2 py-1 rounded border border-[var(--color-border-soft)]">
                  Bungri: <strong className="text-[var(--color-ink)]">{rememberedBungariWeight}g</strong> per piece
                  {(() => {
                    const selectedP = parties.find((p) => p.id === header.partyId)
                    const isCustom = Boolean(selectedP?.default_bungari_weight_g)
                    return isCustom ? <span className="ml-1 text-[var(--color-brass)] font-semibold">(Party)</span> : <span className="ml-1">(Global)</span>
                  })()}
                </span>
              )}
            </div>

            {/* Per-Bag Rows */}
            {bagCalculations.map(({ bag: b, tareKg, netKg, amount, rolaCount }, idx) => (
              <div
                key={b.id}
                className="p-2.5 sm:p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border-soft)] text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5"
              >
                {/* Mobile Strip Top: Bag title & Results */}
                <div className="flex items-center justify-between sm:hidden pb-1 border-b border-[var(--color-border-soft)]">
                  <span className="font-bold text-xs text-[var(--color-ink)]">
                    Bag {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {header.dispatchType === 'Val' ? (
                      <>
                        <span className="text-[var(--color-ink-soft)]">
                          Tare: <strong className="font-medium text-[var(--color-ink)]">{fmtKg(tareKg)}</strong> · Net: <strong className="text-[var(--color-brass)]">{fmtKg(netKg)}</strong>
                        </span>
                        {amount !== null && (
                          <>
                            <span>·</span>
                            <strong className="text-[var(--color-brass)]">{fmtMoney(amount)}</strong>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-ink)] font-semibold">
                        Rola: <strong className="text-[var(--color-brass)]">{rolaCount} pcs</strong>
                      </span>
                    )}
                    {currentBags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBag(b.id)}
                        className="p-1 text-[var(--color-due)] hover:opacity-75 cursor-pointer ml-1"
                        title="Remove bag"
                        aria-label="Remove bag"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop Bag # label */}
                <span className="hidden sm:inline-block font-semibold text-xs text-[var(--color-ink)] w-12 shrink-0">
                  Bag {idx + 1}
                </span>

                {/* Inputs Row */}
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 flex-1">
                  {/* Gross Input */}
                  <div className="col-span-1 sm:flex-1 min-w-0">
                    <label className="block sm:hidden text-[10px] text-[var(--color-ink-soft)] mb-0.5 font-medium">
                      Gross (kg)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="Gross (kg)"
                      className="w-full px-2 py-1.5 rounded border bg-white text-xs tabular-nums outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                      value={b.gross}
                      onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                    />
                  </div>

                  {header.dispatchType === 'Val' ? (
                    <>
                      {/* Bungari Count Input only — weight is auto from settings */}
                      <div className="col-span-1 sm:w-24 min-w-0">
                        <label className="block sm:hidden text-[10px] text-[var(--color-ink-soft)] mb-0.5 font-medium">
                          Bungri Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Bungri #"
                          className="w-full px-2 py-1.5 rounded border bg-white text-xs tabular-nums outline-none"
                          style={{ borderColor: 'var(--color-border)' }}
                          value={b.bungariCount}
                          onChange={(e) => updateBag(b.id, 'bungariCount', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    /* Rola Count Input (Rola mode) */
                    <div className="col-span-2 sm:w-32 min-w-0">
                      <label className="block sm:hidden text-[10px] text-[var(--color-ink-soft)] mb-0.5 font-medium">
                        Rola Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Rola Count"
                        className="w-full px-2 py-1.5 rounded border bg-white text-xs tabular-nums outline-none"
                        style={{ borderColor: 'var(--color-border)' }}
                        value={b.rolaCount}
                        onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Desktop Results */}
                {header.dispatchType === 'Val' ? (
                  <>
                    <div className="hidden sm:block text-right tabular-nums text-[var(--color-ink-soft)] shrink-0 whitespace-nowrap">
                      Tare: <strong className="font-medium text-[var(--color-ink)]">{fmtKg(tareKg)}</strong> · Net: <strong className="text-[var(--color-brass)]">{fmtKg(netKg)}</strong>
                    </div>

                    <div className="hidden sm:block text-right tabular-nums text-[var(--color-brass)] shrink-0 w-20 font-bold">
                      {amount !== null ? fmtMoney(amount) : '—'}
                    </div>
                  </>
                ) : (
                  <div className="hidden sm:block text-right tabular-nums text-[var(--color-ink)] shrink-0 w-28 font-semibold">
                    Rola: <strong className="text-[var(--color-brass)]">{rolaCount} pcs</strong>
                  </div>
                )}

                {currentBags.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBag(b.id)}
                    className="hidden sm:block p-1 text-[var(--color-due)] hover:opacity-75 cursor-pointer shrink-0"
                    title="Remove bag"
                    aria-label="Remove bag"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 4. Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-border-soft)]">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              {!editingId ? (
                <button
                  type="button"
                  onClick={addBag}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium text-[var(--color-brass)] bg-[var(--color-paper)] border border-[var(--color-brass)]/35 hover:border-[var(--color-brass)] hover:bg-white transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <Plus size={14} strokeWidth={2.5} /> Add Another
                </button>
              ) : <div />}

              <div className="sm:hidden text-xs text-right">
                {header.dispatchType === 'Val' ? (
                  <>
                    <span className="text-[var(--color-ink-soft)]">Total Net: </span>
                    <strong className="text-sm font-bold text-[var(--color-brass)] tabular-nums">
                      {fmtKg(totalNet)}
                    </strong>
                  </>
                ) : (
                  <>
                    <span className="text-[var(--color-ink-soft)]">Total Gross: </span>
                    <strong className="text-sm font-bold text-[var(--color-brass)] tabular-nums">
                      {fmtKg(totalGross)}
                    </strong>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-xs text-[var(--color-ink-soft)] hidden sm:inline">
                {header.dispatchType === 'Val' ? (
                  <>
                    Total Net:{' '}
                    <strong className="text-sm font-bold text-[var(--color-brass)]">
                      {fmtKg(totalNet)}
                    </strong>{' '}
                    ({currentBags.length} {currentBags.length === 1 ? 'bag' : 'bags'} · Gross: {fmtKg(totalGross)} · {totalBungari} bungari{totalAmount > 0 ? ` · ${fmtMoney(totalAmount)}` : ''})
                  </>
                ) : (
                  <>
                    Total Gross:{' '}
                    <strong className="text-sm font-bold text-[var(--color-brass)]">
                      {fmtKg(totalGross)}
                    </strong>{' '}
                    ({currentBags.length} {currentBags.length === 1 ? 'bag' : 'bags'} · {totalRola} rola spools)
                  </>
                )}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 sm:flex-none py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none py-2"
                >
                  <Check size={16} />{' '}
                  {saving ? 'Saving…' : editingId ? 'Update' : currentBags.length > 1 ? `Save (${currentBags.length} Bags)` : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ── Flat Table View ───────────────────────────────────────── */}
      {filteredDispatches.length === 0 && !loading ? (
        <EmptyState text={`No dispatch entries found for ${formattedMonth}.`} />
      ) : (
        <div
          className="overflow-x-auto rounded-lg bg-white shadow-xs"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr style={{ background: 'var(--color-border-soft)' }}>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Party
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Gross (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Bungari / Rola
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Tare (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Net Val (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Rate
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Amount
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Challan #
                </th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDispatches.map((d) => {
                const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
                const isVal = !isRola
                const tareKg = isVal && d.net_val_weight !== null
                  ? Math.max(0, d.bore_gross_weight - d.net_val_weight)
                  : 0

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-[#FAF8F3] transition-colors"
                    style={{ borderTop: '1px solid var(--color-border-soft)' }}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                      {fmtDate(d.date)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-[var(--color-ink)]">
                      {d.party?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          background: isVal ? 'var(--color-paper)' : '#fef3c7',
                          color: isVal ? 'var(--color-ink)' : '#92400e',
                        }}
                      >
                        {isVal ? 'Val' : 'Rola'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm text-[var(--color-ink)]">
                      {fmtKg(d.bore_gross_weight)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm text-[var(--color-ink)]">
                      {isVal
                        ? d.bungari_count > 0 ? `${d.bungari_count} bungari` : '—'
                        : d.rola_count ? `${d.rola_count} rola` : '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm text-[var(--color-ink-soft)]">
                      {isVal && tareKg > 0 ? fmtKg(tareKg) : '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-semibold text-[var(--color-brass)]">
                      {isVal && d.net_val_weight !== null ? fmtKg(d.net_val_weight) : fmtKg(d.bore_gross_weight)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm text-[var(--color-ink)]">
                      {isVal && d.rate_per_kg ? `₹${d.rate_per_kg}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-sm font-bold text-[var(--color-brass)]">
                      {isVal && d.amount ? fmtMoney(d.amount) : '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                      {d.challan_no || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          className="p-1.5 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
                          title="Edit dispatch"
                          aria-label="Edit dispatch"
                        >
                          <Pencil size={15} />
                        </button>
                        {deleting === d.id ? (
                          <ConfirmDelete
                            onConfirm={() => handleDelete(d.id)}
                            onCancel={() => setDeleting(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleting(d.id)}
                            className="p-1.5 text-[var(--color-due)] hover:opacity-75 cursor-pointer transition-opacity"
                            title="Delete dispatch"
                            aria-label="Delete dispatch"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
