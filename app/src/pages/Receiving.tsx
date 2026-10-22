import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, X, AlertCircle, ChevronDown, Pencil, Eye, MoreVertical, Search, Download } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts, insertReceipts, updateReceipt, deleteReceipt, type ReceiptPayload } from '../lib/api/receipts'


import type { Party } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import { COLOR_TYPES } from '../features/receiving/constants'
import { fmtDate, todayStr } from '../utils/date'
import { fmtKg } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'
import { useToast } from '../context/ToastContext'
import { isBigRola } from '../features/receiving/calculations'
import { resolvePartyRolaWeight, resolvePartyBigRolaWeight, getGlobalSettings } from '../features/settings/utils'

const STORAGE_KEY_PER_ROLA = 'kasab_last_per_rola_weight'

interface BagItem {
  id: string
  gross: string
  rolaCount: string
  perRolaGrams: string
  color: string
  twistType: 'S' | 'Z'
  sizeType: 'Norm' | 'Big'
}

interface FormHeader {
  partyId: string
  date: string
  challanNo: string
}

export default function Receiving() {
  const hasAutoOpened = useRef(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { filterByMonth, formattedMonth } = useMonth()
  const { showToast } = useToast()
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
    challanNo: '',
  })

  const [rememberedPerRola, setRememberedPerRola] = useState<string>(() => {
    return String(getGlobalSettings().defaultRolaGrams)
  })

  const createBlankBag = (customPerRola?: string): BagItem => ({
    id: crypto.randomUUID(),
    gross: '',
    rolaCount: '',
    perRolaGrams: customPerRola || rememberedPerRola || '200',
    color: 'M.gold',
    twistType: 'S',
    sizeType: 'Norm',
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

  // ── Party filter (applied after month filter) ────────────────────────────
  const [partyFilter, setPartyFilter] = useState<string | null>(null)

  const partiesInView = useMemo(() => {
    const ids = new Set(filteredReceipts.map((r) => r.party_id))
    return parties.filter((p) => ids.has(p.id))
  }, [filteredReceipts, parties])

  const displayReceipts = useMemo(
    () => partyFilter ? filteredReceipts.filter((r) => r.party_id === partyFilter) : filteredReceipts,
    [filteredReceipts, partyFilter]
  )
  // ─────────────────────────────────────────────────────────────────────────

  const monthNet = filteredReceipts.reduce((s, r) => s + (Number(r.net_weight) || 0), 0)
  const monthRola = filteredReceipts.reduce((s, r) => s + (Number(r.rola_count) || 0), 0)

  const handlePartyChange = (newPartyId: string) => {
    const selectedParty = parties.find((p) => p.id === newPartyId)
    const partyRola = String(resolvePartyRolaWeight(selectedParty))
    const partyBigRola = String(resolvePartyBigRolaWeight(selectedParty))
    setHeader((prev) => ({ ...prev, partyId: newPartyId }))
    setRememberedPerRola(partyRola)
    setBags((prev) =>
      prev.map((b) => ({
        ...b,
        perRolaGrams: b.sizeType === 'Big' ? partyBigRola : partyRola,
      }))
    )
  }

  const handleSizeTypeChange = (id: string, size: 'Norm' | 'Big') => {
    const selectedParty = parties.find(p => p.id === header.partyId)
    const newPerRola = size === 'Big'
      ? String(resolvePartyBigRolaWeight(selectedParty))
      : String(resolvePartyRolaWeight(selectedParty))

    setBags(prev => prev.map(b => b.id === id ? { ...b, sizeType: size, perRolaGrams: newPerRola } : b))
  }


  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !isOpen) {
      if (!hasAutoOpened.current) {
        hasAutoOpened.current = true
        startAdd()
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('action')
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [searchParams, parties, isOpen, setSearchParams])


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
    const initialRola = String(resolvePartyRolaWeight(firstParty))
    setRememberedPerRola(initialRola)
    setHeader({
      partyId: firstParty?.id || '',
      date: todayStr(),
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
      challanNo: r.challan_no || '',
    })

    const rolaCnt = r.rola_count ?? 0
    const boriKg = getGlobalSettings().defaultBoriGrams / 1000 || 0.1
    const tareWithoutBori = (r.gross_weight > 0 && r.tare_weight >= boriKg) ? r.tare_weight - boriKg : r.tare_weight

    const originalPerRola =
      rolaCnt > 0
        ? String(Math.round((tareWithoutBori * 1000) / rolaCnt))
        : rememberedPerRola || '200'

    // Detect if this bag used Big rola weight by comparing per-rola grams
    const party = parties.find(p => p.id === (r.party_id || parties[0]?.id))
    const normWeight = resolvePartyRolaWeight(party)
    const bigWeight = resolvePartyBigRolaWeight(party)
    const perRolaGrams = rolaCnt > 0 ? Math.round((tareWithoutBori * 1000) / rolaCnt) : normWeight
    // Pick sizeType based on which weight it's closer to
    const sizeType: 'Norm' | 'Big' =
      Math.abs(perRolaGrams - bigWeight) < Math.abs(perRolaGrams - normWeight) ? 'Big' : 'Norm'

    setBags([
      {
        id: r.id,
        gross: String(r.gross_weight),
        rolaCount: String(rolaCnt),
        perRolaGrams: originalPerRola,
        color: r.color || 'M.gold',
        twistType: 'S',
        sizeType,
      },
    ])
    setIsOpen(true)
    setErrorMsg(null)
  }


  const closeForm = () => {
    if (window.location.hash === '#modal') {
      window.history.back()
    } else {
      setIsOpen(false)
      setEditingId(null)
      setErrorMsg(null)
    }
  }

  const addBag = () => {
    setBags((prev) => [...prev, createBlankBag(rememberedPerRola)])
  }

  const removeBag = (id: string) => {
    if (bags.length <= 1) return
    setBags((prev) => prev.filter((b) => b.id !== id))
  }

  const updateBag = (id: string, field: keyof BagItem, val: string) => {
    if (field === 'perRolaGrams') {
      const clean = val.replace(/[^0-9]/g, '')
      setRememberedPerRola(clean)
      try {
        if (clean) localStorage.setItem(STORAGE_KEY_PER_ROLA, clean)
      } catch { }
    }
    setBags((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    )
  }

  const calcBagValues = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    if (grossKg > 500) {
      grossKg = grossKg / 1000
    }
    const rola = parseInt(b.rolaCount, 10) || 0

    const selectedParty = parties.find(p => p.id === header.partyId)
    const normWeight = resolvePartyRolaWeight(selectedParty)
    const bigWeight = resolvePartyBigRolaWeight(selectedParty)
    const perRola = b.sizeType === 'Big' ? bigWeight : normWeight

    const boriKg = getGlobalSettings().defaultBoriGrams / 1000 || 0.1
    const tareKg = ((rola * perRola) / 1000) + (grossKg > 0 ? boriKg : 0)
    const netKg = Math.max(0, grossKg - tareKg)
    return { grossKg, rola, perRola, tareKg, netKg }
  }

  const bagCalculations = bags.map((b) => ({
    bag: b,
    ...calcBagValues(b),
  }))

  const totalFormNet = bagCalculations.reduce((sum, b) => sum + b.netKg, 0)

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
        const val = bagCalculations[0]
        const payload: ReceiptPayload = {
          party_id: header.partyId,
          date: header.date,
          color: val.bag.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: val.grossKg,
          tare_weight: val.tareKg,
          rola_count: val.rola,
        }
        await updateReceipt(editingId, payload)
        showToast('Inward receipt updated successfully', 'success')
      } else {
        const payloads: ReceiptPayload[] = bagCalculations.map((val) => ({
          party_id: header.partyId,
          date: header.date,
          color: val.bag.color.trim() || null,
          challan_no: header.challanNo.trim() || null,
          gross_weight: val.grossKg,
          tare_weight: val.tareKg,
          rola_count: val.rola,
        }))
        await insertReceipts(payloads)
        showToast('Inward receipt saved successfully', 'success')
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
      showToast('Inward receipt deleted', 'info')
      if (editingId === id) closeForm()
      await loadData()
    } catch (err) {
      console.error('Delete error:', err)
      setErrorMsg('Could not delete receipt')
    }
  }

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const groupedReceipts = useMemo(() => {
    const groups: Record<string, {
      id: string,
      challan_no: string,
      party_name: string,
      date: string,
      gross: number,
      tare: number,
      net: number,
      rola: number,
      bagsCount: number,
      receipts: ReceiptWithParty[],
      hasBig: boolean
    }> = {}

    displayReceipts.forEach(r => {
      const key = `${r.challan_no || 'NO_CH'}_${r.party?.name || 'Unknown'}_${r.date}`
      if (!groups[key]) {
        groups[key] = {
          id: key,
          challan_no: r.challan_no || '—',
          party_name: r.party?.name || 'Unknown',
          date: r.date,
          gross: 0,
          tare: 0,
          net: 0,
          rola: 0,
          bagsCount: 0,
          receipts: [],
          hasBig: false
        }
      }
      groups[key].gross += Number(r.gross_weight) || 0
      groups[key].tare += Number(r.tare_weight) || 0
      groups[key].net += Number(r.net_weight) || 0
      groups[key].rola += Number(r.rola_count) || 0
      groups[key].bagsCount += 1
      groups[key].receipts.push(r)

      const rolaVal = Number(r.rola_count) || 0
      if (rolaVal > 0 && Number(r.gross_weight) > 0 && Number(r.tare_weight) > 0) {
        const boriKg = getGlobalSettings().defaultBoriGrams / 1000 || 0.1
        const tareVal = Number(r.tare_weight)
        const tareWithoutBori = tareVal >= boriKg ? tareVal - boriKg : tareVal
        const perRolaGrams = Math.round((tareWithoutBori * 1000) / rolaVal)
        const normalWeight = resolvePartyRolaWeight(r.party)
        if (perRolaGrams > normalWeight + 15) {
          groups[key].hasBig = true
        }
      }
    })

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [displayReceipts, parties])

  // Search filter across Challan #, Party Name, and Date
  const [searchQuery, setSearchQuery] = useState('')

  const searchedReceiptGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groupedReceipts
    return groupedReceipts.filter((g) => {
      const chMatch = g.challan_no && g.challan_no !== '—' ? g.challan_no.toLowerCase().includes(q) : false
      const partyMatch = g.party_name.toLowerCase().includes(q)
      const dateMatch = fmtDate(g.date).toLowerCase().includes(q)
      return chMatch || partyMatch || dateMatch
    })
  }, [groupedReceipts, searchQuery])

  // Export current filtered challans as clean CSV
  const handleExportCSV = useCallback(() => {
    if (!searchedReceiptGroups.length) return
    const headers = ['Challan No', 'Party', 'Date', 'Gross Wt (kg)', 'Rola Count', 'Net Kasab (kg)', 'Bags Count']
    const rows = searchedReceiptGroups.map((g) => [
      g.challan_no !== '—' ? `="${g.challan_no}"` : 'No Challan',
      `"${g.party_name.replace(/"/g, '""')}"`,
      g.date,
      g.gross.toFixed(3),
      g.rola,
      g.net.toFixed(3),
      g.bagsCount,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inward_receipts_${formattedMonth.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [searchedReceiptGroups, formattedMonth])



  return (
    <div>
      <PageHeader
        title="Inward Receipts"
        description="Record raw kasab intake, calculate net weight, and manage Normal/Big rola tare"
        actions={
          !isOpen && parties.length > 0 && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} variant="primary">
                <Plus size={18} strokeWidth={2.5} /> New Receiving
              </Button>
            </div>
          )
        }
      />
      {/* ── Month Summary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Net Kasab', value: fmtKg(monthNet), sub: 'Kasab Received' },
          { label: 'Rola Received', value: `${monthRola} pcs`, sub: 'Empty Spools Returned' },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl p-4.5 bg-white shadow-xs border border-slate-200/80 transition-all hover:shadow-sm"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              {label}
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded bg-slate-100 animate-pulse mb-1" />
            ) : (
              <div className="text-[22px] font-semibold tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
                {value}
              </div>
            )}
            <div className="text-[11px] font-medium text-slate-500">
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar: Search, Export & Party Filter Chips ───────────── */}
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
                placeholder="Search by Challan #, Party, or Date..."
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

          {/* Party Filter Chips with dynamic counts */}
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
                All Parties ({filteredReceipts.length})
              </button>
              {partiesInView.map((p) => {
                const count = filteredReceipts.filter((r) => r.party_id === p.id).length
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

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording receiving entries." />
      )}

      {/* --- Slide-Up Form Modal --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-4xl rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-200 ease-out max-h-[90dvh] sm:max-h-[85dvh]">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white shrink-0 z-20">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4.5 bg-white flex justify-between items-center border-b border-slate-200/80 shrink-0 z-20">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                  {editingId ? 'Edit Inward Receipt' : 'Record Inward Receipt'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter gross weight and rola details to compute net kasab
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

            <div className="p-6 flex-1 overflow-y-auto relative">
              {errorMsg && (
                <div className="mb-5 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Metadata */}
              <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4 mb-6">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                    Party (From M/S) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all appearance-none cursor-pointer"
                      value={header.partyId}
                      onChange={(e) => handlePartyChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Party...</option>
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
                      placeholder="e.g. 504"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                      value={header.challanNo}
                      onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                      value={header.date}
                      onChange={(e) => setHeader({ ...header, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bags Section */}
              <div className="mb-4">
                <div className="space-y-3">
                  {bagCalculations.map(({ bag: b, netKg }, idx) => (
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
                          {b.sizeType === 'Big' && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md font-mono">
                              Big Rola ({b.perRolaGrams}g)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Net Kasab
                            </span>
                            <div className="text-right font-mono font-bold text-slate-900 text-base tabular-nums leading-tight">
                              {fmtKg(netKg)}
                            </div>
                          </div>
                          {bags.length > 1 && (
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

                      {/* Inputs Row: Gross Wt & Rola Count */}
                      <div className="grid grid-cols-3 sm:flex gap-3 mb-3">
                        <div className="col-span-2 sm:flex-[2]">
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                            Gross (kg) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                            placeholder="e.g. 30.010"
                            value={b.gross}
                            onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-span-1 sm:flex-1 sm:min-w-[90px]">
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5 text-center">
                            Rola
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 text-center placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                            placeholder="60"
                            value={b.rolaCount}
                            onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Twist Toggle (S/Z), Item Select, Size Toggle (Norm/Big) */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        {/* "S | Z" twist toggle */}
                        <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateBag(b.id, 'twistType', 'S')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              b.twistType === 'S'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            S
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBag(b.id, 'twistType', 'Z')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              b.twistType === 'Z'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Z
                          </button>
                        </div>

                        {/* Item / Color selector */}
                        <div className="flex-1 relative min-w-[120px]">
                          <select
                            className="w-full h-8 pl-3 pr-7 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 appearance-none focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer"
                            value={b.color}
                            onChange={(e) => updateBag(b.id, 'color', e.target.value)}
                          >
                            <option value="">Color / Item...</option>
                            {COLOR_TYPES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} strokeWidth={2.2} />
                          </div>
                        </div>

                        {/* "NORM | BIG" rola toggle */}
                        <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSizeTypeChange(b.id, 'Norm')}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                              b.sizeType === 'Norm'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Norm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSizeTypeChange(b.id, 'Big')}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                              b.sizeType === 'Big'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Big
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* + Add Bag Button */}
                  <button
                    type="button"
                    onClick={addBag}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-white mt-2"
                  >
                    <Plus size={16} strokeWidth={2.5} /> Add Bag #{bags.length + 1}
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="px-6 py-3.5 flex items-center justify-end gap-3 bg-white border-t border-slate-200/80 shrink-0 z-20">
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
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium px-5 py-2 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save ${bags.length} Bag${bags.length > 1 ? 's' : ''} • ${fmtKg(totalFormNet)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- Grouped Cards List --- */}

      {displayReceipts.length === 0 && !loading ? (
        <EmptyState text={`No receiving entries found for ${formattedMonth}. Tap "+ New Receiving" to add one.`} />
      ) : searchedReceiptGroups.length === 0 ? (
        <div className="bg-white rounded-[20px] p-12 text-center border border-slate-200/80 shadow-xs mt-4">
          <Search size={32} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-800">No matching receipts found</h4>
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
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Gross</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Rola</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Net Kasab</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Bags</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchedReceiptGroups.map((group) => {
                    return (
                      <tr
                        key={group.id}
                        className="hover:bg-slate-50/80 active:bg-slate-100/60 transition-colors cursor-pointer select-none group/tr"
                        onClick={() => setSelectedGroupId(group.id)}
                      >
                        <td className="px-5 py-4 whitespace-nowrap align-middle">
                          {group.challan_no !== '—' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
                              Ch. #{group.challan_no}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-500 shrink-0">
                              No Ch.
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap align-middle">
                          <span className="font-bold text-[14px] text-slate-900 tracking-tight group-hover/tr:text-slate-900 group-hover/tr:underline transition-colors" title={group.party_name}>
                            {group.party_name}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap align-middle">
                          <span className="text-[12.5px] text-slate-500 font-medium">{fmtDate(group.date)}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                          <span className="text-[14px] font-medium text-slate-800 tabular-nums tracking-tight">
                            {fmtKg(group.gross)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                          {group.rola > 0 ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60 tabular-nums">
                                {group.rola} pcs
                              </span>
                              {group.hasBig && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300/60">
                                  BIG
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 select-none">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                          <span className="text-[14px] font-semibold text-slate-900 tabular-nums tracking-tight">
                            {fmtKg(group.net)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-700 tabular-nums">
                            {group.bagsCount} {group.bagsCount === 1 ? 'bag' : 'bags'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(group.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="View Receipt Details"
                              aria-label="View Receipt"
                            >
                              <Eye size={16} strokeWidth={2.2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (group.receipts[0]) {
                                  startEdit(group.receipts[0])
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Receipt Bags"
                              aria-label="Edit Receipt"
                            >
                              <MoreVertical size={16} strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
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
          <Plus size={20} strokeWidth={2.5} /> <span className="tracking-wide">New Receipt</span>
        </button>
      )}

      {/* --- Details Modal --- */}
      {selectedGroupId && (() => {
        const selectedGroup = groupedReceipts.find(g => g.id === selectedGroupId)
        if (!selectedGroup) return null

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200/80">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl shrink-0">
                   <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedGroup.party_name}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {selectedGroup.challan_no !== '—' ? `Ch. #${selectedGroup.challan_no}` : 'No Challan'} • {fmtDate(selectedGroup.date)}
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
                         <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Net Kasab</div>
                         <div className="text-lg font-semibold text-slate-900">{fmtKg(selectedGroup.net)}</div>
                      </div>
                      <div className="text-center flex-1 border-l border-slate-200/80">
                         <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Rola</div>
                         <div className="text-lg font-semibold text-slate-900">{selectedGroup.rola} pcs</div>
                      </div>
                   </div>

                   {/* Bag Items */}
                   <div className="space-y-2">
                     <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Bags ({selectedGroup.bagsCount})</h4>
                     {selectedGroup.receipts.map((r, idx) => (
                       <div key={r.id} className="group/row flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                             <span className="text-[11px] font-bold text-slate-600">#{idx + 1}</span>
                           </div>
                           
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{fmtKg(r.net_weight)}</span>
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net</span>
                               {r.color && (
                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 ml-1">
                                   {r.color}
                                 </span>
                               )}
                             </div>
                             
                             <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400">
                               <span>Gross: {fmtKg(r.gross_weight)}</span>
                               {r.rola_count > 0 && (
                                 <>
                                   <span>•</span>
                                   <span className="flex items-center gap-1">
                                     Rola: {r.rola_count} pcs
                                     {isBigRola(r.tare_weight, r.rola_count, resolvePartyRolaWeight(r.party)) && (
                                       <span className="text-amber-600 bg-amber-50 px-1 rounded text-[9px] uppercase tracking-wider ml-1">Big</span>
                                     )}
                                   </span>
                                 </>
                               )}
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); startEdit(r); setSelectedGroupId(null); }} className="p-2 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all text-gray-400 hover:text-gray-700">
                             <Pencil size={14} strokeWidth={2.5} />
                           </button>
                           
                           {deleting === r.id ? (
                             <div className="flex items-center" onClick={e => e.stopPropagation()}>
                               <ConfirmDelete
                                 onConfirm={() => handleDelete(r.id)}
                                 onCancel={() => setDeleting(null)}
                               />
                             </div>
                           ) : (
                             <button onClick={(e) => { e.stopPropagation(); setDeleting(r.id); }} className="p-2 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all text-gray-400 hover:text-red-500">
                               <Trash2 size={14} strokeWidth={2.5} />
                             </button>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        )
      })()}
    </div>
  )
}
