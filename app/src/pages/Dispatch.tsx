import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, AlertCircle, X, Eye, MoreVertical, Search, Download, ChevronDown } from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchDispatches, insertDispatches, updateDispatch, updateDispatchPartyByChallan, updateDispatchDateByChallan, deleteDispatch, type DispatchPayload } from '../lib/api/dispatch'


import type { Party } from '../features/parties/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import { fmtDate, todayStr } from '../utils/date'
import { fmtKg, fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'
import { useToast } from '../context/ToastContext'
import { resolvePartyBungariWeight, getTarRate, getTarRates } from '../features/settings/utils'


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
  const { showToast } = useToast()
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
    id: crypto.randomUUID(),
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
    if (!isOpen) {
      sessionStorage.removeItem(STORAGE_KEY_DISPATCH_DRAFT)
      return
    }
    const t = setTimeout(() => {
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
    }, 500)
    return () => clearTimeout(t)
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

  // Search filter across Challan #, Party Name, and Date
  const [searchQuery, setSearchQuery] = useState('')

  const searchedChallanGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return challanGroups
    return challanGroups.filter((g) => {
      const chMatch = g.challanNo ? g.challanNo.toLowerCase().includes(q) : false
      const partyMatch = g.partyName.toLowerCase().includes(q)
      const dateMatch = fmtDate(g.date).toLowerCase().includes(q)
      return chMatch || partyMatch || dateMatch
    })
  }, [challanGroups, searchQuery])

  // Export current filtered challans as clean CSV
  const handleExportCSV = useCallback(() => {
    if (!searchedChallanGroups.length) return
    const headers = ['Challan No', 'Party', 'Date', 'Net Val (kg)', 'Rola Gross (kg)', 'Rola Pcs', 'Amount (INR)']
    const rows = searchedChallanGroups.map((g) => [
      g.challanNo ? `="${g.challanNo}"` : 'No Challan',
      `"${g.partyName.replace(/"/g, '""')}"`,
      g.date,
      g.totalValNet.toFixed(3),
      g.totalRolaGross.toFixed(3),
      g.totalRolaCount,
      g.totalAmount.toFixed(2),
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `val_dispatches_${formattedMonth.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [searchedChallanGroups, formattedMonth])

  // Track which challan groups are expanded (default: all expanded)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const monthValNet = Math.round(
    filteredDispatches
      .filter((d) => !isRolaEntry(d))
      .reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0) * 1000
  ) / 1000




  const monthBilling = filteredDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  const handlePartyChange = (newPartyId: string) => {
    const selectedParty = parties.find((p) => p.id === newPartyId)
    const partyBungari = String(resolvePartyBungariWeight(selectedParty))
    setHeader((prev) => ({ ...prev, partyId: newPartyId }))
    setRememberedBungariWeight(partyBungari)
  }


  // Handle mobile hardware back button to close modal
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== '#modal' && isOpen) {
        setIsOpen(false)
        setEditingId(null)
        setErrorMsg(null)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isOpen])

  const startAdd = () => {
    window.location.hash = 'modal'
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
  const totalNetVal = currentBagCalculations.reduce((sum, b) => sum + b.netKg, 0)
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
        showToast('Dispatch challan updated successfully', 'success')

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
      showToast('Dispatch challan recorded successfully', 'success')
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
      showToast('Dispatch entry deleted', 'info')
      await loadData()
    } catch (err: unknown) {
      console.error('Delete dispatch error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Outward Dispatch"
        description="Finished val delivery and rola returns — tare deduction & billing"
        actions={
          !isOpen && parties.length > 0 && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} variant="primary">
                <Plus size={18} strokeWidth={2.5} /> New Dispatch
              </Button>
            </div>
          )
        }
      />

      {/* ── Month Summary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="rounded-xl p-4 sm:p-5 bg-white border border-slate-200/80 shadow-xs transition-all hover:shadow-sm">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Total Net Val
          </div>
          {loading ? (
            <div className="h-7 w-20 rounded bg-slate-100 animate-pulse mb-1" />
          ) : (
            <div className="text-[22px] sm:text-[24px] font-semibold tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
              {fmtKg(monthValNet)}
            </div>
          )}
          <div className="text-[11.5px] font-medium text-slate-500">
            Val Dispatched
          </div>
        </div>

        <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50/50 border border-emerald-200/70 shadow-xs transition-all hover:shadow-md">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
            Total Billing
          </div>
          {loading ? (
            <div className="h-7 w-20 rounded bg-emerald-100/60 animate-pulse mb-1" />
          ) : (
            <div className="text-[22px] sm:text-[24px] font-black tabular-nums leading-none tracking-tight text-emerald-900 mb-1.5">
              {fmtMoney(monthBilling)}
            </div>
          )}
          <div className="text-[11.5px] font-medium text-emerald-600/80">
            Amount This Month
          </div>
        </div>
      </div>

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

      {/* Slide-Up Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[85dvh] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-200 ease-out">
            
            {/* Header            {/* Header */}
            <div className="px-6 py-4.5 bg-white flex justify-between items-center border-b border-slate-200/80 shrink-0 z-20">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                  {editingId ? 'Edit Outward Dispatch' : 'New Outward Dispatch'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate delivery challan for finished val goods or empty rola returns
                </p>
              </div>
              <button 
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto flex-1 p-6 bg-white relative" style={{ WebkitOverflowScrolling: 'touch' }}>
              {errorMsg && (
                <div className="mb-5 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="flex-1">{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} className="text-rose-800 font-bold hover:underline cursor-pointer text-xs">
                    Clear
                  </button>
                </div>
              )}

              {/* Dispatch Type Segmented Control (Top Tabs) */}
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 mb-6">
                <button
                  type="button"
                  disabled={Boolean(editingId)}
                  onClick={() => setHeader({ ...header, dispatchType: 'Val' })}
                  className={`flex-1 flex justify-center items-center gap-2 transition-all cursor-pointer ${
                    header.dispatchType === 'Val'
                      ? 'bg-slate-900 text-white shadow-xs rounded-lg font-medium text-sm py-2'
                      : 'text-slate-600 hover:text-slate-900 font-medium text-sm py-2'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Val (Finished)
                  {valBags.length > 0 && (
                    <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-bold ${header.dispatchType === 'Val' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                      {valBags.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={Boolean(editingId)}
                  onClick={() => setHeader({ ...header, dispatchType: 'Rola' })}
                  className={`flex-1 flex justify-center items-center gap-2 transition-all cursor-pointer ${
                    header.dispatchType === 'Rola'
                      ? 'bg-slate-900 text-white shadow-xs rounded-lg font-medium text-sm py-2'
                      : 'text-slate-600 hover:text-slate-900 font-medium text-sm py-2'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Rola (Empty)
                  {rolaBags.length > 0 && (
                    <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-bold ${header.dispatchType === 'Rola' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                      {rolaBags.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Form Metadata Fields */}
              <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4 mb-6">
                <div className="sm:col-span-6 relative">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                    Party (To M/S) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all appearance-none cursor-pointer"
                      value={header.partyId}
                      onChange={(e) => handlePartyChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select a party...</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={15} strokeWidth={2.2} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:contents">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                      Ch. No.
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 21"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
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
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                          Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          className={`w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all ${
                            isDateLocked ? 'bg-slate-100 opacity-70 cursor-not-allowed text-slate-500' : ''
                          }`}
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
              <div className="mb-4">
                <div className="space-y-3">
                  {currentBagCalculations.map(({ bag: b, tareKg, netKg }, idx) => (
                    <div
                      key={b.id}
                      className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 mb-3 transition-all"
                    >
                      {/* Bag Header */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                            Bag #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {header.dispatchType === 'Val' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200/60 tabular-nums">
                                Tare: -{fmtKg(tareKg)}
                              </span>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 font-mono text-xs shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Net Val:</span>
                                <span className="font-bold text-sm text-slate-900 tabular-nums">{fmtKg(netKg)}</span>
                              </div>
                            </div>
                          )}
                          {currentBags.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBag(b.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors cursor-pointer"
                              title="Remove bag"
                            >
                              <Trash2 size={16} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs based on Dispatch Type */}
                      {header.dispatchType === 'Val' ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                                Gross (kg) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                required
                                type="number"
                                step="0.001"
                                min="0.001"
                                inputMode="decimal"
                                placeholder="e.g. 20.860"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                                value={b.gross}
                                onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                                Bungari (pcs)
                              </label>
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder="e.g. 12"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                                value={b.bungariCount}
                                onChange={(e) => updateBag(b.id, 'bungariCount', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                            {/* Tar & Rate */}
                            <div className="flex-1 relative min-w-[160px]">
                              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                                Tar & Rate
                              </label>
                              <div className="relative">
                                <select
                                  value={b.tar}
                                  onChange={(e) => updateBag(b.id, 'tar', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-8 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all appearance-none cursor-pointer"
                                >
                                  {!availableTarOptions.includes(Number(b.tar)) && b.tar && (
                                    <option value={b.tar}>{b.tar} Tar (₹{getTarRate(b.tar)}/kg)</option>
                                  )}
                                  {availableTarOptions.map((t) => (
                                    <option key={t} value={String(t)}>{t} Tar (₹{getTarRate(String(t))}/kg)</option>
                                  ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <ChevronDown size={14} strokeWidth={2.2} />
                                </div>
                              </div>
                            </div>

                            {/* Twist selector ("S | Z | S+Z") mini toggle pills */}
                            <div className="shrink-0">
                              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                                Twist
                              </label>
                              <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg gap-0.5 h-[38px] items-center">
                                {(['S', 'Z', 'S+Z'] as const).map((tw) => (
                                  <button
                                    key={tw}
                                    type="button"
                                    onClick={() => updateBag(b.id, 'twistType', tw)}
                                    className={`px-3 h-full rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                      b.twistType === tw
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-white text-slate-600 hover:text-slate-900'
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
                        /* Rola bag inputs */
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                              Gross (kg) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              required
                              type="number"
                              step="0.001"
                              min="0.001"
                              inputMode="decimal"
                              placeholder="e.g. 20.860"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                              value={b.gross}
                              onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                              Rola (pcs)
                            </label>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder="e.g. 12"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                              value={b.rolaCount}
                              onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* + Add Bag Button */}
                  {!editingId && (
                    <button
                      type="button"
                      onClick={addBag}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white mt-2"
                    >
                      <Plus size={16} strokeWidth={2.5} /> Add Bag #{currentBags.length + 1}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 z-20">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-slate-600 hover:bg-slate-100 rounded-lg font-medium px-4 py-2 text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium px-5 py-2.5 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {saving 
                  ? 'Saving...' 
                  : header.dispatchType === 'Val'
                    ? `Save ${currentBags.length} Bag${currentBags.length !== 1 ? 's' : ''} • ${fmtKg(totalNetVal)} (₹${Math.round(totalAmount).toLocaleString('en-IN')})`
                    : `Save ${currentBags.length} Bag${currentBags.length !== 1 ? 's' : ''} • ${fmtKg(totalGross)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: Search, Export & Party Filter Chips ───────────── */}
      {!isOpen && (
        <div className="flex flex-col gap-3 mb-6">
          {/* Top Row: Search Input + Export Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by Challan # or Party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 text-[13px] font-medium text-slate-800 bg-white border border-slate-200 rounded-xl shadow-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-10 px-4 rounded-xl text-[13px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                title="Export filtered records to CSV"
              >
                <Download size={15} strokeWidth={2.2} className="text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Party Filter Chips */}
          {partiesInView.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button
                type="button"
                onClick={() => setPartyFilter(null)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold tracking-tight transition-all cursor-pointer shadow-xs ${
                  partyFilter === null
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Parties ({filteredDispatches.length})
              </button>
              {partiesInView.map((p) => {
                const count = filteredDispatches.filter((d) => d.party_id === p.id).length
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPartyFilter(p.id === partyFilter ? null : p.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold tracking-tight transition-all cursor-pointer shadow-xs ${
                      partyFilter === p.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.name} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Grouped Challan Table ────────────────────────────────────── */}
      {displayDispatches.length === 0 && !loading ? (
        <EmptyState text={`No dispatch entries for ${formattedMonth}. Tap "+ New Dispatch" to add one.`} />
      ) : searchedChallanGroups.length === 0 ? (
        <div className="bg-white rounded-[20px] p-12 text-center border border-slate-200/80 shadow-xs mt-4">
          <Search size={32} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-800">No matching challans found</h4>
          <p className="text-sm text-slate-500 mt-1">No results matching &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="mt-4 pb-28 animate-in fade-in duration-500">
          
          {/* DESKTOP VIEW (TABLE) */}
          <div className="bg-white rounded-[20px] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80">
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Ch. No</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Party</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Net Val</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Rola Wt</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Rola Rtn</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Amount</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchedChallanGroups.map((group) => {

                    return (
                      <Fragment key={group.key}>
                        <tr
                          className="hover:bg-slate-50/80 active:bg-slate-100/60 transition-colors cursor-pointer select-none group/tr"
                          onClick={() => setSelectedGroupId(group.key)}
                        >
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            {group.challanNo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
                                Ch. #{group.challanNo}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-500 shrink-0">
                                No Ch.
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className="font-bold text-[14px] text-slate-900 tracking-tight group-hover/tr:text-slate-900 group-hover/tr:underline transition-colors" title={group.partyName}>
                              {group.partyName}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className="text-[12.5px] text-slate-500 font-medium">{fmtDate(group.date)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            {group.hasVal && group.totalValNet > 0 ? (
                              <span className="text-[14px] font-semibold text-slate-900 tabular-nums tracking-tight">
                                {fmtKg(group.totalValNet)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 select-none">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            {group.hasRola && group.totalRolaGross > 0 ? (
                              <span className="text-[14px] font-medium text-slate-800 tabular-nums tracking-tight">
                                {fmtKg(group.totalRolaGross)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 select-none">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            {group.hasRola && group.totalRolaCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 tabular-nums">
                                {group.totalRolaCount} pcs
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 select-none">
                                0 pcs
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            {group.hasVal && group.totalAmount > 0 ? (
                              <span className="text-[14px] font-semibold text-emerald-700 tabular-nums tracking-tight">
                                {fmtMoney(group.totalAmount)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 select-none">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedGroupId(group.key)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="View Challan Details"
                                aria-label="View Challan"
                              >
                                <Eye size={16} strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (group.entries[0]) {
                                    startEdit(group.entries[0])
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit Challan Bags"
                                aria-label="Edit Challan"
                              >
                                <MoreVertical size={16} strokeWidth={2.2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!isOpen && parties.length > 0 && (
        <button
          onClick={startAdd}
          className="sm:hidden fixed bottom-[80px] right-5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-2.5 font-medium transition-all active:scale-95 z-40 border border-slate-900"
        >
          <Plus size={20} strokeWidth={2.5} /> <span className="tracking-wide">New Dispatch</span>
        </button>
      )}

      {/* --- Details Modal --- */}
      {selectedGroupId && (() => {
        const selectedGroup = challanGroups.find(g => g.key === selectedGroupId)
        if (!selectedGroup) return null

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200/80">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl shrink-0">
                   <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedGroup.partyName}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {selectedGroup.challanNo ? `Ch. #${selectedGroup.challanNo}` : 'No Challan'} • {fmtDate(selectedGroup.date)}
                      </p>
                   </div>
                   <button onClick={() => setSelectedGroupId(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 cursor-pointer">
                      <X size={20} strokeWidth={2.2} />
                   </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-3">
                   {/* Summary Header */}
                   <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-4 rounded-xl mb-2 shrink-0">
                      <div className="text-center flex-1">
                         <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Net Val</div>
                         <div className="text-lg font-semibold text-slate-900">{fmtKg(selectedGroup.totalValNet)}</div>
                      </div>
                      <div className="text-center flex-1 border-l border-slate-200/80">
                         <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Rola Wt</div>
                         <div className="text-lg font-semibold text-slate-900">{fmtKg(selectedGroup.totalRolaGross)}</div>
                      </div>
                      <div className="text-center flex-1 border-l border-slate-200/80">
                         <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Rola Return</div>
                         <div className="text-lg font-semibold text-slate-900">{selectedGroup.totalRolaCount} pcs</div>
                      </div>
                   </div>

                   <div className="space-y-2">
                     <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Entries ({selectedGroup.entries.length})</h4>
                     {selectedGroup.entries.map((d, idx) => {
                       const isRola = isRolaEntry(d)
                       const isVal = !isRola

                       return (
                         <div key={d.id} className="group/row flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all">
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${isVal ? 'bg-slate-100 border-slate-200' : 'bg-amber-50 border-amber-200/60'}`}>
                               <span className={`text-[11px] font-bold ${isVal ? 'text-slate-600' : 'text-amber-800'}`}>#{idx + 1}</span>
                             </div>
                             
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 {isVal ? (
                                   <>
                                     <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{fmtKg(d.net_val_weight || 0)}</span>
                                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Val</span>
                                     <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 ml-1">
                                       {d.cord_count || 8}T ({d.twist_type || 'S'})
                                     </span>
                                   </>
                                 ) : (
                                   <>
                                     <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{fmtKg(d.bore_gross_weight)}</span>
                                     <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Rola Wt</span>
                                   </>
                                 )}
                               </div>
                               
                               <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400">
                                 {isVal ? (
                                   <>
                                     <span>Gross: {fmtKg(d.bore_gross_weight)}</span>
                                     <span>•</span>
                                     <span>{d.bungari_count} Bungri - ₹{d.rate_per_kg || 0}/kg</span>
                                   </>
                                 ) : (
                                   <>
                                     <span className="flex items-center gap-1">
                                       Return: {d.rola_count ?? 0} pcs
                                     </span>
                                   </>
                                 )}
                               </div>
                             </div>
                           </div>
                           
                           <div className="flex items-center gap-4">
                             {isVal && d.amount ? (
                               <span className="text-[13px] font-black text-emerald-600 tabular-nums">
                                 {fmtMoney(d.amount)}
                               </span>
                             ) : null}

                             <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                               <button onClick={(e) => { e.stopPropagation(); startEdit(d); setSelectedGroupId(null); }} className="p-2 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all text-gray-400 hover:text-gray-700">
                                 <Pencil size={14} strokeWidth={2.5} />
                               </button>
                               
                               {deleting === d.id ? (
                                 <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                   <ConfirmDelete
                                     onConfirm={() => handleDelete(d.id)}
                                     onCancel={() => setDeleting(null)}
                                   />
                                 </div>
                               ) : (
                                 <button onClick={(e) => { e.stopPropagation(); setDeleting(d.id); }} className="p-2 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all text-gray-400 hover:text-red-500">
                                   <Trash2 size={14} strokeWidth={2.5} />
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                </div>
             </div>
          </div>
        )
      })()}
    </div>
  )
}

