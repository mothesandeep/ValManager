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
  touched?: {
    gross?: boolean
    rola?: boolean
    perRola?: boolean
  }
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

interface BagValidationResult {
  grossError: string | null
  rolaError: string | null
  perRolaError: string | null
  tareError: string | null
  isValid: boolean
  grossG: number
  rolaCnt: number
  perRolaG: number
  tareG: number
  netG: number
}

function validateBag(bag: BagRow): BagValidationResult {
  let grossError: string | null = null
  let rolaError: string | null = null
  let perRolaError: string | null = null
  let tareError: string | null = null

  // 1. Gross Weight validation
  if (!bag.grossGrams.trim()) {
    grossError = 'Gross weight is required'
  } else {
    const g = parseInt(bag.grossGrams, 10)
    if (isNaN(g) || g <= 0) {
      grossError = 'Gross weight must be greater than 0'
    }
  }

  // 2. Rola Count validation
  if (!bag.rolaCount.trim()) {
    rolaError = 'Rola count is required'
  } else {
    const r = parseInt(bag.rolaCount, 10)
    if (isNaN(r) || r < 0) {
      rolaError = 'Rola count cannot be negative'
    }
  }

  // 3. Per Rola Weight validation
  const rCount = parseInt(bag.rolaCount.trim() || '0', 10)
  if (bag.perRolaGrams.trim()) {
    const pr = parseInt(bag.perRolaGrams, 10)
    if (isNaN(pr) || pr <= 0) {
      perRolaError = 'Per rola weight must be greater than 0'
    }
  } else if (!isNaN(rCount) && rCount > 0) {
    perRolaError = 'Per rola weight is required'
  }

  const grossG = parseInt(bag.grossGrams, 10) || 0
  const rolaCnt = isNaN(rCount) ? 0 : rCount
  const perRolaG = parseInt(bag.perRolaGrams.trim() || '0', 10) || 0
  const tareG = rolaCnt * perRolaG
  const netG = Math.max(0, grossG - tareG)

  // 4. Tare vs Gross validation
  if (!grossError && !rolaError && !perRolaError && grossG > 0) {
    if (tareG >= grossG) {
      tareError = `Tare (${fmtKg(tareG / 1000)}) cannot exceed gross weight (${fmtKg(grossG / 1000)})`
    }
  }

  const isValid = !grossError && !rolaError && !perRolaError && !tareError

  return {
    grossError,
    rolaError,
    perRolaError,
    tareError,
    isValid,
    grossG,
    rolaCnt,
    perRolaG,
    tareG,
    netG,
  }
}

