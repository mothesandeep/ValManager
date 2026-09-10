import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  insertReceipts,
  updateReceipt,
  deleteReceipt,
  type ReceiptPayload,
} from '../lib/queries'
import type { Party, ReceiptWithParty } from '../types'
import { COLOR_TYPES, fmtDate, fmtKg, todayStr } from '../types'
import {
  SectionHeader,
  KpiCard,
  Button,
  Field,
  TextInput,
  Select,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'
import { useMonth } from '../context/MonthContext'
import { resolvePartyRolaWeight, getGlobalSettings } from '../lib/settings'

const STORAGE_KEY_PER_ROLA = 'kasab_last_per_rola_weight'

interface BagItem {
  id: string
  gross: string       // in kg (e.g. "30.500")
  rolaCount: string   // integer
  perRolaGrams: string // e.g. "200"
}

interface FormHeader {
  partyId: string
  date: string
  color: string
  challanNo: string
}

export default function Receiving() {
  const { filterByMonth, formattedMonth } = useMonth()
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
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
    color: '',
    challanNo: '',
  })

  // Remembered per-rola weight (grams)
  const [rememberedPerRola, setRememberedPerRola] = useState<string>(() => {
    return String(getGlobalSettings().defaultRolaGrams)
  })

  const createBlankBag = (customPerRola?: string): BagItem => ({
    id: Math.random().toString(36).substring(2, 9),
    gross: '',
    rolaCount: '',
    perRolaGrams: customPerRola || rememberedPerRola || '200',
  })

  const [bags, setBags] = useState<BagItem[]>([createBlankBag()])

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [receiptsData, partiesData] = await Promise.all([
        fetchReceipts(),
        fetchParties(),
      ])
      setReceipts(receiptsData)
      setParties(partiesData)
    } catch (err) {
      console.error('Error loading receiving data:', err)
      setErrorMsg('Could not load receiving entries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredReceipts = filterByMonth(receipts)
  const monthGross = filteredReceipts.reduce((s, r) => s + (Number(r.gross_weight) || 0), 0)
  const monthNet = filteredReceipts.reduce((s, r) => s + (Number(r.net_weight) || 0), 0)
  const monthRola = filteredReceipts.reduce((s, r) => s + (Number(r.rola_count) || 0), 0)

  const handlePartyChange = (newPartyId: string) => {
    const selectedParty = parties.find((p) => p.id === newPartyId)
    const partyRola = String(resolvePartyRolaWeight(selectedParty))
    setHeader((prev) => ({ ...prev, partyId: newPartyId }))
    setRememberedPerRola(partyRola)
    setBags((prev) =>
      prev.map((b) => ({
        ...b,
        perRolaGrams: partyRola,
      }))
    )
  }

  const startAdd = () => {
    setEditingId(null)
    const firstParty = parties[0]
    const initialRola = String(resolvePartyRolaWeight(firstParty))
    setRememberedPerRola(initialRola)
    setHeader({
      partyId: firstParty?.id || '',
      date: todayStr(),
      color: '',
      challanNo: '',
    })
    setBags([createBlankBag(initialRola)])
    setIsOpen(true)
    setErrorMsg(null)
  }

  const startEdit = (r: ReceiptWithParty) => {
    setEditingId(r.id)
    setHeader({
      partyId: r.party_id || parties[0]?.id || '',
      date: r.date,
      color: r.color || '',
      challanNo: r.challan_no || '',
    })

    const rolaCnt = r.rola_count ?? 0
    const originalPerRola =
      rolaCnt > 0
        ? String(Math.round((r.tare_weight * 1000) / rolaCnt))
        : rememberedPerRola || '200'

    setBags([
      {
        id: r.id,
        gross: String(r.gross_weight),
        rolaCount: String(rolaCnt),
        perRolaGrams: originalPerRola,
      },
    ])
    setIsOpen(true)
    setErrorMsg(null)
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingId(null)
    setErrorMsg(null)
  }

  const addBag = () => {
    setBags((prev) => [...prev, createBlankBag(rememberedPerRola)])
  }

  const removeBag = (id: string) => {
    if (bags.length <= 1) return
    setBags((prev) => prev.filter((b) => b.id !== id))
  }

  const updateDefaultPerRola = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '')
    setRememberedPerRola(clean)
    try {
      if (clean) localStorage.setItem(STORAGE_KEY_PER_ROLA, clean)
    } catch {}
    setBags((prev) => prev.map((b) => ({ ...b, perRolaGrams: clean || '200' })))
  }

  const updateBag = (id: string, field: keyof BagItem, val: string) => {
    if (field === 'perRolaGrams') {
      const clean = val.replace(/[^0-9]/g, '')
      setRememberedPerRola(clean)
      try {
        if (clean) localStorage.setItem(STORAGE_KEY_PER_ROLA, clean)
      } catch {}
    }
    setBags((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    )
  }

  // Calculate tare & net for a bag
  const calcBagValues = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    // Auto handle if user typed grams as whole number (e.g. 30500 => 30.5 kg)
    if (grossKg > 500) {
      grossKg = grossKg / 1000
    }
    const rola = parseInt(b.rolaCount, 10) || 0
    const perRola = parseInt(b.perRolaGrams, 10) || 200
    const tareKg = (rola * perRola) / 1000
    const netKg = Math.max(0, grossKg - tareKg)
    return { grossKg, rola, perRola, tareKg, netKg }
  }

  const bagCalculations = bags.map((b) => ({
    bag: b,
    ...calcBagValues(b),
  }))

  const totalNet = bagCalculations.reduce((sum, b) => sum + b.netKg, 0)
  const totalRola = bagCalculations.reduce((sum, b) => sum + b.rola, 0)

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

    // Validate all bags
    for (let i = 0; i < bagCalculations.length; i++) {
      const { grossKg, tareKg } = bagCalculations[i]
      const bNum = i + 1
      if (grossKg <= 0) {
        setErrorMsg(`Bag #${bNum}: Gross weight must be greater than 0`)
        return
      }
      if (tareKg >= grossKg && grossKg > 0) {
        setErrorMsg(`Bag #${bNum}: Tare (${fmtKg(tareKg)}) cannot exceed gross weight (${fmtKg(grossKg)})`)
        return
      }
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      if (editingId) {
        // Single bag update
        const val = bagCalculations[0]
        const payload: ReceiptPayload = {
          party_id: header.partyId,
          date: header.date,
          color: header.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: val.grossKg,
          tare_weight: val.tareKg,
          rola_count: val.rola,
        }
        await updateReceipt(editingId, payload)
      } else {
        // Multi-bag batch insert
        const payloads: ReceiptPayload[] = bagCalculations.map((val) => ({
          party_id: header.partyId,
          date: header.date,
          color: header.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: val.grossKg,
          tare_weight: val.tareKg,
          rola_count: val.rola,
        }))
        await insertReceipts(payloads)
      }

      closeForm()
      await loadData()
    } catch (err: unknown) {
      console.error('Save receipt error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save receipt — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteReceipt(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete receipt error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const isSingleBag = bags.length === 1
  const firstBagCalc = bagCalculations[0] || { grossKg: 0, rola: 0, tareKg: 0, netKg: 0 }

  return (
    <div>
      <SectionHeader
        title="Raw Material Receiving"
        subtitle="Kasab received from parties — weight and challan tracking"
        action={
          !isOpen &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> New Receipt
            </Button>
          )
        }
      />

      {/* ── Month Summary KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Received Bags"
          value={filteredReceipts.length}
          sub={formattedMonth}
          loading={loading}
        />
        <KpiCard
          label="Net Kasab"
          value={fmtKg(monthNet)}
          sub={formattedMonth}
          tone="positive"
          loading={loading}
        />
        <KpiCard
          label="Gross Weight"
          value={fmtKg(monthGross)}
          sub="raw yarn + rola"
          loading={loading}
        />
        <KpiCard
          label="Rola Received"
          value={monthRola}
          sub="empty spools"
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
        <EmptyState text="Add a party first before recording receiving entries." />
      )}

      {/* ── Minimal Add / Edit Form (Image 3 layout) ──────────────── */}
      {isOpen && (
        <form
          onSubmit={submit}
          className="mb-6 p-4 rounded-lg bg-white border border-[var(--color-border)] shadow-xs"
        >
          {isSingleBag ? (
            /* ── Single Bag Mode: EXACT Image 3 Grid with Rola Wt ── */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <TextInput
                  type="date"
                  required
                  value={header.date}
                  onChange={(e) => setHeader({ ...header, date: e.target.value })}
                />
              </Field>

              <Field label="Kasab Color">
                <Select
                  value={header.color}
                  onChange={(e) => setHeader({ ...header, color: e.target.value })}
                >
                  <option value="">— None —</option>
                  {COLOR_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Gross Weight (kg) *">
                <TextInput
                  required
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="e.g. 12.500"
                  value={bags[0].gross}
                  onChange={(e) => updateBag(bags[0].id, 'gross', e.target.value)}
                />
              </Field>

              <Field label="Rola Count">
                <TextInput
                  type="number"
                  min="0"
                  placeholder="e.g. 12"
                  value={bags[0].rolaCount}
                  onChange={(e) => updateBag(bags[0].id, 'rolaCount', e.target.value)}
                />
              </Field>

              <Field label="Per Rola Weight (g)">
                <TextInput
                  type="number"
                  min="1"
                  placeholder="200"
                  value={bags[0].perRolaGrams}
                  onChange={(e) => updateBag(bags[0].id, 'perRolaGrams', e.target.value)}
                />
              </Field>

              <Field label="Challan Number">
                <TextInput
                  placeholder="e.g. CH-1042"
                  value={header.challanNo}
                  onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                />
              </Field>

              <Field label="Tare / Rola Weight (kg)">
                <div
                  className="px-3 py-2 rounded-md text-sm tabular-nums flex items-center justify-between min-h-[38px]"
                  style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink)' }}
                >
                  <span>{fmtKg(firstBagCalc.tareKg)}</span>
                  {firstBagCalc.rola > 0 && (
                    <span className="text-xs text-[var(--color-ink-soft)]">
                      ({firstBagCalc.rola} × {bags[0].perRolaGrams || 200}g)
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Net Weight">
                <div
                  className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums flex items-center min-h-[38px]"
                  style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink)' }}
                >
                  {fmtKg(firstBagCalc.netKg)}
                </div>
              </Field>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-1 border-t border-[var(--color-border-soft)] col-span-1 sm:col-span-3">
                {!editingId ? (
                  <button
                    type="button"
                    onClick={addBag}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium text-[var(--color-brass)] bg-[var(--color-paper)] border border-[var(--color-brass)]/35 hover:border-[var(--color-brass)] hover:bg-white transition-all cursor-pointer whitespace-nowrap shadow-2xs active:scale-[0.98] w-full sm:w-auto"
                  >
                    <Plus size={15} strokeWidth={2.5} /> Add Another
                  </button>
                ) : <div />}

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
                    <Check size={16} /> {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Multi-Bag Mode: Clean & Compact List with Per Rola ── */
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 pb-3 border-b border-[var(--color-border-soft)]">
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
                  <TextInput
                    type="date"
                    required
                    value={header.date}
                    onChange={(e) => setHeader({ ...header, date: e.target.value })}
                  />
                </Field>

                <Field label="Kasab Color">
                  <Select
                    value={header.color}
                    onChange={(e) => setHeader({ ...header, color: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {COLOR_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Challan Number">
                  <TextInput
                    placeholder="e.g. CH-1042"
                    value={header.challanNo}
                    onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                  />
                </Field>
              </div>

              {/* Compact Bags Rows */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--color-ink-soft)] px-1 flex-wrap gap-2">
                  <span className="font-semibold text-[var(--color-ink)]">Bag Entries ({bags.length})</span>
                  <div className="flex items-center gap-1.5 bg-[var(--color-paper)] px-2 py-1 rounded border border-[var(--color-border-soft)]">
                    <span className="text-[11px]">Default Per Rola:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="200"
                      className="w-14 px-1.5 py-0.5 rounded border bg-white text-xs tabular-nums font-semibold outline-none text-center"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
                      value={rememberedPerRola}
                      onChange={(e) => updateDefaultPerRola(e.target.value)}
                    />
                    <span className="text-[11px]">g</span>
                    {(() => {
                      const selectedP = parties.find((p) => p.id === header.partyId)
                      const isCustom = Boolean(selectedP?.default_rola_weight_g)
                      return (
                        <span
                          className={[
                            'text-[10px] px-1.5 py-0.2 rounded font-medium ml-0.5',
                            isCustom
                              ? 'bg-[var(--color-brass)]/15 text-[var(--color-brass)] font-semibold'
                              : 'text-[var(--color-ink-soft)]',
                          ].join(' ')}
                        >
                          {isCustom ? 'Party Default' : 'Global Default'}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {bagCalculations.map(({ bag: b, tareKg, netKg }, idx) => (
                  <div
                    key={b.id}
                    className="p-2.5 sm:p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border-soft)] text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5"
                  >
                    {/* Mobile Strip Top: Bag title & Results */}
                    <div className="flex items-center justify-between sm:hidden pb-1 border-b border-[var(--color-border-soft)]">
                      <span className="font-bold text-xs text-[var(--color-ink)]">
                        Bag {idx + 1}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--color-ink-soft)]">
                          Tare: <strong className="font-medium text-[var(--color-ink)]">{fmtKg(tareKg)}</strong>
                        </span>
                        <span>·</span>
                        <span className="text-[var(--color-ink)] font-semibold">
                          Net: <strong className="text-[var(--color-brass)]">{fmtKg(netKg)}</strong>
                        </span>
                        {bags.length > 1 && (
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

                      {/* Rola Input */}
                      <div className="col-span-1 sm:w-20 min-w-0">
                        <label className="block sm:hidden text-[10px] text-[var(--color-ink-soft)] mb-0.5 font-medium">
                          Rola Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Rola"
                          className="w-full px-2 py-1.5 rounded border bg-white text-xs tabular-nums outline-none"
                          style={{ borderColor: 'var(--color-border)' }}
                          value={b.rolaCount}
                          onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                        />
                      </div>

                      {/* Per Rola Input */}
                      <div className="col-span-1 sm:w-20 min-w-0">
                        <label className="block sm:hidden text-[10px] text-[var(--color-ink-soft)] mb-0.5 font-medium">
                          Per Rola (g)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="200"
                            className="w-full px-1.5 py-1.5 rounded border bg-white text-xs tabular-nums outline-none text-center"
                            style={{ borderColor: 'var(--color-border)' }}
                            value={b.perRolaGrams}
                            title="Per rola weight in grams"
                            onChange={(e) => updateBag(b.id, 'perRolaGrams', e.target.value)}
                          />
                          <span className="text-[10px] text-[var(--color-ink-soft)] hidden sm:inline">g</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Results */}
                    <div className="hidden sm:block text-right tabular-nums text-[var(--color-ink-soft)] shrink-0 w-24">
                      Tare: <strong className="font-medium text-[var(--color-ink)]">{fmtKg(tareKg)}</strong>
                    </div>

                    <div className="hidden sm:block text-right tabular-nums text-[var(--color-ink)] shrink-0 w-28 font-semibold">
                      Net: <strong className="text-[var(--color-brass)]">{fmtKg(netKg)}</strong>
                    </div>

                    {bags.length > 1 && (
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

              {/* Multi-Bag Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-border-soft)]">
                <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={addBag}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium text-[var(--color-brass)] bg-[var(--color-paper)] border border-[var(--color-brass)]/35 hover:border-[var(--color-brass)] hover:bg-white transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    <Plus size={14} strokeWidth={2.5} /> Add Another
                  </button>

                  <div className="sm:hidden text-xs text-right">
                    <span className="text-[var(--color-ink-soft)]">Total Net: </span>
                    <strong className="text-sm font-bold text-[var(--color-brass)] tabular-nums">
                      {fmtKg(totalNet)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="text-xs text-[var(--color-ink-soft)] hidden sm:inline">
                    Total Net:{' '}
                    <strong className="text-sm font-bold text-[var(--color-brass)]">
                      {fmtKg(totalNet)}
                    </strong>{' '}
                    ({bags.length} bags · {totalRola} rola)
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
                      {saving ? 'Saving…' : `Save (${bags.length} Bags)`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── Table View (Exact previous clean design) ──────────────── */}
      {filteredReceipts.length === 0 && !loading ? (
        <EmptyState text={`No receiving entries found for ${formattedMonth}.`} />
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
                  Color
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Gross (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Tare (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Net Wt (kg)
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Challan #
                </th>
                <th className="text-left px-4 py-3 font-normal text-xs sm:text-sm text-[var(--color-ink-soft)]">
                  Rola
                </th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-[#FAF8F3] transition-colors"
                  style={{ borderTop: '1px solid var(--color-border-soft)' }}
                >
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                    {fmtDate(r.date)}
                  </td>
                  <td className="px-4 py-3.5 font-bold whitespace-nowrap text-sm text-[var(--color-ink)]">
                    {r.party?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                    {r.color || '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm tabular-nums text-[var(--color-ink)]">
                    {fmtKg(r.gross_weight)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm tabular-nums text-[var(--color-ink)]">
                    {fmtKg(r.tare_weight)}
                  </td>
                  <td
                    className="px-4 py-3.5 whitespace-nowrap text-sm tabular-nums font-bold"
                    style={{ color: 'var(--color-brass)' }}
                  >
                    {fmtKg(r.net_weight)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-[var(--color-ink)]">
                    {r.challan_no || '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm tabular-nums text-[var(--color-ink)]">
                    {r.rola_count || 0}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="p-1 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
                        title="Edit receipt"
                        aria-label="Edit receipt"
                      >
                        <Pencil size={15} />
                      </button>
                      {deleting === r.id ? (
                        <ConfirmDelete
                          onConfirm={() => handleDelete(r.id)}
                          onCancel={() => setDeleting(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleting(r.id)}
                          className="p-1 text-[var(--color-due)] hover:opacity-75 cursor-pointer transition-colors"
                          title="Delete receipt"
                          aria-label="Delete receipt"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
