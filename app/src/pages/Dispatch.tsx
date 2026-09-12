import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, AlertCircle, X, ChevronDown } from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchDispatches, insertDispatches, updateDispatch, updateDispatchPartyByChallan, updateDispatchDateByChallan, deleteDispatch, type DispatchPayload } from '../lib/api/dispatch'


import type { Party, DispatchWithParty } from '../types'
import { fmtDate, fmtKg, fmtMoney, todayStr } from '../types'
import { SectionHeader } from '../components/ui/SectionHeader'
import { KpiCard } from '../components/ui/KpiCard'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { useMonth } from '../context/MonthContext'
import { resolvePartyBungariWeight, getTarRate, getTarRates } from '../lib/settings'


type DispatchType = 'Val' | 'Rola'

interface BagItem {
  id: string
  gross: string         // in kg or grams (auto converted)
  bungariCount: string  // integer for Val
  rolaCount: string     // integer for Rola
  tar: string           // Cord count for Val (e.g. "8", "10", "13")
  twistType: 'S' | 'Z' | 'S+Z'  // S, Z or S+Z twist type for Val
}

interface FormHeader {
  partyId: string
  date: string
  dispatchType: DispatchType
  challanNo: string
}

const STORAGE_KEY_DISPATCH_DRAFT = 'kasab_dispatch_draft'

interface DispatchDraft {
  isOpen: boolean
  editingId: string | null
  header: FormHeader
  rememberedBungariWeight: string
  valBags: BagItem[]
  rolaBags: BagItem[]
}

function loadDispatchDraft(): DispatchDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_DISPATCH_DRAFT)
    if (raw) {
      const parsed = JSON.parse(raw) as DispatchDraft
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (e) {
    console.warn('Could not load dispatch draft:', e)
  }
  return null
}

