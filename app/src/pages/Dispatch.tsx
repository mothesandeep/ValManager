import { useState, useEffect, useCallback, Fragment } from 'react'
import { Plus, Pencil, Trash2, Check, X, Layers, AlertCircle, Sparkles } from 'lucide-react'
import {
  fetchParties,
  fetchDispatches,
  insertDispatches,
  updateDispatch,
  deleteDispatch,
  type DispatchPayload,
} from '../lib/queries'
import type { Party, DispatchWithParty } from '../types'
import { fmtDate, fmtKg, fmtMoney, kgToGrams, todayStr } from '../types'
import {
  SectionHeader,
  Button,
  Field,
  TextInput,
  Select,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'

const STORAGE_KEY_BUNGARI_WEIGHT = 'kasab_last_bungari_weight'

type DispatchType = 'Val' | 'Kali'

interface DispatchHeaderState {
  partyId: string
  date: string
  dispatchType: DispatchType
  challanNo: string
  ratePerKg: string // Required for Val
}

interface DispatchBagRow {
  id: string
  grossGrams: string // Bore Gross for Val, Gross Weight for Kali
  bungariCount: string // For Val
  bungariWeightGrams: string // For Val, default 70g
  rolaCount: string // For Kali
  touched?: {
    gross?: boolean
    bungariCount?: boolean
    bungariWeight?: boolean
    rolaCount?: boolean
  }
}

interface BagValidationResult {
  grossError: string | null
  bungariError: string | null
  bungariWeightError: string | null
  rolaError: string | null
  tareError: string | null
  isValid: boolean
  grossG: number
  bungariCount: number
  bungariWeightG: number
  bungariTareG: number
  netValG: number
  amount: number | null
  rolaCount: number
}

function sanitizeNumberString(str: string): string {
  const clean = str.replace(/[^0-9]/g, '')
  if (!clean) return ''
  // Remove leading zeros but keep single '0'
  return String(parseInt(clean, 10))
}

function validateBag(
  bag: DispatchBagRow,
  dispatchType: DispatchType,
  rateStr: string
): BagValidationResult {
  let grossError: string | null = null
  let bungariError: string | null = null
  let bungariWeightError: string | null = null
  let rolaError: string | null = null
  let tareError: string | null = null

  // 1. Gross Weight validation (Both Val & Kali)
  if (!bag.grossGrams.trim()) {
    grossError = 'Gross weight is required'
  } else {
    const g = parseInt(bag.grossGrams, 10)
    if (isNaN(g) || g <= 0) {
      grossError = 'Gross weight must be greater than 0'
    }
  }

  const grossG = parseInt(bag.grossGrams, 10) || 0

  if (dispatchType === 'Val') {
    // 2. Bungari Count validation (Val)
    if (!bag.bungariCount.trim()) {
      bungariError = 'Bungari count is required'
    } else {
      const b = parseInt(bag.bungariCount, 10)
      if (isNaN(b) || b < 0) {
        bungariError = 'Bungari count cannot be negative'
      }
    }

    // 3. Bungari Weight per piece (Val)
    const bCount = parseInt(bag.bungariCount.trim() || '0', 10)
    if (bag.bungariWeightGrams.trim()) {
      const bw = parseInt(bag.bungariWeightGrams, 10)
      if (isNaN(bw) || bw <= 0) {
        bungariWeightError = 'Bungari weight must be greater than 0'
      }
    } else if (!isNaN(bCount) && bCount > 0) {
      bungariWeightError = 'Bungari weight is required'
    }

    const bungariCnt = isNaN(bCount) ? 0 : bCount
    const bungariWtG = parseInt(bag.bungariWeightGrams.trim() || '70', 10) || 70
    const bungariTareG = bungariCnt * bungariWtG
    const netValG = Math.max(0, grossG - bungariTareG)

    // Tare vs Gross validation
    if (!grossError && !bungariError && !bungariWeightError && grossG > 0) {
      if (bungariTareG >= grossG) {
        tareError = 'Bungari weight cannot exceed gross weight'
      }
    }

    // Rate & Amount calculation
    const rate = parseFloat(rateStr)
    const amount =
      !isNaN(rate) && rate > 0
        ? Math.round((netValG / 1000) * rate * 100) / 100
        : null

    const isValid =
      !grossError &&
      !bungariError &&
      !bungariWeightError &&
      !tareError &&
      !isNaN(rate) &&
      rate > 0

    return {
      grossError,
      bungariError,
      bungariWeightError,
      rolaError: null,
      tareError,
      isValid,
      grossG,
      bungariCount: bungariCnt,
      bungariWeightG: bungariWtG,
      bungariTareG,
      netValG,
      amount,
      rolaCount: 0,
    }
  } else {
    // Kali Validation
    if (!bag.rolaCount.trim()) {
      rolaError = 'Rola count is required'
    } else {
      const r = parseInt(bag.rolaCount, 10)
      if (isNaN(r) || r < 0) {
        rolaError = 'Rola count cannot be negative'
      }
    }

    const rCount = parseInt(bag.rolaCount.trim() || '0', 10)
    const rolaCnt = isNaN(rCount) ? 0 : rCount

    const isValid = !grossError && !rolaError

    return {
      grossError,
      bungariError: null,
      bungariWeightError: null,
      rolaError,
      tareError: null,
      isValid,
      grossG,
      bungariCount: 0,
      bungariWeightG: 0,
      bungariTareG: 0,
      netValG: grossG, // Gross is canonical weight for Kali
      amount: null,
      rolaCount: rolaCnt,
    }
  }
}

interface ChallanGroup {
  id: string
  challanNo: string | null
  partyName: string
  date: string
  dispatchType: string
  dispatches: DispatchWithParty[]
  totalGross: number
  totalNetVal: number
  totalAmount: number
  totalBungari: number
  totalRola: number
}

function groupDispatchesByChallan(dispatches: DispatchWithParty[]): ChallanGroup[] {
  const groups: ChallanGroup[] = []
  const map = new Map<string, ChallanGroup>()

  for (const d of dispatches) {
    const challanTrimmed = d.challan_no?.trim() || null
    const groupKey = challanTrimmed
      ? `challan_${challanTrimmed}_${d.party_id || 'unknown'}_${d.date}`
      : `no_challan_${d.id}`

    let g = map.get(groupKey)
    if (!g) {
      g = {
        id: groupKey,
        challanNo: challanTrimmed,
        partyName: d.party?.name || '—',
        date: d.date,
        dispatchType: d.dispatch_type || 'Val',
        dispatches: [],
        totalGross: 0,
        totalNetVal: 0,
        totalAmount: 0,
        totalBungari: 0,
        totalRola: 0,
      }
      map.set(groupKey, g)
      groups.push(g)
    }

    g.dispatches.push(d)
    g.totalGross += Number(d.bore_gross_weight) || 0
    g.totalNetVal += Number(d.net_val_weight) || 0
    g.totalAmount += Number(d.amount) || 0
    g.totalBungari += Number(d.bungari_count) || 0
    g.totalRola += Number(d.rola_count) || 0
  }

  return groups
}

export default function Dispatch() {
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  // Form open state
  const [isOpen, setIsOpen] = useState(false)
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Header & Bags state
  const [header, setHeader] = useState<DispatchHeaderState>({
    partyId: '',
    date: todayStr(),
    dispatchType: 'Val',
    challanNo: '',
    ratePerKg: '',
  })
  const [bags, setBags] = useState<DispatchBagRow[]>([])

  // Remembered Bungari weight per piece (default 70g)
  const [rememberedBungariWeight, setRememberedBungariWeight] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_BUNGARI_WEIGHT) || '70'
    } catch {
      return '70'
    }
  })

  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      setErrorMsg('Could not load dispatches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createBlankBag = (defaultBungariWeight: string): DispatchBagRow => ({
    id: Math.random().toString(36).substring(2, 9),
    grossGrams: '',
    bungariCount: '',
    bungariWeightGrams: defaultBungariWeight,
    rolaCount: '',
    touched: {
      gross: false,
      bungariCount: false,
      bungariWeight: false,
      rolaCount: false,
    },
  })

  const startNewBatch = (initialPartyId?: string) => {
    setEditingDispatchId(null)
    setSubmitAttempted(false)
    setHeader({
      partyId: initialPartyId || parties[0]?.id || '',
      date: todayStr(),
      dispatchType: 'Val',
      challanNo: '',
      ratePerKg: '',
    })
    setBags([createBlankBag(rememberedBungariWeight)])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editDispatch = (d: DispatchWithParty) => {
    setEditingDispatchId(d.id)
    setSubmitAttempted(false)

    const type = (d.dispatch_type as DispatchType) || 'Val'
    setHeader({
      partyId: d.party_id || parties[0]?.id || '',
      date: d.date,
      dispatchType: type,
      challanNo: d.challan_no || '',
      ratePerKg: d.rate_per_kg !== null && d.rate_per_kg !== undefined ? String(d.rate_per_kg) : '',
    })

    // Calculate historical bungari weight per piece if available
    const bCount = d.bungari_count ?? 0
    let histBungariWeight = '70'
    if (d.bungari_weight_g) {
      histBungariWeight = String(d.bungari_weight_g)
    } else if (bCount > 0 && d.net_val_weight !== null) {
      histBungariWeight = String(
        Math.round(((d.bore_gross_weight - d.net_val_weight) * 1000) / bCount)
      )
    }

    setBags([
      {
        id: d.id,
        grossGrams: kgToGrams(d.bore_gross_weight),
        bungariCount: String(bCount),
        bungariWeightGrams: histBungariWeight,
        rolaCount: String(d.rola_count ?? 0),
        touched: {
          gross: true,
          bungariCount: true,
          bungariWeight: true,
          rolaCount: true,
        },
      },
    ])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingDispatchId(null)
    setSubmitAttempted(false)
    setErrorMsg(null)
  }

  const addBagRow = () => {
    setBags((prev) => [...prev, createBlankBag(rememberedBungariWeight)])
  }

  const removeBagRow = (id: string) => {
    if (bags.length <= 1) return
    setBags((prev) => prev.filter((b) => b.id !== id))
  }

  const markTouched = (
    id: string,
    field: 'gross' | 'bungariCount' | 'bungariWeight' | 'rolaCount'
  ) => {
    setBags((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, touched: { ...b.touched, [field]: true } } : b
      )
    )
  }

  const updateBagField = (
    id: string,
    field: keyof DispatchBagRow,
    value: string
  ) => {
    if (field === 'bungariWeightGrams') {
      const cleanVal = value.replace(/[^0-9]/g, '')
      setRememberedBungariWeight(cleanVal)
      try {
        if (cleanVal) localStorage.setItem(STORAGE_KEY_BUNGARI_WEIGHT, cleanVal)
      } catch {}
    }

    setBags((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    )
  }

  // Pre-calculate validations for all active bags
  const bagValidations = bags.map((b) => ({
    bag: b,
    validation: validateBag(b, header.dispatchType, header.ratePerKg),
  }))

  const allBagsValid =
    bags.length > 0 && bagValidations.every((bv) => bv.validation.isValid)
  const isRateValid =
    header.dispatchType === 'Kali' ||
    Boolean(header.ratePerKg.trim() && parseFloat(header.ratePerKg) > 0)
  const isHeaderValid = Boolean(header.partyId && header.date && isRateValid)
  const canSave = allBagsValid && isHeaderValid && !saving

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    if (!header.partyId) {
      setErrorMsg('Please select a party')
      return
    }

    if (!header.date) {
      setErrorMsg('Please select a dispatch date')
      return
    }

    if (header.dispatchType === 'Val' && (!header.ratePerKg.trim() || parseFloat(header.ratePerKg) <= 0)) {
      setErrorMsg('Rate is required for Val dispatch')
      return
    }

    if (bags.length === 0) {
      setErrorMsg('Please add at least one bag entry')
      return
    }

    // Validate each bag
    for (let i = 0; i < bagValidations.length; i++) {
      const { validation } = bagValidations[i]
      const bagNum = i + 1

      if (validation.grossError) {
        setErrorMsg(`Bag #${bagNum}: ${validation.grossError}`)
        return
      }
      if (header.dispatchType === 'Val') {
        if (validation.bungariError) {
          setErrorMsg(`Bag #${bagNum}: ${validation.bungariError}`)
          return
        }
        if (validation.bungariWeightError) {
          setErrorMsg(`Bag #${bagNum}: ${validation.bungariWeightError}`)
          return
        }
        if (validation.tareError) {
          setErrorMsg(`Bag #${bagNum}: ${validation.tareError}`)
          return
        }
      } else {
        if (validation.rolaError) {
          setErrorMsg(`Bag #${bagNum}: ${validation.rolaError}`)
          return
        }
      }
    }

    setSaving(true)
    setErrorMsg(null)

    const rateVal =
      header.dispatchType === 'Val' ? parseFloat(header.ratePerKg) : null

    try {
      if (editingDispatchId) {
        // Single bag update
        const val = bagValidations[0].validation
        const payload: DispatchPayload = {
          party_id: header.partyId,
          date: header.date,
          dispatch_type: header.dispatchType,
          challan_no: header.challanNo.trim() || null,
          bungari_count: header.dispatchType === 'Val' ? val.bungariCount : 0,
          bungari_weight_g: header.dispatchType === 'Val' ? val.bungariWeightG : null,
          bore_gross_weight: val.grossG / 1000,
          net_val_weight: header.dispatchType === 'Val' ? val.netValG / 1000 : null,
          rate_per_kg: rateVal,
          amount: val.amount,
          rola_count: header.dispatchType === 'Kali' ? val.rolaCount : 0,
        }

        await updateDispatch(editingDispatchId, payload)
      } else {
        // Multi-bag batch insert
        const payloads: DispatchPayload[] = bagValidations.map(({ validation }) => ({
          party_id: header.partyId,
          date: header.date,
          dispatch_type: header.dispatchType,
          challan_no: header.challanNo.trim() || null,
          bungari_count: header.dispatchType === 'Val' ? validation.bungariCount : 0,
          bungari_weight_g: header.dispatchType === 'Val' ? validation.bungariWeightG : null,
          bore_gross_weight: validation.grossG / 1000,
          net_val_weight: header.dispatchType === 'Val' ? validation.netValG / 1000 : null,
          rate_per_kg: rateVal,
          amount: validation.amount,
          rola_count: header.dispatchType === 'Kali' ? validation.rolaCount : 0,
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

  // Compute batch summary totals
  const summary = bagValidations.reduce(
    (acc, { validation }) => {
      acc.totalGrossG += validation.grossG
      acc.totalBungari += validation.bungariCount
      acc.totalBungariTareG += validation.bungariTareG
      acc.totalNetValG += validation.netValG
      acc.totalAmount += validation.amount || 0
      acc.totalRola += validation.rolaCount
      return acc
    },
    {
      totalGrossG: 0,
      totalBungari: 0,
      totalBungariTareG: 0,
      totalNetValG: 0,
      totalAmount: 0,
      totalRola: 0,
    }
  )

  const isEditing = Boolean(editingDispatchId)
  const challanGroups = groupDispatchesByChallan(dispatches)

  return (
    <div>
      <SectionHeader
        title="Dispatch"
        subtitle="Finished Val and Kali delivered to parties — weight, bungari, billing"
        action={
          !isOpen &&
          parties.length > 0 && (
            <Button onClick={() => startNewBatch()}>
              <Plus size={16} /> New Dispatch Entry
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
        <EmptyState text="Add a party first before recording dispatch entries." />
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
          {/* Header Row: Title, Mode, and Dispatch Type Switcher */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border-soft)] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: 'var(--color-brass)' }}
              >
                <Layers size={16} />
              </span>
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>
                  {isEditing
                    ? `Edit ${header.dispatchType} Dispatch Entry`
                    : `New Multi-Bag ${header.dispatchType} Dispatch`}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  {header.dispatchType === 'Val'
                    ? 'Enter finished Val bags with automatic 70g Bungari tare and rate billing'
                    : 'Enter empty Kali rola bags without Bungari or Val payment calculations'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Dispatch Type Selector */}
              <div className="flex items-center p-1 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setHeader({ ...header, dispatchType: 'Val' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    header.dispatchType === 'Val'
                      ? 'bg-[var(--color-brass)] text-white shadow-sm'
                      : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Val Dispatch
                </button>
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setHeader({ ...header, dispatchType: 'Kali' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    header.dispatchType === 'Kali'
                      ? 'bg-[var(--color-brass)] text-white shadow-sm'
                      : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Kali Dispatch
                </button>
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

            <Field label="Dispatch Date *">
              <TextInput
                type="date"
                required
                value={header.date}
                onChange={(e) => setHeader({ ...header, date: e.target.value })}
              />
            </Field>

            <Field label="Challan Number (Optional)">
              <TextInput
                placeholder="e.g. CH-200"
                value={header.challanNo}
                onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
              />
            </Field>

            {/* Rate is required for Val, hidden for Kali */}
            {header.dispatchType === 'Val' ? (
              <Field label="Rate (₹/kg) *">
                <TextInput
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 20"
                  value={header.ratePerKg}
                  style={{
                    borderColor:
                      submitAttempted && (!header.ratePerKg.trim() || parseFloat(header.ratePerKg) <= 0)
                        ? 'var(--color-due)'
                        : undefined,
                  }}
                  onChange={(e) => setHeader({ ...header, ratePerKg: e.target.value })}
                />
                {submitAttempted && (!header.ratePerKg.trim() || parseFloat(header.ratePerKg) <= 0) ? (
                  <span className="text-xs font-medium mt-1 flex items-center gap-1" style={{ color: 'var(--color-due)' }}>
                    <AlertCircle size={11} className="shrink-0" /> Rate is required
                  </span>
                ) : (
                  <span className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                    Rate per kg of Net Val
                  </span>
                )}
              </Field>
            ) : (
              <Field label="Type">
                <div
                  className="px-3 py-2 rounded-md text-sm font-semibold flex items-center min-h-[38px]"
                  style={{ background: 'var(--color-border-soft)', color: 'var(--color-ink)' }}
                >
                  Empty Rola (Kali)
                </div>
              </Field>
            )}
          </div>

          {/* Bags List Section */}
          <div className="mb-6">
            <div className="mb-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink)' }}>
                {header.dispatchType} Bag Entries ({bags.length})
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                {header.dispatchType === 'Val'
                  ? 'Enter Bore Gross (g) & Bungari count — Net Val & Billing calculate automatically.'
                  : 'Enter Gross weight (g) & Rola count for each Kali bag.'}
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {bagValidations.map(({ bag: b, validation }, index) => {
                const showGrossError =
                  Boolean(validation.grossError) &&
                  (b.touched?.gross || submitAttempted)
                const showBungariError =
                  Boolean(validation.bungariError) &&
                  (b.touched?.bungariCount || submitAttempted)
                const showBungariWeightError =
                  Boolean(validation.bungariWeightError) &&
                  (b.touched?.bungariWeight || submitAttempted)
                const showRolaError =
                  Boolean(validation.rolaError) &&
                  (b.touched?.rolaCount || submitAttempted)
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
                          : showGrossError || showBungariError || showBungariWeightError || showRolaError || isTareInvalid
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

                        {/* Status Badge */}
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

                        {validation.isValid && header.dispatchType === 'Val' && (
                          <span className="text-xs font-semibold ml-1" style={{ color: 'var(--color-brass)' }}>
                            Net Val: {fmtKg(validation.netValG / 1000)}
                            {validation.amount !== null && ` • ${fmtMoney(validation.amount)}`}
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
                    {header.dispatchType === 'Val' ? (
                      /* Val Fields */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-start">
                        {/* 1. Bore Gross Weight (grams) */}
                        <Field label="Bore Gross (grams) *">
                          <TextInput
                            required
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            placeholder="e.g. 18500"
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

                        {/* 2. Bungari Count */}
                        <Field label="Bungari Count *">
                          <TextInput
                            required
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            placeholder="e.g. 12"
                            value={b.bungariCount}
                            style={{
                              borderColor: showBungariError ? 'var(--color-due)' : undefined,
                            }}
                            onBlur={() => markTouched(b.id, 'bungariCount')}
                            onChange={(e) => {
                              const val = sanitizeNumberString(e.target.value)
                              updateBagField(b.id, 'bungariCount', val)
                            }}
                          />
                          {showBungariError ? (
                            <span
                              className="text-xs font-medium mt-1 flex items-center gap-1"
                              style={{ color: 'var(--color-due)' }}
                            >
                              <AlertCircle size={11} className="shrink-0" />
                              {validation.bungariError}
                            </span>
                          ) : (
                            <span className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                              Bungari pieces
                            </span>
                          )}
                        </Field>

                        {/* 3. Bungari Weight per piece (g) */}
                        <Field label="Bungari Wt / pc (g)">
                          <TextInput
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            placeholder="e.g. 70"
                            value={b.bungariWeightGrams}
                            style={{
                              borderColor: showBungariWeightError ? 'var(--color-due)' : undefined,
                            }}
                            onBlur={() => markTouched(b.id, 'bungariWeight')}
                            onChange={(e) =>
                              updateBagField(b.id, 'bungariWeightGrams', e.target.value)
                            }
                          />
                          <div className="flex items-center justify-between text-xs mt-0.5">
                            <span style={{ color: 'var(--color-ink-soft)' }}>Default 70g</span>
                            <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                              ({validation.bungariWeightG}g/pc)
                            </span>
                          </div>
                        </Field>

                        {/* 4. Calculated Bungari Tare Weight */}
                        <Field label="Bungari Tare (calc)">
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
                            <span>{fmtKg(validation.bungariTareG / 1000)}</span>
                            <span
                              className="text-xs font-normal"
                              style={{
                                color: isTareInvalid
                                  ? 'var(--color-due)'
                                  : 'var(--color-ink-soft)',
                              }}
                            >
                              {validation.bungariTareG.toLocaleString('en-IN')} g
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
                              : 'Bungari Count × 70g'}
                          </span>
                        </Field>

                        {/* 5. Calculated Net Val Weight */}
                        <Field label="Net Val Weight">
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
                            <span>{validation.grossG > 0 ? fmtKg(validation.netValG / 1000) : '—'}</span>
                            {validation.grossG > 0 && (
                              <span
                                className="text-xs font-normal"
                                style={{ color: 'var(--color-ink-soft)' }}
                              >
                                {validation.netValG.toLocaleString('en-IN')} g
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                            Bore Gross − Bungari
                          </span>
                        </Field>

                        {/* 6. Calculated Amount */}
                        <Field label="Bag Amount">
                          <div
                            className="px-3 py-2 rounded-md text-sm font-bold tabular-nums flex items-center justify-between min-h-[38px]"
                            style={{
                              background: 'var(--color-paper)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-ink)',
                            }}
                          >
                            <span>
                              {validation.amount !== null
                                ? fmtMoney(validation.amount)
                                : '—'}
                            </span>
                            {validation.amount !== null && (
                              <span className="text-[11px] font-normal" style={{ color: 'var(--color-ink-soft)' }}>
                                @ ₹{header.ratePerKg}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                            Net Val × Rate
                          </span>
                        </Field>
                      </div>
                    ) : (
                      /* Kali Fields */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                        {/* 1. Gross Weight Input (grams) */}
                        <Field label="Gross Weight (grams) *">
                          <TextInput
                            required
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            placeholder="e.g. 15000"
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
                            placeholder="e.g. 50"
                            value={b.rolaCount}
                            style={{
                              borderColor: showRolaError ? 'var(--color-due)' : undefined,
                            }}
                            onBlur={() => markTouched(b.id, 'rolaCount')}
                            onChange={(e) => {
                              const val = sanitizeNumberString(e.target.value)
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
                              Empty rola pieces in bag
                            </span>
                          )}
                        </Field>
                      </div>
                    )}
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
                <Sparkles size={14} /> {header.dispatchType} Batch Summary
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                {header.dispatchType === 'Val'
                  ? header.ratePerKg
                    ? `Rate: ₹${header.ratePerKg}/kg`
                    : 'Rate: Not set'
                  : 'Type: Kali (No Billing)'}
              </span>
            </div>

            {header.dispatchType === 'Val' ? (
              /* Val Summary */
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
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
                    Total Bore Gross
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                    {fmtKg(summary.totalGrossG / 1000)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    Total Bungari
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                    {summary.totalBungari} pcs
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    Bungari Tare
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                    {fmtKg(summary.totalBungariTareG / 1000)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-brass)' }}>
                    Total Net Val
                  </span>
                  <span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--color-brass)' }}>
                    {fmtKg(summary.totalNetValG / 1000)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-brass)' }}>
                    Total Amount
                  </span>
                  <span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--color-brass)' }}>
                    {fmtMoney(summary.totalAmount)}
                  </span>
                </div>
              </div>
            ) : (
              /* Kali Summary */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
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
                    Total Gross Weight
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
                    Total Rola Count
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>
                    {summary.totalRola} pcs
                  </span>
                </div>
              </div>
            )}
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
                ? 'Update Dispatch'
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

            {!canSave && (
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-due)' }}>
                <AlertCircle size={13} className="shrink-0" />
                {header.dispatchType === 'Val' && (!header.ratePerKg.trim() || parseFloat(header.ratePerKg) <= 0)
                  ? 'Please enter a valid Rate (₹/kg) and complete all bag entries'
                  : 'Fill all required fields in each bag to enable save'}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Challan-Grouped Table View ─────────────────────────────── */}
      {dispatches.length === 0 && !loading ? (
        <EmptyState text="No dispatch entries yet." />
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
                  Type
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Bore Gross (kg)
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Bungari
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Net Val (kg)
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Rate
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Amount
                </th>
                <th
                  className="text-left px-3 py-2.5 font-medium whitespace-nowrap"
                  style={{ color: 'var(--color-ink-soft)', fontSize: '0.75rem' }}
                >
                  Challan #
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
                const isGroupVal = group.dispatchType === 'Val'

                return (
                  <Fragment key={group.id}>
                    {/* Group Subheader Strip */}
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
                      <td colSpan={11} className="px-3 py-1.5 text-xs">
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
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                background: isGroupVal ? 'var(--color-border-soft)' : '#fef3c7',
                                color: isGroupVal ? 'var(--color-ink)' : '#92400e',
                              }}
                            >
                              {group.dispatchType}
                            </span>
                            <span style={{ color: 'var(--color-ink-soft)' }}>
                              • {group.dispatches.length} {group.dispatches.length === 1 ? 'Bag' : 'Bags'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                            {isGroupVal ? (
                              <>
                                <span>
                                  Batch Net Val:{' '}
                                  <strong className="font-bold" style={{ color: 'var(--color-brass)' }}>
                                    {fmtKg(group.totalNetVal)}
                                  </strong>
                                </span>
                                <span>
                                  Batch Amount:{' '}
                                  <strong className="font-bold" style={{ color: 'var(--color-brass)' }}>
                                    {fmtMoney(group.totalAmount)}
                                  </strong>
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  Batch Gross:{' '}
                                  <strong className="font-bold" style={{ color: 'var(--color-ink)' }}>
                                    {fmtKg(group.totalGross)}
                                  </strong>
                                </span>
                                <span>
                                  Total Rola:{' '}
                                  <strong className="font-bold" style={{ color: 'var(--color-ink)' }}>
                                    {group.totalRola} pcs
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Individual Bag Rows belonging to this group */}
                    {group.dispatches.map((d, bagIdx) => {
                      const isVal = (d.dispatch_type || 'Val') === 'Val'

                      return (
                        <tr
                          key={d.id}
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
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">
                            {d.party?.name ?? '—'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-semibold"
                              style={{
                                background: isVal ? 'var(--color-paper)' : '#fef3c7',
                                color: isVal ? 'var(--color-ink)' : '#92400e',
                              }}
                            >
                              {d.dispatch_type || 'Val'}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums">{fmtKg(d.bore_gross_weight)}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {isVal ? d.bungari_count || 0 : '—'}
                          </td>
                          <td
                            className="px-3 py-2 tabular-nums font-semibold"
                            style={{ color: isVal ? 'var(--color-brass)' : 'var(--color-ink-soft)' }}
                          >
                            {isVal && d.net_val_weight !== null ? fmtKg(d.net_val_weight) : '—'}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {isVal && d.rate_per_kg ? `₹${d.rate_per_kg}` : '—'}
                          </td>
                          <td
                            className="px-3 py-2 tabular-nums font-semibold"
                            style={{ color: isVal ? 'var(--color-brass)' : 'var(--color-ink-soft)' }}
                          >
                            {isVal && d.amount ? fmtMoney(d.amount) : '—'}
                          </td>
                          <td className="px-3 py-2 font-medium">{d.challan_no || '—'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => editDispatch(d)}
                              className="p-1 cursor-pointer hover:opacity-75 transition-opacity"
                              style={{ color: 'var(--color-ink-soft)' }}
                              title="Edit dispatch bag entry"
                              aria-label="Edit dispatch bag entry"
                            >
                              <Pencil size={14} />
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
                                className="p-1 cursor-pointer hover:opacity-75 transition-opacity"
                                style={{ color: 'var(--color-due)' }}
                                title="Delete dispatch bag entry"
                                aria-label="Delete dispatch bag entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