function groupReceiptsByChallan(receipts: ReceiptWithParty[]): ChallanGroup[] {
  const groups: ChallanGroup[] = []
  const map = new Map<string, ChallanGroup>()

  for (const r of receipts) {
    const challanTrimmed = r.challan_no?.trim() || null
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
  const [submitAttempted, setSubmitAttempted] = useState(false)

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
    rolaCount: '',
    perRolaGrams: defaultPerRola,
    touched: {
      gross: false,
      rola: false,
      perRola: false,
    },
  })

  const startNewBatch = (initialPartyId?: string) => {
    setEditingReceiptId(null)
    setSubmitAttempted(false)
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
    setSubmitAttempted(false)
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
        touched: {
          gross: true,
          rola: true,
          perRola: true,
        },
      },
    ])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingReceiptId(null)
    setSubmitAttempted(false)
    setErrorMsg(null)
  }

  const addBagRow = () => {
    setBags((prev) => [...prev, createBlankBag(rememberedPerRola)])
  }

  const removeBagRow = (id: string) => {
    if (bags.length <= 1) return
    setBags((prev) => prev.filter((b) => b.id !== id))
  }

  const markTouched = (id: string, field: 'gross' | 'rola' | 'perRola') => {
    setBags((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, touched: { ...b.touched, [field]: true } } : b
      )
    )
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

  // Pre-calculate validations for all active bags
  const bagValidations = bags.map((b) => ({
    bag: b,
    validation: validateBag(b),
  }))

  const allBagsValid =
    bags.length > 0 && bagValidations.every((bv) => bv.validation.isValid)
  const isHeaderValid = Boolean(header.partyId && header.date)
  const canSave = allBagsValid && isHeaderValid && !saving

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

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

    // Check if any bag is invalid
    for (let i = 0; i < bagValidations.length; i++) {
      const { validation } = bagValidations[i]
      const bagNum = i + 1

      if (validation.grossError) {
        setErrorMsg(`Bag #${bagNum}: ${validation.grossError}`)
        return
      }
      if (validation.rolaError) {
        setErrorMsg(`Bag #${bagNum}: ${validation.rolaError}`)
        return
      }
      if (validation.perRolaError) {
        setErrorMsg(`Bag #${bagNum}: ${validation.perRolaError}`)
        return
      }
      if (validation.tareError) {
        setErrorMsg(`Bag #${bagNum}: ${validation.tareError}`)
        return
      }
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      if (editingReceiptId) {
        // Single bag update
        const val = bagValidations[0].validation
        const payload: ReceiptPayload = {
          party_id: header.partyId,
          date: header.date,
          color: header.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: val.grossG / 1000,
          tare_weight: val.tareG / 1000,
          rola_count: val.rolaCnt,
        }

        await updateReceipt(editingReceiptId, payload)
      } else {
        // Multi-bag batch insert
        const payloads: ReceiptPayload[] = bagValidations.map(({ validation }) => ({
          party_id: header.partyId,
          date: header.date,
          color: header.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: validation.grossG / 1000,
          tare_weight: validation.tareG / 1000,
          rola_count: validation.rolaCnt,
        }))

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
  const summary = bagValidations.reduce(
    (acc, { validation }) => {
      acc.totalGrossG += validation.grossG
      acc.totalRola += validation.rolaCnt
      acc.totalTareG += validation.tareG
      acc.totalNetG += validation.netG
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
          noValidate
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
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink)' }}>
                  Bag Entries ({bags.length})
                </h4>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Gross weight (g) & Rola count are required for each bag.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              {bagValidations.map(({ bag: b, validation }, index) => {
                const showGrossError =
                  Boolean(validation.grossError) &&
                  (b.touched?.gross || submitAttempted)
                const showRolaError =
                  Boolean(validation.rolaError) &&
                  (b.touched?.rola || submitAttempted)
                const showPerRolaError =
                  Boolean(validation.perRolaError) &&
                  (b.touched?.perRola || submitAttempted)
                const isTareInvalid = Boolean(validation.tareError)

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl transition-all"
                    style={{
                      background: '#ffffff',
                      border:
                        validation.isValid
                          ? '1px solid var(--color-border)'
                          : showGrossError || showRolaError || showPerRolaError || isTareInvalid
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

                        {/* Subtle Status Badge */}
                        {validation.isValid ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                            style={{
                              background: 'var(--color-positive-bg)',
                              color: 'var(--color-positive)',
                            }}
                          >
                            <Check size={12} strokeWidth={2.5} /> Complete
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                            style={{
                              background: 'var(--color-due-bg)',
                              color: 'var(--color-due)',
                            }}
                          >
                            <AlertCircle size={12} /> Incomplete
                          </span>
                        )}

                        {validation.isValid && (
                          <span className="text-xs font-semibold ml-1" style={{ color: 'var(--color-brass)' }}>
                            Net: {fmtKg(validation.netG / 1000)}
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
                          style={{
                            borderColor: showGrossError ? 'var(--color-due)' : undefined,
                          }}
                          onBlur={() => markTouched(b.id, 'gross')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            updateBagField(b.id, 'grossGrams', val)
                          }}
                        />
                        {showGrossError ? (
                          <span
                            className="text-xs font-medium mt-1 flex items-center gap-1"
                            style={{ color: 'var(--color-due)' }}
                          >
                            <AlertCircle size={11} className="shrink-0" />
                            {validation.grossError}
                          </span>
                        ) : (
                          <div className="flex items-center justify-between text-xs mt-0.5">
                            <span style={{ color: 'var(--color-ink-soft)' }}>Enter in grams</span>
                            {validation.grossG > 0 && (
                              <span
                                className="font-bold tabular-nums"
                                style={{ color: 'var(--color-brass)' }}
                              >
                                = {fmtKg(validation.grossG / 1000)}
                              </span>
                            )}
                          </div>
                        )}
                      </Field>

                      {/* 2. Rola Count Input */}
                      <Field label="Rola Count *">
                        <TextInput
                          required
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          placeholder="e.g. 60"
                          value={b.rolaCount}
                          style={{
                            borderColor: showRolaError ? 'var(--color-due)' : undefined,
                          }}
                          onBlur={() => markTouched(b.id, 'rola')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            updateBagField(b.id, 'rolaCount', val)
                          }}
                        />
                        {showRolaError ? (
                          <span
                            className="text-xs font-medium mt-1 flex items-center gap-1"
                            style={{ color: 'var(--color-due)' }}
                          >
                            <AlertCircle size={11} className="shrink-0" />
                            {validation.rolaError}
                          </span>
                        ) : (
                          <span className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                            Total pieces in bag
                          </span>
                        )}
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
                          style={{
                            borderColor: showPerRolaError ? 'var(--color-due)' : undefined,
                          }}
                          onBlur={() => markTouched(b.id, 'perRola')}
                          onChange={(e) =>
                            updateBagField(b.id, 'perRolaGrams', e.target.value)
                          }
                        />
                        {showPerRolaError ? (
                          <span
                            className="text-xs font-medium mt-1 flex items-center gap-1"
                            style={{ color: 'var(--color-due)' }}
                          >
                            <AlertCircle size={11} className="shrink-0" />
                            {validation.perRolaError}
                          </span>
                        ) : (
                          <div className="flex items-center justify-between text-xs mt-0.5">
                            <span style={{ color: 'var(--color-ink-soft)' }}>Grams per rola</span>
                            <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                              (default {rememberedPerRola}g)
                            </span>
                          </div>
                        )}
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
                          <span>{fmtKg(validation.tareG / 1000)}</span>
                          <span
                            className="text-xs font-normal"
                            style={{
                              color: isTareInvalid
                                ? 'var(--color-due)'
                                : 'var(--color-ink-soft)',
                            }}
                          >
                            {validation.tareG.toLocaleString('en-IN')} g
                          </span>
                        </div>
                        <span
                          className="text-[11px] mt-0.5 block"
                          style={{
                            color: isTareInvalid ? 'var(--color-due)' : 'var(--color-ink-soft)',
                          }}
                        >
                          {isTareInvalid
                            ? validation.tareError
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
                              : validation.grossG > 0
                              ? 'var(--color-border-soft)'
                              : 'var(--color-paper)',
                            border: `1px solid ${
                              isTareInvalid ? 'var(--color-due)' : 'var(--color-border)'
                            }`,
                            color: isTareInvalid
                              ? 'var(--color-due)'
                              : validation.grossG > 0
                              ? 'var(--color-brass)'
                              : 'var(--color-ink-soft)',
                          }}
                        >
                          <span>{validation.grossG > 0 ? fmtKg(validation.netG / 1000) : '—'}</span>
                          {validation.grossG > 0 && (
                            <span
                              className="text-xs font-normal"
                              style={{ color: 'var(--color-ink-soft)' }}
                            >
                              {validation.netG.toLocaleString('en-IN')} g
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
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="submit"
              disabled={!canSave}
              className="py-2.5 px-5 font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

            {!allBagsValid && (
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-due)' }}>
                <AlertCircle size={13} className="shrink-0" />
                Fill all required fields in each bag to enable save
              </span>
            )}
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