export default function Dispatch() {
    const hasAutoOpened = useRef(false)
const [searchParams, setSearchParams] = useSearchParams()
  const { filterByMonth, formattedMonth } = useMonth()
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  // Show ONLY the Tar options that are saved in Settings
  const savedRates = getTarRates()
  const availableTarOptions = savedRates.map((r) => r.tar).sort((a, b) => a - b)

  const defaultTarForNewBag = (): string => {
    if (savedRates.some((r) => r.tar === 10)) return '10'
    if (savedRates.some((r) => r.tar === 8)) return '8'
    if (savedRates.length > 0) return String(savedRates[0].tar)
    return '10'
  }

  const createBlankBag = (defaultTar: string = defaultTarForNewBag(), defaultTwist: 'S' | 'Z' | 'S+Z' = 'S'): BagItem => ({
    id: Math.random().toString(36).substring(2, 9),
    gross: '',
    bungariCount: '',
    rolaCount: '',
    tar: defaultTar,
    twistType: defaultTwist,
  })

  // Load existing draft if returning from Settings or another page
  const initialDraft = loadDispatchDraft()

  // Form State
  const [isOpen, setIsOpen] = useState(initialDraft?.isOpen ?? false)
  const [editingId, setEditingId] = useState<string | null>(initialDraft?.editingId ?? null)
  const [originalPartyId, setOriginalPartyId] = useState<string | null>(null) // track original party on edit
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [header, setHeader] = useState<FormHeader>(
    initialDraft?.header ?? {
      partyId: '',
      date: todayStr(),
      dispatchType: 'Val',
      challanNo: '',
    }
  )

  // bungariWeightGrams is resolved from party settings, stored per-session
  const [rememberedBungariWeight, setRememberedBungariWeight] = useState<string>(
    initialDraft?.rememberedBungariWeight ?? '70'
  )

  // Separate bag lists to isolate Val and Rola data
  const [valBags, setValBags] = useState<BagItem[]>(
    initialDraft?.valBags && initialDraft.valBags.length > 0
      ? initialDraft.valBags
      : [createBlankBag()]
  )
  const [rolaBags, setRolaBags] = useState<BagItem[]>(
    initialDraft?.rolaBags && initialDraft.rolaBags.length > 0
      ? initialDraft.rolaBags
      : [createBlankBag()]
  )

  // Persist draft to sessionStorage whenever active
  useEffect(() => {
    if (isOpen) {
      const draft: DispatchDraft = {
        isOpen,
        editingId,
        header,
        rememberedBungariWeight,
        valBags,
        rolaBags,
      }
      try {
        sessionStorage.setItem(STORAGE_KEY_DISPATCH_DRAFT, JSON.stringify(draft))
      } catch (e) {
        console.warn('Could not save dispatch draft:', e)
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEY_DISPATCH_DRAFT)
    }
  }, [isOpen, editingId, header, rememberedBungariWeight, valBags, rolaBags])

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

  // Sync first party if no draft party was set
  useEffect(() => {
    if (!header.partyId && parties.length > 0) {
      const firstParty = parties[0]
      const initialBungari = String(resolvePartyBungariWeight(firstParty))
      setHeader((prev) => ({ ...prev, partyId: prev.partyId || firstParty.id }))
      setRememberedBungariWeight((prev) => prev || initialBungari)
    }
  }, [parties, header.partyId])

  // Auto open form if navigated from Dashboard Quick Action (+ Val)
  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !isOpen && !sessionStorage.getItem(STORAGE_KEY_DISPATCH_DRAFT)) {
      if (!hasAutoOpened.current) {
        hasAutoOpened.current = true
        startAdd()
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('action')
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [searchParams, parties, isOpen, setSearchParams])

  const filteredDispatches = filterByMonth(dispatches)
  const isRolaEntry = (d: DispatchWithParty) => d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'

  // ── Party filter (applied after month filter) ────────────────────────────
  const [partyFilter, setPartyFilter] = useState<string | null>(null)

  // Parties that actually have entries in this month view (for filter pills)
  const partiesInView = useMemo(() => {
    const ids = new Set(filteredDispatches.map((d) => d.party_id))
    return parties.filter((p) => ids.has(p.id))
  }, [filteredDispatches, parties])

  const displayDispatches = useMemo(
    () => partyFilter ? filteredDispatches.filter((d) => d.party_id === partyFilter) : filteredDispatches,
    [filteredDispatches, partyFilter]
  )

  // ── Challan grouping ─────────────────────────────────────────────────────
  type ChallanGroup = {
    key: string
    challanNo: string | null
    date: string
    partyId: string
    partyName: string
    entries: DispatchWithParty[]
    totalGross: number
    totalNet: number
    totalValNet: number
    totalRolaGross: number
    totalRolaCount: number
    totalAmount: number
    hasVal: boolean
    hasRola: boolean
  }

  const challanGroups = useMemo((): ChallanGroup[] => {
    const grouped: Map<string, DispatchWithParty[]> = new Map()
    for (const d of displayDispatches) {
      // Group key: challan_no + party_id only (date excluded — same challan must always merge)
      const key = d.challan_no
        ? `ch:${d.challan_no}:${d.party_id}`
        : `id:${d.id}` // no challan → standalone group
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }
    return Array.from(grouped.entries()).map(([key, rawEntries]) => {
      // Sort: Val bags first, Rola bags down the list (at bottom)
      const entries = [...rawEntries].sort((a, b) => {
        const aIsRola = isRolaEntry(a) ? 1 : 0
        const bIsRola = isRolaEntry(b) ? 1 : 0
        return aIsRola - bIsRola
      })
      const first = entries[0]
      const totalGross = entries.reduce((s, e) => s + (Number(e.bore_gross_weight) || 0), 0)
      const totalValNet = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (!isR ? (Number(e.net_val_weight) || 0) : 0)
      }, 0)
      const totalRolaGross = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.bore_gross_weight) || 0) : 0)
      }, 0)
      const totalRolaCount = entries.reduce((s, e) => {
        const isR = isRolaEntry(e)
        return s + (isR ? (Number(e.rola_count) || 0) : 0)
      }, 0)
      const totalNet = totalValNet + totalRolaGross
      const totalAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      return {
        key,
        challanNo: first.challan_no || null,
        date: first.date,
        partyId: first.party_id || '',
        partyName: first.party?.name ?? '—',
        entries,
        totalGross,
        totalNet,
        totalValNet,
        totalRolaGross,
        totalRolaCount,
        totalAmount,
        hasVal: entries.some((e) => !isRolaEntry(e)),
        hasRola: entries.some((e) => isRolaEntry(e)),
      }
    })
  }, [displayDispatches])

  // Track which challan groups are expanded (default: all expanded)
  const [expandedChallans, setExpandedChallans] = useState<Set<string>>(new Set())
  const toggleChallan = (key: string) =>
    setExpandedChallans((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

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
    })
    setValBags([createBlankBag()])
    setRolaBags([createBlankBag()])
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    const inferredTar = d.cord_count ? String(d.cord_count) : defaultTarForNewBag()
    const inferredTwist: 'S' | 'Z' | 'S+Z' =
      d.twist_type === 'Z' ? 'Z' : d.twist_type === 'S+Z' ? 'S+Z' : 'S'

    setHeader({
      partyId: d.party_id || parties[0]?.id || '',
      date: d.date,
      dispatchType: type,
      challanNo: d.challan_no || '',
    })

    const loadedBag: BagItem = {
      id: d.id,
      gross: String(d.bore_gross_weight),
      bungariCount: String(bCount),
      rolaCount: String(d.rola_count ?? 0),
      tar: inferredTar,
      twistType: inferredTwist,
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
    setOriginalPartyId(d.party_id || null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setIsOpen(false)
    setEditingId(null)
    setOriginalPartyId(null)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const addBag = () => {
    if (header.dispatchType === 'Val') {
      const lastBag = valBags[valBags.length - 1]
      const nextTar = lastBag ? lastBag.tar : defaultTarForNewBag()
      const nextTwist = lastBag ? lastBag.twistType : 'S'
      setValBags((prev) => [...prev, createBlankBag(nextTar, nextTwist)])
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

  // Calculate tare, net & amount for a Val bag
  const calcValBag = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    // Auto handle if Papa typed scale reading in grams (e.g. 20860 => 20.860 kg)
    if (grossKg > 500) {
      grossKg = grossKg / 1000
    }

    const bungariCount = parseInt(b.bungariCount, 10) || 0
    // bungariWeightG resolved from party/global settings
    const bungariWeightG = parseInt(rememberedBungariWeight, 10) || 70
    const tareKg = (bungariCount * bungariWeightG) / 1000
    const netKg = Math.max(0, grossKg - tareKg)
    // Rate auto-resolved from each bag's Tar
    const bagTar = b.tar || defaultTarForNewBag()
    const rate = getTarRate(bagTar)
    const amount =
      rate > 0 && grossKg > 0 ? Math.round(netKg * rate * 100) / 100 : null

    return {
      bag: b,
      grossKg,
      bungariCount,
      bungariWeightG,
      tareKg,
      netKg,
      rate,
      amount,
      tar: bagTar,
      twistType: b.twistType || 'S',
      rolaCount: 0,
      hasInput: grossKg > 0 || bungariCount > 0,
    }
  }

  // Calculate values for a Rola bag
  const calcRolaBag = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    if (grossKg > 500) {
      grossKg = grossKg / 1000
    }
    const rolaCount = parseInt(b.rolaCount, 10) || 0
    return {
      bag: b,
      grossKg,
      bungariCount: 0,
      bungariWeightG: 0,
      tareKg: 0,
      netKg: grossKg,
      rate: 0,
      amount: null,
      tar: '10',
      twistType: 'S' as const,
      rolaCount,
      hasInput: grossKg > 0 || rolaCount > 0,
    }
  }

  const valCalculations = valBags.map(calcValBag)
  const rolaCalculations = rolaBags.map(calcRolaBag)

  const validValBags = valCalculations.filter((b) => b.grossKg > 0)
  const validRolaBags = rolaCalculations.filter((b) => b.grossKg > 0 || b.rolaCount > 0)

  const currentBags = header.dispatchType === 'Val' ? valBags : rolaBags
  const currentBagCalculations =
    header.dispatchType === 'Val' ? valCalculations : rolaCalculations

  const totalGross = currentBagCalculations.reduce((sum, b) => sum + b.grossKg, 0)
  const totalNet = currentBagCalculations.reduce((sum, b) => sum + b.netKg, 0)
  const totalBungari = currentBagCalculations.reduce((sum, b) => sum + b.bungariCount, 0)
  const totalRola = currentBagCalculations.reduce((sum, b) => sum + b.rolaCount, 0)
  const totalAmount = currentBagCalculations.reduce((sum, b) => sum + (b.amount || 0), 0)

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

    if (editingId) {
      // Single record edit mode
      const activeCalc = header.dispatchType === 'Val' ? valCalculations[0] : rolaCalculations[0]
      if (activeCalc.grossKg <= 0) {
        setErrorMsg('Gross weight must be greater than 0')
        return
      }
      if (header.dispatchType === 'Val' && activeCalc.tareKg >= activeCalc.grossKg) {
        setErrorMsg(`Tare (${fmtKg(activeCalc.tareKg)}) cannot exceed gross weight (${fmtKg(activeCalc.grossKg)})`)
        return
      }

      setSaving(true)
      setErrorMsg(null)

      try {
        const payload: DispatchPayload = {
          party_id: header.partyId,
          date: header.date,
          dispatch_type: header.dispatchType,
          challan_no: header.challanNo.trim() || null,
          cord_count: header.dispatchType === 'Val' ? parseInt(activeCalc.tar, 10) || null : null,
          twist_type: header.dispatchType === 'Val' ? activeCalc.twistType : null,
          bungari_count: header.dispatchType === 'Val' ? activeCalc.bungariCount : 0,
          bungari_weight_g: header.dispatchType === 'Val' ? activeCalc.bungariWeightG : null,
          bore_gross_weight: activeCalc.grossKg,
          net_val_weight: header.dispatchType === 'Val' ? activeCalc.netKg : null,
          rate_per_kg: header.dispatchType === 'Val' ? activeCalc.rate : null,
          amount: activeCalc.amount,
          rola_count: header.dispatchType === 'Rola' ? activeCalc.rolaCount : 0,
        }
        await updateDispatch(editingId, payload)

        // ── Bulk party update: if party changed & challan_no exists,
        //    update all other rows on this challan to the new party too
        const challanNo = header.challanNo.trim()
        const partyChanged = originalPartyId && originalPartyId !== header.partyId
        const originalDate = dispatches.find((d) => d.id === editingId)?.date
        const dateChanged = originalDate && originalDate !== header.date
        let siblingCount = 0
        if (partyChanged && challanNo) {
          siblingCount = await updateDispatchPartyByChallan(challanNo, header.partyId, editingId)
        }
        // ── Bulk date update: if date changed & challan_no exists,
        //    update all other rows on this challan to the new date too
        if (dateChanged && challanNo) {
          const dateSiblings = await updateDispatchDateByChallan(challanNo, header.date, editingId)
          if (dateSiblings > 0 && siblingCount === 0) siblingCount = dateSiblings
        }

        closeForm()
        await loadData()

        if (siblingCount > 0) {
          setSuccessMsg(`Challan #${challanNo} — ${siblingCount} other entr${siblingCount === 1 ? 'y' : 'ies'} also updated.`)
        }
      } catch (err: unknown) {
        console.error('Save dispatch error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMsg(`Could not save dispatch — ${msg}`)
      } finally {
        setSaving(false)
      }
      return
    }

    // New Dispatch: support saving BOTH Val and Rola bags simultaneously
    if (validValBags.length === 0 && validRolaBags.length === 0) {
      setErrorMsg('Please enter weight for at least one bag in Val or Rola')
      return
    }

    // Validate entered Val bags
    for (let i = 0; i < validValBags.length; i++) {
      const v = validValBags[i]
      if (v.tareKg >= v.grossKg && v.grossKg > 0) {
        setErrorMsg(`Val Bag #${i + 1}: Tare (${fmtKg(v.tareKg)}) cannot exceed gross weight (${fmtKg(v.grossKg)})`)
        return
      }
    }

    // Validate entered Rola bags
    for (let i = 0; i < validRolaBags.length; i++) {
      const r = validRolaBags[i]
      if (r.grossKg <= 0) {
        setErrorMsg(`Rola Bag #${i + 1}: Gross weight must be greater than 0`)
        return
      }
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const valPayloads: DispatchPayload[] = validValBags.map((val) => ({
        party_id: header.partyId,
        date: header.date,
        dispatch_type: 'Val',
        challan_no: header.challanNo.trim() || null,
        cord_count: parseInt(val.tar, 10) || null,
        twist_type: val.twistType,
        bungari_count: val.bungariCount,
        bungari_weight_g: val.bungariWeightG,
        bore_gross_weight: val.grossKg,
        net_val_weight: val.netKg,
        rate_per_kg: val.rate,
        amount: val.amount,
        rola_count: 0,
      }))

      const rolaPayloads: DispatchPayload[] = validRolaBags.map((val) => ({
        party_id: header.partyId,
        date: header.date,
        dispatch_type: 'Rola',
        challan_no: header.challanNo.trim() || null,
        cord_count: null,
        twist_type: null,
        bungari_count: 0,
        bungari_weight_g: null,
        bore_gross_weight: val.grossKg,
        net_val_weight: null,
        rate_per_kg: null,
        amount: null,
        rola_count: val.rolaCount,
      }))

      const allPayloads = [...valPayloads, ...rolaPayloads]
      await insertDispatches(allPayloads)

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
        title="Val Dispatch"
        subtitle="Finished val delivery and rola returns — tare deduction & billing"
      />

      {/* ── Month Summary KPIs ── */}
      {!isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Net Val', value: fmtKg(monthValNet), sub: 'Val Bheja', color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
            { label: 'Total Rola Weight', value: fmtKg(monthRolaNet), sub: 'Rola Return', color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Kul Wajan', value: fmtKg(monthDispatchedTotal), sub: 'Val + Rola', color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Kul Kamaai', value: fmtMoney(monthBilling), sub: 'Is Mahine Ka Paisa', color: 'text-emerald-600', bg: 'bg-emerald-50/30' },
          ].map(({ label, value, sub, color, bg }) => (
            <div
              key={label}
              className={`rounded-[20px] p-4.5 bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100/80 ${bg} transition-all hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]`}
            >
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                {label}
              </div>
              {loading ? (
                <div className="h-7 w-20 rounded bg-gray-100 animate-pulse mb-1" />
              ) : (
                <div className={`text-[19px] font-black tabular-nums leading-none tracking-tight ${color} mb-1.5`}>
                  {value}
                </div>
              )}
              <div className="text-[10px] font-medium text-gray-400">
                {sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {successMsg && (
        <div
          className="rounded-lg p-3 mb-4 text-sm font-medium flex items-center justify-between shadow-xs"
          style={{
            background: 'var(--color-positive-bg)',
            color: 'var(--color-positive)',
            border: '1px solid color-mix(in srgb, var(--color-positive) 25%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="underline cursor-pointer font-semibold ml-3 shrink-0"
          >
            OK
          </button>
        </div>
      )}

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

      {/* ── Add / Edit Form (Paper Challan Slip Layout & Papa Friendly) ─────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-md sm:items-center sm:justify-center p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:w-[520px] max-h-[95vh] rounded-t-[24px] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:slide-in-from-bottom-6 duration-400 ease-out">
            
            {/* Header & Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-2 bg-white flex justify-between items-start">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase mb-1.5">
                  {editingId ? 'EDIT CHALLAN' : 'NEW CHALLAN'}
                </p>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5 tracking-tight">
                  {header.partyId ? parties.find(p => p.id === header.partyId)?.name : 'Select Party'}
                  {header.challanNo && (
                    <span className="text-[#a57b3f]/70 font-semibold text-lg ml-1">
                      #{header.challanNo}
                    </span>
                  )}
                </h2>
              </div>
              <button 
                onClick={closeForm}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 bg-[#fcfcfb]" style={{ WebkitOverflowScrolling: 'touch' }}>
              {errorMsg && (
                <div className="mb-5 p-3 bg-red-50/80 text-red-700 rounded-[14px] text-sm flex items-start gap-2.5 border border-red-100/50 shadow-sm">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
                  <button onClick={() => setErrorMsg(null)} className="text-red-800 font-bold hover:opacity-70 transition-opacity cursor-pointer text-xs uppercase tracking-wide mt-1">
                    Clear
                  </button>
                </div>
              )}

              {/* Ultra-Premium Segmented Type Toggle */}
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl mb-7 shadow-inner relative ring-1 ring-black/5">
                <button
                  type="button"
                  disabled={Boolean(editingId)}
                  onClick={() => setHeader({ ...header, dispatchType: 'Val' })}
                  className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer z-10 ${
                    header.dispatchType === 'Val'
                      ? 'bg-white text-[#8f6932] shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Val (Finished)
                  {validValBags.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${header.dispatchType === 'Val' ? 'bg-[#a57b3f]/10 text-[#a57b3f]' : 'bg-gray-200 text-gray-500'}`}>
                      {validValBags.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={Boolean(editingId)}
                  onClick={() => setHeader({ ...header, dispatchType: 'Rola' })}
                  className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer z-10 ${
                    header.dispatchType === 'Rola'
                      ? 'bg-white text-[#a57b3f] shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Rola (Empty)
                  {validRolaBags.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${header.dispatchType === 'Rola' ? 'bg-amber-600/10 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                      {validRolaBags.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Form Grid (Soft Floating Labels) */}
              <div className="mb-8 space-y-5">
                <div className="relative">
                  <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">
                    Party (To M/S) <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all appearance-none cursor-pointer shadow-sm"
                    value={header.partyId}
                    onChange={(e) => handlePartyChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a party...</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">Ch. No.</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      placeholder="Optional"
                      value={header.challanNo}
                      onChange={(e) => {
                        const newChallanNo = e.target.value
                        const existing = newChallanNo.trim() ? dispatches.find((d) => d.challan_no === newChallanNo.trim()) : null
                        if (existing) {
                          setHeader({ ...header, challanNo: newChallanNo, date: existing.date, partyId: existing.party_id || header.partyId })
                        } else {
                          setHeader({ ...header, challanNo: newChallanNo })
                        }
                      }}
                    />
                  </div>

                  {(() => {
                    const existingChallan = header.challanNo.trim() ? dispatches.find((d) => d.challan_no === header.challanNo.trim()) : null
                    const isDateLocked = !!existingChallan && !editingId
                    return (
                      <div className="flex-[1.5] relative">
                        <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">Date</label>
                        <input
                          type="date"
                          required
                          className={`w-full h-[48px] px-4 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm ${isDateLocked ? 'bg-gray-100/50 opacity-70 cursor-not-allowed text-gray-500' : 'bg-gray-50/50'}`}
                          value={header.date}
                          readOnly={isDateLocked}
                          onChange={(e) => {
                            if (!isDateLocked) setHeader({ ...header, date: e.target.value })
                          }}
                        />
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Bags Section */}
              <div className="space-y-5 mb-8 relative">
                {currentBagCalculations.map(({ bag: b, tareKg, netKg, rate, amount, rolaCount }, idx) => (
                  <div key={b.id} className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ring-1 ring-gray-100/80 relative transition-all group">
                    
                    {/* Bag Header */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#a57b3f]/10 text-[#a57b3f] flex items-center justify-center text-xs font-black ring-1 ring-[#a57b3f]/20">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Bag #{idx + 1}</span>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        {header.dispatchType === 'Val' && (
                          <div className="text-right">
                            <div className="text-[9px] font-extrabold text-gray-400 tracking-widest uppercase mb-1">Net Val</div>
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-bold text-red-500/80 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100/50 leading-none shadow-xs">
                                -{fmtKg(tareKg)}
                              </span>
                              <div className="text-[20px] font-black text-[#8f6932] leading-none tracking-tight">
                                {fmtKg(netKg)}
                              </div>
                            </div>
                          </div>
                        )}
                        {currentBags.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBag(b.id)}
                            className="p-1.5 -mr-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer opacity-80 hover:opacity-100"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs based on Dispatch Type */}
                    {header.dispatchType === 'Val' ? (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Gross (kg)</label>
                            <input
                              required
                              type="number"
                              step="0.001"
                              min="0.001"
                              inputMode="decimal"
                              placeholder="e.g. 20.860"
                              className="w-full h-[44px] px-3.5 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[14px] font-bold tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                              value={b.gross}
                              onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Bungri (pcs)</label>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder="e.g. 12"
                              className="w-full h-[44px] px-3.5 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[14px] font-bold tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                              value={b.bungariCount}
                              onChange={(e) => updateBag(b.id, 'bungariCount', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-[1.5]">
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tar & Rate</label>
                            <select
                              value={b.tar}
                              onChange={(e) => updateBag(b.id, 'tar', e.target.value)}
                              className="w-full h-[44px] px-3.5 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[14px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all appearance-none cursor-pointer shadow-xs"
                            >
                              {!availableTarOptions.includes(Number(b.tar)) && b.tar && (
                                <option value={b.tar}>{b.tar} Tar (₹{getTarRate(b.tar)}/kg)</option>
                              )}
                              {availableTarOptions.map((t) => (
                                <option key={t} value={String(t)}>{t} Tar (₹{getTarRate(String(t))}/kg)</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Twist</label>
                            <div className="flex p-1 h-[44px] bg-gray-100/70 rounded-[12px] ring-1 ring-black/5 shadow-inner">
                              {(['S', 'Z', 'S+Z'] as const).map((tw) => (
                                <button
                                  key={tw}
                                  type="button"
                                  onClick={() => updateBag(b.id, 'twistType', tw)}
                                  className={`flex-1 rounded-[8px] text-[11px] font-black transition-all cursor-pointer h-full flex items-center justify-center ${
                                    b.twistType === tw
                                      ? 'bg-white text-[#8f6932] shadow-sm ring-1 ring-black/5'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                                  }`}
                                >
                                  {tw}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Gross (kg)</label>
                          <input
                            required
                            type="number"
                            step="0.001"
                            min="0.001"
                            inputMode="decimal"
                            placeholder="e.g. 20.860"
                            className="w-full h-[44px] px-3.5 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[14px] font-bold tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                            value={b.gross}
                            onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Rola (pcs)</label>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="e.g. 12"
                            className="w-full h-[44px] px-3.5 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[14px] font-bold tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                            value={b.rolaCount}
                            onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {!editingId && (
                <button
                  type="button"
                  onClick={addBag}
                  className="w-full py-4.5 rounded-[16px] border-2 border-dashed border-gray-200 hover:border-[#a57b3f]/50 hover:bg-[#a57b3f]/5 text-[#a57b3f]/80 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer mb-6"
                >
                  <Plus size={18} strokeWidth={3} /> Add Bag #{currentBags.length + 1}
                </button>
              )}
            </div>

            {/* Premium Action Footer with Floating Shadow */}
            <div className="px-6 py-5 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex gap-4 pb-8 sm:pb-6 relative z-10 shadow-[0_-12px_40px_-15px_rgba(0,0,0,0.06)]">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 py-4 rounded-[14px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-[2] py-4 rounded-[14px] font-black text-white bg-gradient-to-b from-[#b58c50] to-[#997036] hover:from-[#a57b3f] hover:to-[#8a632b] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer text-[15px] border border-[#8a632b]/50"
              >
                {saving 
                  ? 'Saving...' 
                  : header.dispatchType === 'Val'
                    ? `Save ${validValBags.length} Bag${validValBags.length !== 1 ? 's' : ''} • ${fmtMoney(totalAmount)}`
                    : `Save ${validRolaBags.length} Bag${validRolaBags.length !== 1 ? 's' : ''} • ${fmtKg(totalGross)}`}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {!isOpen && partiesInView.length > 1 && (
        <div className="relative mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              type="button"
              onClick={() => setPartyFilter(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-black tracking-tight transition-all cursor-pointer shadow-sm ${
                partyFilter === null
                  ? 'bg-gradient-to-r from-[#b58c50] to-[#997036] text-white border-transparent shadow-[0_4px_12px_rgba(165,123,63,0.25)]'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#a57b3f] hover:text-[#a57b3f]'
              }`}
            >
              All Parties
            </button>
            {partiesInView.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartyFilter(p.id === partyFilter ? null : p.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-black tracking-tight transition-all cursor-pointer shadow-sm ${
                  partyFilter === p.id
                    ? 'bg-gradient-to-r from-[#b58c50] to-[#997036] text-white border-transparent shadow-[0_4px_12px_rgba(165,123,63,0.25)]'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#a57b3f] hover:text-[#a57b3f]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Grouped Challan Table ────────────────────────────────────── */}
      {displayDispatches.length === 0 && !loading ? (
        <EmptyState text={`No dispatch entries for ${formattedMonth}. Tap "+ New Dispatch" to add one.`} />
      ) : (
        <div className="space-y-4 pb-28 animate-in fade-in duration-500">
          {challanGroups.map((group) => {
            const isExpanded = group.entries.length === 1 || expandedChallans.has(group.key)
            const multiRow = group.entries.length > 1

            return (
              <div
                key={group.key}
                className={`rounded-[24px] overflow-hidden bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 transition-all ${isExpanded ? 'shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]' : ''}`}
              >
                {/* ── Challan Group Header ── */}
                <div
                  className={`px-5 py-4 ${multiRow ? 'cursor-pointer hover:bg-gray-50/50 transition-colors select-none' : ''}`}
                  onClick={() => multiRow && toggleChallan(group.key)}
                >
                  {/* Row 1: Challan badge + Party name + Date (Left) | Expand toggle (Right) */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                      {group.challanNo ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide bg-[#a57b3f] text-white shadow-sm shrink-0">
                          Ch. #{group.challanNo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide bg-gray-100 text-gray-500 shrink-0">
                          No Ch.
                        </span>
                      )}
                      <h3 className="font-extrabold text-[16px] text-gray-900 truncate tracking-tight">{group.partyName}</h3>
                      <span className="text-[12px] text-gray-400 font-medium shrink-0 ml-auto">{fmtDate(group.date)}</span>
                    </div>

                    {multiRow && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-400 shrink-0">
                        <ChevronDown 
                          size={18} 
                          strokeWidth={2.5} 
                          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#a57b3f]' : ''}`} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Weight Metrics on Left | Paisa on Right */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Weights and Counts */}
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                      {/* Val net weight */}
                      {group.hasVal && (
                        <div>
                          <div className="text-[9px] font-extrabold text-[#a57b3f]/80 uppercase tracking-widest mb-1">Net Val</div>
                          <div className="text-[15px] font-black text-[#a57b3f] tabular-nums tracking-tight">{fmtKg(group.totalValNet)}</div>
                        </div>
                      )}

                      {/* Rola gross weight */}
                      {group.hasRola && group.totalRolaGross > 0 && (
                        <div>
                          <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Rola Weight</div>
                          <div className="text-[15px] font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(group.totalRolaGross)}</div>
                        </div>
                      )}

                      {/* Rola count */}
                      {group.hasRola && group.totalRolaCount > 0 && (
                        <div>
                          <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Rola Return</div>
                          <div className="text-[15px] font-black text-gray-700 tabular-nums tracking-tight flex items-center gap-1.5">{group.totalRolaCount} <span className="text-[11px] font-bold text-gray-400">pcs</span></div>
                        </div>
                      )}
                    </div>

                    {/* Right: Paisa */}
                    {group.hasVal && group.totalAmount > 0 && (
                      <div className="text-right">
                        <div className="text-[9px] font-extrabold text-emerald-600/70 uppercase tracking-widest mb-1">Paisa</div>
                        <div className="text-[17px] font-black text-emerald-600 tabular-nums tracking-tight">{fmtMoney(group.totalAmount)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Bag Detail Rows ── */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100/80 bg-white border-t border-gray-100/80">
                    {group.entries.map((d, idx) => {
                      const isRola = isRolaEntry(d)
                      const isVal = !isRola

                      return (
                        <div
                          key={d.id}
                          className={`px-5 py-4 hover:bg-amber-50/30 transition-colors group/row ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider bg-white border ${isVal ? 'text-gray-600 border-gray-200' : 'text-amber-700 border-amber-200 bg-amber-50'}`}>
                                {isVal ? `${d.cord_count || 8}T (${d.twist_type || 'S'})` : 'ROLA'}
                              </span>
                              <span className="text-[11px] font-bold text-gray-500">
                                {isVal
                                  ? `${d.bungari_count} Bungri · ₹${d.rate_per_kg || 0}/kg`
                                  : `${d.rola_count ?? 0} pcs`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => startEdit(d)}
                                className="p-2 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                                title="Edit entry"
                              >
                                <Pencil size={16} strokeWidth={2.5} />
                              </button>
                              
                              {deleting === d.id ? (
                                <div className="flex items-center gap-1.5 text-xs bg-red-50 px-2 py-1 rounded-xl border border-red-100">
                                  <span className="text-red-600 font-bold px-1">Sure?</span>
                                  <button onClick={() => handleDelete(d.id)} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg font-bold shadow-sm hover:bg-red-600 transition-colors">Yes</button>
                                  <button onClick={() => setDeleting(null)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 transition-colors">No</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleting(d.id)}
                                  className="p-2 rounded-xl flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 size={16} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mt-3 text-[14px]">
                            {isVal ? (
                              <div className="flex items-baseline gap-2 text-gray-500 font-medium">
                                <span className="font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(d.net_val_weight || 0)}</span>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#a57b3f]">Net Val</span>
                                <span className="text-gray-300 mx-1">·</span>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Gross:</span>
                                <span className="font-black text-gray-600 tabular-nums tracking-tight">{fmtKg(d.bore_gross_weight)}</span>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-2 text-gray-500 font-medium">
                                <span className="font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(d.bore_gross_weight)}</span>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Gross Weight</span>
                              </div>
                            )}

                            {isVal && d.amount ? (
                              <div className="text-[17px] font-black text-emerald-600 tabular-nums tracking-tight mt-1 sm:mt-0 text-right">
                                {fmtMoney(d.amount)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Action Button (+ New Dispatch) */}
      {!isOpen && parties.length > 0 && (
        <button
          onClick={startAdd}
          className="fixed bottom-[80px] right-5 sm:right-8 bg-gradient-to-b from-[#b58c50] to-[#997036] hover:from-[#a57b3f] hover:to-[#8a632b] text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(165,123,63,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(165,123,63,0.6)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-[#c49a5d]/50 hover:-translate-y-1"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">New Dispatch</span>
        </button>
      )}
    </div>
  )
}

