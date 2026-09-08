import { useState, useEffect, useCallback, Fragment } from 'react'
import { Plus, Pencil, Trash2, Check, X, Layers, AlertCircle, Sparkles } from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  insertReceipts,
  updateReceipt,
  deleteReceipt,
  type ReceiptPayload,
} from '../lib/queries'
import type { Party, ReceiptWithParty } from '../types'
import { COLOR_TYPES, fmtDate, fmtKg, kgToGrams, todayStr } from '../types'
import {
  SectionHeader,
  Button,
  Field,
  TextInput,
  Select,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'

const STORAGE_KEY_PER_ROLA = 'kasab_last_per_rola_weight'

interface BagRow {
  id: string
  grossGrams: string
  rolaCount: string
  perRolaGrams: string
}

interface BatchHeaderState {
  partyId: string
  date: string
  color: string
  challanNo: string
}

interface ChallanGroup {
  id: string
  challanNo: string | null
  partyName: string
  date: string
  color: string | null
  receipts: ReceiptWithParty[]
  totalNet: number
  totalGross: number
  totalRola: number
}

function groupReceiptsByChallan(receipts: ReceiptWithParty[]): ChallanGroup[] {
  const groups: ChallanGroup[] = []
  const map = new Map<string, ChallanGroup>()

  for (const r of receipts) {
    const challanTrimmed = r.challan_no?.trim() || null
    // Group key based on challan if present; otherwise individual/batch grouping
    const groupKey = challanTrimmed
      ? `challan_${challanTrimmed}_${r.party_id || 'unknown'}_${r.date}`
      : `no_challan_${r.id}`

    let g = map.get(groupKey)
    if (!g) {
      g = {
        id: groupKey,
        challanNo: challanTrimmed,
        partyName: r.party?.name || '—',
        date: r.date,
        color: r.color || null,
        receipts: [],
        totalNet: 0,
        totalGross: 0,
        totalRola: 0,
      }
      map.set(groupKey, g)
      groups.push(g)
    }

    g.receipts.push(r)
    g.totalNet += Number(r.net_weight) || 0
    g.totalGross += Number(r.gross_weight) || 0
    g.totalRola += Number(r.rola_count) || 0
  }

  return groups
}

export default function Receiving() {
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  // Form open state
  const [isOpen, setIsOpen] = useState(false)
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null)

  // Header & Bags state
  const [header, setHeader] = useState<BatchHeaderState>({
    partyId: '',
    date: todayStr(),
    color: '',
    challanNo: '',
  })
  const [bags, setBags] = useState<BagRow[]>([])

  // Remembered per-rola weight
  const [rememberedPerRola, setRememberedPerRola] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PER_ROLA) || '200'
    } catch {
      return '200'
    }
  })

  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const createBlankBag = (defaultPerRola: string): BagRow => ({
    id: Math.random().toString(36).substring(2, 9),
    grossGrams: '',
    rolaCount: '0',
    perRolaGrams: defaultPerRola,
  })

  const startNewBatch = (initialPartyId?: string) => {
    setEditingReceiptId(null)
    setHeader({
      partyId: initialPartyId || parties[0]?.id || '',
      date: todayStr(),
      color: '',
      challanNo: '',
    })
    setBags([createBlankBag(rememberedPerRola)])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editReceipt = (r: ReceiptWithParty) => {
    setEditingReceiptId(r.id)
    setHeader({
      partyId: r.party_id || parties[0]?.id || '',
      date: r.date,
      color: r.color || '',
      challanNo: r.challan_no || '',
    })

    // Calculate original per-rola weight for this receipt
    const rolaCnt = r.rola_count ?? 0
    const originalPerRola =
      rolaCnt > 0
        ? String(Math.round((r.tare_weight * 1000) / rolaCnt))
        : rememberedPerRola || '200'

    setBags([
      {
        id: r.id,
        grossGrams: kgToGrams(r.gross_weight),
        rolaCount: String(rolaCnt),
        perRolaGrams: originalPerRola,
      },
    ])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingReceiptId(null)
    setErrorMsg(null)
  }

  const addBagRow = () => {
    setBags((prev) => [...prev, createBlankBag(rememberedPerRola)])
  }

  const removeBagRow = (id: string) => {
    if (bags.length <= 1) return
    setBags((prev) => prev.filter((b) => b.id !== id))
  }

  const updateBagField = (
    id: string,
    field: keyof BagRow,
    value: string
  ) => {
    if (field === 'perRolaGrams') {
      const cleanVal = value.replace(/[^0-9]/g, '')
      setRememberedPerRola(cleanVal)
      try {
        if (cleanVal) localStorage.setItem(STORAGE_KEY_PER_ROLA, cleanVal)
      } catch {}
    }

    setBags((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!header.partyId) {
      setErrorMsg('Please select a party')
      return
    }

    if (!header.date) {
      setErrorMsg('Please select a receiving date')
      return
    }

    if (bags.length === 0) {
      setErrorMsg('Please add at least one bag entry')
      return
    }

    // Validate each bag
    for (let i = 0; i < bags.length; i++) {
      const b = bags[i]
      const bagNum = i + 1

      if (!b.grossGrams.trim()) {
        setErrorMsg(`Bag #${bagNum}: Gross weight is required in grams (e.g. 23535)`)
        return
      }

      const grossG = parseInt(b.grossGrams, 10)
      if (isNaN(grossG) || grossG <= 0) {
        setErrorMsg(`Bag #${bagNum}: Gross weight must be a positive number in grams (e.g. 23535)`)
        return
      }

      const rolaCnt = parseInt(b.rolaCount.trim() || '0', 10)
      if (isNaN(rolaCnt) || rolaCnt < 0) {
        setErrorMsg(`Bag #${bagNum}: Rola count must be 0 or a positive integer`)
        return
      }

      const perRolaG = parseInt(b.perRolaGrams.trim() || '0', 10)
      if (rolaCnt > 0 && (isNaN(perRolaG) || perRolaG <= 0)) {
        setErrorMsg(`Bag #${bagNum}: Per-rola weight must be a positive number in grams`)
        return
      }

      const tareG = rolaCnt * perRolaG
      if (tareG >= grossG) {
        setErrorMsg(
          `Bag #${bagNum}: Tare weight (${fmtKg(tareG / 1000)}) cannot be greater than or equal to Gross weight (${fmtKg(grossG / 1000)})`
        )
        return
      }
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      if (editingReceiptId) {
        // Single bag update
        const b = bags[0]
        const grossG = parseInt(b.grossGrams, 10)
        const rolaCnt = parseInt(b.rolaCount.trim() || '0', 10)
        const perRolaG = parseInt(b.perRolaGrams.trim() || '0', 10)
        const tareG = rolaCnt * perRolaG

        const payload: ReceiptPayload = {
          party_id: header.partyId,
          date: header.date,
          color: header.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: grossG / 1000,
          tare_weight: tareG / 1000,
          rola_count: rolaCnt,
        }

        await updateReceipt(editingReceiptId, payload)
      } else {
        // Multi-bag batch insert
        const payloads: ReceiptPayload[] = bags.map((b) => {
          const grossG = parseInt(b.grossGrams, 10)
          const rolaCnt = parseInt(b.rolaCount.trim() || '0', 10)
          const perRolaG = parseInt(b.perRolaGrams.trim() || '0', 10)
          const tareG = rolaCnt * perRolaG

          return {
            party_id: header.partyId,
            date: header.date,
            color: header.color.trim() || null,
            challan_no: header.challanNo.trim() || null,
            gross_weight: grossG / 1000,
            tare_weight: tareG / 1000,
            rola_count: rolaCnt,
          }
        })

        await insertReceipts(payloads)
      }

      closeForm()
      await loadData()
    } catch (err: unknown) {
      console.error('Save receipt error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save receiving entries — ${msg}`)
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

  // Compute batch summary totals
  const summary = bags.reduce(
    (acc, b) => {
      const grossG = parseInt(b.grossGrams, 10) || 0
      const rolaCnt = parseInt(b.rolaCount, 10) || 0
      const perRolaG = parseInt(b.perRolaGrams, 10) || 0
      const tareG = rolaCnt * perRolaG
      const netG = Math.max(0, grossG - tareG)

      acc.totalGrossG += grossG
      acc.totalRola += rolaCnt
      acc.totalTareG += tareG
      acc.totalNetG += netG
      return acc
    },
    { totalGrossG: 0, totalRola: 0, totalTareG: 0, totalNetG: 0 }
  )

  const isEditing = Boolean(editingReceiptId)
  const challanGroups = groupReceiptsByChallan(receipts)

  return (
    <div>
      <SectionHeader
        title="Raw Material Receiving"
        subtitle="Kasab received from parties — multiple bag entry, weight and challan tracking"
        action={
          !isOpen &&
          parties.length > 0 && (
            <Button onClick={() => startNewBatch()}>
              <Plus size={16} /> New Receiving Entry
            </Button>
          )
        }
      />

      {errorMsg && (
        <div
          className="rounded-lg p-3.5 mb-5 text-sm font-medium flex items-center justify-between shadow-sm"
          style={{
            background: 'var(--color-due-bg)',
            color: 'var(--color-due)',
            border: '1px solid color-mix(in srgb, var(--color-due) 30%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer text-xs ml-3 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording receiving entries." />
      )}

      {/* ── Multi-Bag Form Modal / Panel ─────────────────────────── */}
      {isOpen && (
        <form
          onSubmit={submit}
          className="mb-8 p-4 sm:p-6 rounded-xl shadow-sm"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header Row: Title & Mode */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border-soft)]">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: 'var(--color-brass)' }}
              >
                <Layers size={16} />
              </span>
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
                  {isEditing ? 'Edit Receiving Entry' : 'New Multi-Bag Receiving Entry'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  {isEditing
                    ? 'Update weight and details for this individual bag record'
                    : 'Enter common details once, then add one or multiple bags'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
              disabled={saving}
              className="px-2 py-1 text-xs"
            >
              <X size={15} /> Close
            </Button>
          </div>

          {/* Common Batch Details Header */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg mb-6"
            style={{ background: 'var(--color-paper)', border: '1px solid var(--color-border-soft)' }}
          >
            <Field label="Party *">
              <Select
                required
                value={header.partyId}
                onChange={(e) => setHeader({ ...header, partyId: e.target.value })}
              >
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Receiving Date *">
              <TextInput
                type="date"
                required
                value={header.date}
                onChange={(e) => setHeader({ ...header, date: e.target.value })}
              />
            </Field>

            <Field label="Kasab Color (Optional)">
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

            <Field label="Challan Number (Optional)">
              <TextInput
                placeholder="e.g. CH-1042"
                value={header.challanNo}
                onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
              />
            </Field>
          </div>

          {/* Bags List Section */}
          <div className="mb-6">
            <div className="mb-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink)' }}>
                Bag Entries ({bags.length})
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                Gross weight in grams (e.g. 23535 = 23.535 kg) — Tare and Net calculate automatically
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {bags.map((b, index) => {
                const grossG = parseInt(b.grossGrams, 10) || 0
                const rolaCnt = parseInt(b.rolaCount, 10) || 0
                const perRolaG = parseInt(b.perRolaGrams, 10) || 0
                const tareG = rolaCnt * perRolaG
                const netG = Math.max(0, grossG - tareG)

                const hasGross = Boolean(b.grossGrams.trim() && grossG > 0)
                const isTareInvalid = hasGross && tareG >= grossG

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl transition-all"
                    style={{
                      background: '#ffffff',
                      border: isTareInvalid
                        ? '1.5px solid var(--color-due)'
                        : '1px solid var(--color-border)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Bag Card Top Bar */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border-soft)]">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide"
                          style={{
                            background: 'var(--color-border-soft)',
                            color: 'var(--color-ink)',
                          }}
                        >
                          Bag {index + 1}
                        </span>
                        {hasGross && (
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-brass)' }}>
                            Net: {fmtKg(netG / 1000)}
                          </span>
                        )}
                      </div>

                      {!isEditing && bags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBagRow(b.id)}
                          className="text-xs font-medium inline-flex items-center gap-1 p-1 rounded cursor-pointer transition-colors"
                          style={{ color: 'var(--color-due)' }}
                          title="Remove Bag"
                        >
                          <Trash2 size={13} /> Remove Bag
                        </button>
                      )}
                    </div>

                    {/* Inputs & Calculations Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
                      {/* 1. Gross Weight Input (grams) */}
                      <Field label="Gross Weight (grams) *">
                        <TextInput
                          required
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="1"
                          placeholder="e.g. 23535"
                          value={b.grossGrams}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            updateBagField(b.id, 'grossGrams', val)
                          }}
                        />
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span style={{ color: 'var(--color-ink-soft)' }}>Enter in grams</span>
                          {hasGross && (
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: 'var(--color-brass)' }}
                            >
                              = {fmtKg(grossG / 1000)}
                            </span>
                          )}
                        </div>
                      </Field>

                      {/* 2. Rola Count Input */}
                      <Field label="Rola Count">
                        <TextInput
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          placeholder="e.g. 60"
                          value={b.rolaCount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            updateBagField(b.id, 'rolaCount', val)
                          }}
                        />
                        <span className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                          Total pieces
                        </span>
                      </Field>

                      {/* 3. Per Rola Weight Input */}
                      <Field label="Per Rola Weight (g)">
                        <TextInput
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="1"
                          placeholder="e.g. 200"
                          value={b.perRolaGrams}
                          onChange={(e) =>
                            updateBagField(b.id, 'perRolaGrams', e.target.value)
                          }
                        />
                        <div className="flex items-center justify-between text-xs mt-0.5">
                          <span style={{ color: 'var(--color-ink-soft)' }}>Grams per rola</span>
                          <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                            (default {rememberedPerRola}g)
                          </span>
                        </div>
                      </Field>

                      {/* 4. Calculated Tare Weight */}
                      <Field label="Tare Weight (calculated)">
                        <div
                          className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums flex items-center justify-between min-h-[38px]"
                          style={{
                            background: isTareInvalid
                              ? 'var(--color-due-bg)'
                              : 'var(--color-paper)',
                            border: `1px solid ${
                              isTareInvalid ? 'var(--color-due)' : 'var(--color-border)'
                            }`,
                            color: isTareInvalid
                              ? 'var(--color-due)'
                              : 'var(--color-ink)',
                          }}
                        >
                          <span>{fmtKg(tareG / 1000)}</span>
                          <span
                            className="text-xs font-normal"
                            style={{
                              color: isTareInvalid
                                ? 'var(--color-due)'
                                : 'var(--color-ink-soft)',
                            }}
                          >
                            {tareG.toLocaleString('en-IN')} g
                          </span>
                        </div>
                        <span
                          className="text-[11px] mt-0.5 block"
                          style={{
                            color: isTareInvalid ? 'var(--color-due)' : 'var(--color-ink-soft)',
                          }}
                        >
                          {isTareInvalid
                            ? 'Tare exceeds Gross weight!'
                            : 'Rola Count × Per Rola'}
                        </span>
                      </Field>

                      {/* 5. Calculated Net Weight */}
                      <Field label="Net Weight (calculated)">
                        <div
                          className="px-3 py-2 rounded-md text-sm font-bold tabular-nums flex items-center justify-between min-h-[38px]"
                          style={{
                            background: isTareInvalid
                              ? 'var(--color-due-bg)'
                              : hasGross
                              ? 'var(--color-border-soft)'
                              : 'var(--color-paper)',
                            border: `1px solid ${
                              isTareInvalid ? 'var(--color-due)' : 'var(--color-border)'
                            }`,
                            color: isTareInvalid
                              ? 'var(--color-due)'
                              : hasGross
                              ? 'var(--color-brass)'
                              : 'var(--color-ink-soft)',
                          }}
                        >
                          <span>{hasGross ? fmtKg(netG / 1000) : '—'}</span>
                          {hasGross && (
                            <span
                              className="text-xs font-normal"
                              style={{ color: 'var(--color-ink-soft)' }}
                            >
                              {netG.toLocaleString('en-IN')} g
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                          Gross − Tare
                        </span>
                      </Field>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ONLY ONE Add Button: at the bottom of the bag list */}
            {!isEditing && (
              <div className="mt-3.5">
                <button
                  type="button"
                  onClick={addBagRow}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#fbf9f4] transition-colors"
                  style={{
                    borderColor: 'var(--color-brass)',
                    color: 'var(--color-brass)',
                    background: 'transparent',
                  }}
                >
                  <Plus size={16} /> Add Another Bag
                </button>
              </div>
            )}
          </div>

          {/* Batch Summary Box */}
          <div
            className="p-4 sm:p-5 rounded-xl mb-6 flex flex-col gap-3"
            style={{
              background: 'linear-gradient(135deg, #fbf9f5 0%, #f4eee1 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-brass)' }}>
                <Sparkles size={14} /> {isEditing ? 'Record Summary' : 'Batch Summary'}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                Kasab: {header.color || '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="flex flex-col">
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Total Bags
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {bags.length}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Total Gross
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {fmtKg(summary.totalGrossG / 1000)}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                  ({summary.totalGrossG.toLocaleString('en-IN')} g)
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Total Rola
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {summary.totalRola}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Total Tare
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                  {fmtKg(summary.totalTareG / 1000)}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                  ({summary.totalTareG.toLocaleString('en-IN')} g)
                </span>
              </div>

              <div className="flex flex-col col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-brass)' }}>
                  Total Net
                </span>
                <span
                  className="text-xl font-extrabold tabular-nums"
                  style={{ color: 'var(--color-brass)' }}
                >
                  {fmtKg(summary.totalNetG / 1000)}
                </span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-brass)' }}>
                  ({summary.totalNetG.toLocaleString('en-IN')} g)
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 font-semibold text-sm shadow-sm"
            >
              <Check size={16} />{' '}
              {saving
                ? 'Saving…'
                : isEditing
                ? 'Update Receipt'
                : bags.length > 1
                ? `Save All Entries (${bags.length} Bags)`
                : 'Save Entry'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
              disabled={saving}
              className="py-2.5 px-4 text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Challan-Grouped Table View ─────────────────────────────── */}
      {receipts.length === 0 && !loading ? (
        <EmptyState text="No receiving entries yet." />
      ) : (
        <div
          className="overflow-x-auto rounded-lg bg-white shadow-sm"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--color-border-soft)' }}>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Bag #
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Date
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Party
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Color
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Gross (kg)
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Tare (kg)
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Net Wt (kg)
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Challan #
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Rola
                </th>
                <th
                  className="text-right px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {challanGroups.map((group, groupIdx) => {
                // Alternating visual treatment per CHALLAN GROUP
                const groupBg = groupIdx % 2 === 0 ? '#ffffff' : '#fcfbf7'

                return (
                  <Fragment key={group.id}>
                    {/* Group Subheader Strip (Shows when Challan exists or multiple bags in batch) */}
                    <tr
                      style={{
                        background:
                          groupIdx % 2 === 0
                            ? 'rgba(0,0,0,0.015)'
                            : 'rgba(197, 160, 89, 0.06)',
                        borderTop: groupIdx > 0 ? '2px solid var(--color-border)' : 'none',
                        borderBottom: '1px solid var(--color-border-soft)',
                      }}
                    >
                      <td colSpan={10} className="px-3 py-1.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {group.challanNo ? (
                              <span
                                className="px-2 py-0.5 rounded font-bold text-xs tracking-wide"
                                style={{
                                  background: 'var(--color-border-soft)',
                                  color: 'var(--color-ink)',
                                }}
                              >
                                Challan #{group.challanNo}
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded text-[11px] font-medium"
                                style={{
                                  background: 'var(--color-paper)',
                                  color: 'var(--color-ink-soft)',
                                }}
                              >
                                Challan: —
                              </span>
                            )}
                            <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                              {group.partyName}
                            </span>
                            <span style={{ color: 'var(--color-ink-soft)' }}>
                              • {fmtDate(group.date)}
                            </span>
                            <span style={{ color: 'var(--color-ink-soft)' }}>
                              • {group.receipts.length} {group.receipts.length === 1 ? 'Bag' : 'Bags'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                            <span>
                              Batch Net:{' '}
                              <strong className="font-bold" style={{ color: 'var(--color-brass)' }}>
                                {fmtKg(group.totalNet)}
                              </strong>
                            </span>
                            <span>
                              Total Rola:{' '}
                              <strong className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                                {group.totalRola}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Individual Bag Rows belonging to this group */}
                    {group.receipts.map((r, bagIdx) => (
                      <tr
                        key={r.id}
                        style={{
                          background: groupBg,
                          borderTop: bagIdx > 0 ? '1px solid var(--color-border-soft)' : 'none',
                        }}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: 'var(--color-border-soft)',
                              color: 'var(--color-ink)',
                            }}
                          >
                            Bag {bagIdx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap">
                          {r.party?.name ?? '—'}
                        </td>
                        <td className="px-3 py-2">{r.color || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtKg(r.gross_weight)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtKg(r.tare_weight)}</td>
                        <td
                          className="px-3 py-2 tabular-nums font-semibold"
                          style={{ color: 'var(--color-brass)' }}
                        >
                          {fmtKg(r.net_weight)}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.challan_no || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{r.rola_count || 0}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => editReceipt(r)}
                            className="p-1 cursor-pointer hover:opacity-75 transition-opacity"
                            style={{ color: 'var(--color-ink-soft)' }}
                            title="Edit bag entry"
                            aria-label="Edit bag entry"
                          >
                            <Pencil size={14} />
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
                              className="p-1 cursor-pointer hover:opacity-75 transition-opacity"
                              style={{ color: 'var(--color-due)' }}
                              title="Delete bag entry"
                              aria-label="Delete bag entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
