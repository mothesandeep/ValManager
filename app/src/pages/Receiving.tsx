import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, X, AlertCircle, ChevronDown, Pencil } from 'lucide-react'
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
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'
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
    id: Math.random().toString(36).substring(2, 9),
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

  const startAdd = () => {
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
      if (editingId === id) closeForm()
      await loadData()
    } catch (err) {
      console.error('Delete error:', err)
      setErrorMsg('Could not delete receipt')
    }
  }

  const [expandedChallans, setExpandedChallans] = useState<Set<string>>(new Set())
  const toggleChallan = (key: string) =>
    setExpandedChallans((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

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

    filteredReceipts.forEach(r => {
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
  }, [filteredReceipts])



  return (
    <div>
      <PageHeader
        title="Raw Material Receiving"
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
      {!isOpen && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Net Kasab', value: fmtKg(monthNet), sub: formattedMonth, color: 'text-gray-900' },
            { label: 'Rola Received', value: `${monthRola} pcs`, sub: 'empty spools', color: 'text-[var(--color-brass)]' },
          ].map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="rounded-[16px] px-4 py-3 sm:py-3.5 bg-white shadow-sm border border-gray-100 transition-shadow hover:shadow-md"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)] mb-2">
                {label}
              </div>
              {loading ? (
                <div className="h-7 w-20 rounded bg-[var(--color-paper)] animate-pulse mb-1" />
              ) : (
                <div className={`text-[20px] font-black tabular-nums leading-none tracking-tight ${color} mb-1.5`}>
                  {value}
                </div>
              )}
              <div className="text-[11px] font-medium text-[var(--color-ink-soft)]">
                {sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording receiving entries." />
      )}

      {/* --- Slide-Up Form Modal --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:max-w-4xl rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-300 ease-out max-h-[90dvh] sm:max-h-[85dvh]">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white shrink-0 z-20">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start border-b border-gray-100 shrink-0 z-20">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-[#a57b3f] uppercase mb-1.5">
                  {editingId ? 'EDIT CHALLAN' : 'NEW CHALLAN'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
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
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer shrink-0"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto relative">
              {errorMsg && (
                <div className="mb-5 rounded-[16px] p-4 text-xs font-bold flex items-center gap-2 bg-red-50 text-red-600 border border-red-100">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Metadata */}
              <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4 mb-6">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">
                    Party (From M/S) <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-[48px] sm:h-[40px] px-4 sm:px-3 bg-gray-50/50 sm:bg-gray-50 border border-gray-200/80 sm:border-transparent rounded-[14px] sm:rounded-lg text-[15px] sm:text-[14px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 sm:focus:ring-[#a57b3f]/20 transition-all appearance-none cursor-pointer shadow-sm sm:shadow-none"
                    value={header.partyId}
                    onChange={(e) => handlePartyChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Party...</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:contents">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Ch. No.</label>
                    <input
                      placeholder="Optional"
                      className="w-full h-[48px] sm:h-[40px] px-4 sm:px-3 bg-gray-50/50 sm:bg-gray-50 border border-gray-200/80 sm:border-transparent rounded-[14px] sm:rounded-lg text-[15px] sm:text-[14px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 sm:focus:ring-[#a57b3f]/20 transition-all shadow-sm sm:shadow-none"
                      value={header.challanNo}
                      onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      className="w-full h-[48px] sm:h-[40px] px-4 sm:px-3 bg-gray-50/50 sm:bg-gray-50 border border-gray-200/80 sm:border-transparent rounded-[14px] sm:rounded-lg text-[15px] sm:text-[14px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 sm:focus:ring-[#a57b3f]/20 transition-all shadow-sm sm:shadow-none"
                      value={header.date}
                      onChange={(e) => setHeader({ ...header, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bags Section */}
              <div className="mb-6">
                {/* --- MOBILE CARDS --- */}
                <div className="sm:hidden space-y-4">
                  {bagCalculations.map(({ bag: b, netKg }, idx) => (
                    <div key={b.id} className="bg-white border border-gray-200/60 rounded-[20px] p-5 shadow-sm relative transition-all hover:shadow-md">

                      {/* Bag Header */}
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center text-xs font-black shadow-sm">
                            {idx + 1}
                          </div>
                          <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Bag #{idx + 1}</span>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="text-right">
                            <div className="text-[9px] font-extrabold text-gray-400 tracking-widest uppercase mb-0.5">Net Kasab</div>
                            <div className="text-[20px] font-black text-[#a57b3f] tabular-nums leading-none tracking-tight mb-1">
                              {fmtKg(netKg)}
                            </div>
                          </div>
                          {bags.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBag(b.id)}
                              className="p-1.5 -mr-1.5 -mt-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex gap-3">
                          <div className="flex-[2]">
                            <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">
                              Gross (kg) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              className="w-full h-[48px] px-4 bg-[#a57b3f]/5 border border-[#a57b3f]/20 rounded-[14px] text-[18px] font-black tabular-nums text-[#8c6530] placeholder:text-[#a57b3f]/30 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                              placeholder="e.g. 30.010"
                              value={b.gross}
                              onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                            />
                          </div>
                          <div className="flex-1 min-w-[80px]">
                            <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1 text-center">
                              Rola
                            </label>
                            <input
                              type="number"
                              className="w-full h-[48px] px-2 bg-gray-50 border border-gray-200/80 rounded-[14px] text-[18px] font-black tabular-nums text-gray-900 text-center placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all shadow-sm"
                              placeholder="60"
                              value={b.rolaCount}
                              onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Bottom Row (S/Z/Color/Norm/Big) */}
                        <div className="flex items-center gap-2">
                          <div className="flex p-1 bg-gray-50 border border-gray-200/80 rounded-[12px]">
                            <button
                              type="button"
                              onClick={() => updateBag(b.id, 'twistType', 'S')}
                              className={`w-9 h-8 rounded-[8px] text-[13px] font-bold transition-all cursor-pointer ${b.twistType === 'S'
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => updateBag(b.id, 'twistType', 'Z')}
                              className={`w-9 h-8 rounded-[8px] text-[13px] font-bold transition-all cursor-pointer ${b.twistType === 'Z'
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              Z
                            </button>
                          </div>

                          <div className="flex-1 relative">
                            <select
                              className="w-full h-[40px] pl-3 pr-6 bg-white border border-gray-200/80 rounded-[12px] text-[13px] font-bold text-gray-700 appearance-none focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/10 shadow-sm cursor-pointer"
                              value={b.color}
                              onChange={(e) => updateBag(b.id, 'color', e.target.value)}
                            >
                              <option value="">Color...</option>
                              {COLOR_TYPES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={14} strokeWidth={3} />
                            </div>
                          </div>

                          <div className="flex p-1 bg-gray-50 border border-gray-200/80 rounded-[12px]">
                            <button
                              type="button"
                              onClick={() => handleSizeTypeChange(b.id, 'Norm')}
                              className={`px-2 h-8 rounded-[8px] text-[12px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${b.sizeType === 'Norm'
                                ? 'bg-white text-[#a57b3f] shadow-sm border border-[#a57b3f]/20'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              Norm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSizeTypeChange(b.id, 'Big')}
                              className={`px-2 h-8 rounded-[8px] text-[12px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${b.sizeType === 'Big'
                                ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                              Big
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Bag Button (Mobile) */}
                  <button
                    type="button"
                    onClick={addBag}
                    className="w-full py-4 border-[2px] border-dashed border-[#d9c7aa] rounded-[16px] text-[14px] font-bold text-[#a57b3f] flex items-center justify-center gap-2 hover:bg-[#a57b3f]/5 hover:border-[#a57b3f]/50 transition-all cursor-pointer bg-white mt-4"
                  >
                    <Plus size={18} strokeWidth={3} /> Add Bag #{bags.length + 1}
                  </button>
                </div>

                {/* --- DESKTOP TABLE --- */}
                <div className="hidden sm:block">
                  <div className="border border-gray-200/80 rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-200/80 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
                          <th className="py-3 px-3 w-12 text-center">#</th>
                          <th className="py-3 px-3 w-28">Gross (kg)</th>
                          <th className="py-3 px-3 w-24 text-center">Rola</th>
                          <th className="py-3 px-3 w-28 text-center">Twist</th>
                          <th className="py-3 px-3">Color</th>
                          <th className="py-3 px-3 w-32 text-center">Size</th>
                          <th className="py-3 px-4 w-36 text-right">Net Kasab</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bagCalculations.map(({ bag: b, netKg }, idx) => (
                          <tr key={b.id} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="py-2.5 px-3 text-center align-middle">
                              <div className="w-6 h-6 mx-auto relative flex items-center justify-center">
                                <div className={`w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] font-black transition-opacity ${bags.length > 1 ? 'group-hover:opacity-0' : ''}`}>
                                  {idx + 1}
                                </div>
                                {bags.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeBag(b.id)}
                                    className="absolute inset-0 m-auto w-6 h-6 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                  >
                                    <Trash2 size={14} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <input
                                type="number"
                                step="0.001"
                                className="w-full h-[38px] px-3 bg-gray-50 border border-transparent rounded-lg text-[14px] font-bold tabular-nums text-gray-900 placeholder-gray-300 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/20 transition-all"
                                placeholder="30.000"
                                value={b.gross}
                                onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <input
                                type="number"
                                className="w-full h-[38px] px-3 bg-gray-50 border border-transparent rounded-lg text-[14px] font-bold tabular-nums text-gray-900 text-center placeholder-gray-300 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/20 transition-all"
                                placeholder="60"
                                value={b.rolaCount}
                                onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <div className="flex bg-gray-50 p-1 rounded-lg h-[38px] items-center">
                                {['S', 'Z'].map(tw => (
                                  <button
                                    key={tw}
                                    type="button"
                                    onClick={() => updateBag(b.id, 'twistType', tw as any)}
                                    className={`flex-1 h-full rounded-md text-[13px] font-bold transition-all cursor-pointer ${b.twistType === tw ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                      }`}
                                  >
                                    {tw}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 relative align-middle">
                              <select
                                className="w-full h-[38px] pl-3 pr-8 bg-gray-50 border border-transparent rounded-lg text-[13px] font-bold text-gray-700 appearance-none hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#a57b3f] focus:ring-2 focus:ring-[#a57b3f]/20 transition-all cursor-pointer"
                                value={b.color}
                                onChange={(e) => updateBag(b.id, 'color', e.target.value)}
                              >
                                <option value="">Color...</option>
                                {COLOR_TYPES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={14} strokeWidth={3} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <div className="flex bg-gray-50 p-1 rounded-lg h-[38px] items-center">
                                {['Norm', 'Big'].map(sz => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => handleSizeTypeChange(b.id, sz as any)}
                                    className={`flex-1 h-full rounded-md text-[11px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${b.sizeType === sz
                                      ? sz === 'Norm'
                                        ? 'bg-white text-[#a57b3f] shadow-sm border border-gray-200/50'
                                        : 'bg-[#a57b3f] text-white shadow-sm'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                      }`}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right align-middle whitespace-nowrap">
                              <div className="flex flex-col items-end">
                                <div className="text-[16px] font-black text-[#8c6530] tabular-nums leading-none">
                                  {fmtKg(netKg)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={7} className="p-0">
                            <button
                              type="button"
                              onClick={addBag}
                              className="w-full py-3.5 text-[12px] font-extrabold uppercase tracking-widest text-[#a57b3f] hover:text-[#8c6530] hover:bg-amber-50/30 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus size={16} strokeWidth={2.5} /> Add Row
                            </button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="border-t-2 border-gray-100">
                        <tr>
                          <td colSpan={5}></td>
                          <td className="py-4 px-3 text-right align-middle">
                            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total Net Kasab</span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap align-middle">
                            <span className="text-[22px] font-black text-[#a57b3f] tabular-nums leading-none tracking-tight">{fmtKg(totalFormNet)}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 flex sm:justify-end gap-3 bg-white border-t border-gray-100 shrink-0 z-20">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 sm:flex-none sm:px-6 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px] sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-black text-white bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#a57b3f]/50 text-[15px] sm:text-sm"
              >
                {saving ? 'Saving...' : `Save ${bags.length} Bag${bags.length > 1 ? 's' : ''} • ${fmtKg(totalFormNet)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- Grouped Cards List --- */}
      {groupedReceipts.length === 0 && !loading ? (
        <EmptyState text={`No receiving entries found for ${formattedMonth}.`} />
      ) : (
        <div className="mt-6 space-y-4 pb-28 animate-in fade-in duration-500">
          {groupedReceipts.map((group) => {
            const isExpanded = group.receipts.length === 1 || expandedChallans.has(group.id)
            const multiRow = group.receipts.length > 1

            return (
              <div
                key={group.id}
                className={`rounded-[24px] overflow-hidden bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] border border-gray-100 transition-all ${isExpanded ? 'shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]' : ''}`}
              >
                {/* Card Header */}
                <div
                  className={`px-5 py-4 ${multiRow ? 'cursor-pointer hover:bg-gray-50/50 transition-colors select-none' : ''}`}
                  onClick={() => multiRow && toggleChallan(group.id)}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                      {group.challan_no !== '—' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-amber-50 text-amber-800 border border-amber-200/50 shrink-0">
                          Ch. #{group.challan_no}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-gray-50 text-gray-500 border border-gray-200/50 shrink-0">
                          No Ch.
                        </span>
                      )}
                      <h3 className="font-extrabold text-[16px] text-gray-900 truncate tracking-tight">{group.party_name}</h3>
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

                  {/* Card Body Grid */}
                  <div className="grid grid-cols-[1.2fr_1.2fr_1.5fr_auto] gap-2 sm:gap-4 items-end w-full">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Gross</span>
                      <span className="text-[15px] font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(group.gross)}</span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      {group.rola > 0 && (
                        <>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Rola</span>
                          <span className="text-[15px] font-black text-gray-700 tabular-nums tracking-tight flex items-center gap-1.5">
                            {group.rola} <span className="text-[11px] font-bold text-gray-400">pcs</span>
                            {group.hasBig && <span className="bg-amber-50 text-amber-600 border border-amber-200/50 text-[9px] px-1 py-0.5 rounded font-black uppercase tracking-wider">Big</span>}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#a57b3f]/70 mb-0.5">Net Kasab</span>
                      <span className="text-[17px] font-black text-[#a57b3f] tabular-nums tracking-tight">{fmtKg(group.net)}</span>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
                        Bags
                      </span>
                      <span className="text-[15px] font-black text-gray-600">
                        {group.bagsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Individual Rows */}
                {isExpanded && (
                  <div className="flex flex-col gap-0 bg-gray-50/60 border-t border-gray-100 px-3 py-2.5 divide-y divide-gray-100/70">
                    {group.receipts.map((r, idx) => (
                      <div
                        key={r.id}
                        className="group/row flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        {/* Left accent bar */}
                        <div className="w-0.5 self-stretch rounded-full flex-shrink-0 bg-[#c9a96e]/50" />

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          {/* Top Bar: Badges & Actions */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 bg-white text-gray-600 border border-gray-200 shadow-sm">
                              Bag #{idx + 1}
                            </span>
                            {r.color && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-gray-700 border border-gray-200 shadow-sm shrink-0">
                                {r.color}
                              </span>
                            )}

                            <div className="ml-auto flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                              <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(r); }} className="p-1.5 rounded-lg flex items-center justify-center hover:bg-white text-gray-300 hover:text-gray-600 transition-colors cursor-pointer" title="Edit Bag">
                                <Pencil size={13} strokeWidth={2.5} />
                              </button>
                              {deleting === r.id ? (
                                <div className="flex items-center gap-1 text-xs bg-red-50 px-1.5 py-1 rounded-lg border border-red-100">
                                  <span className="text-red-600 font-bold text-[10px]">Sure?</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600 transition-colors">Yes</button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleting(null); }} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 font-bold hover:bg-gray-50 transition-colors">No</button>
                                </div>
                              ) : (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setDeleting(r.id); }} className="p-1.5 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors cursor-pointer" title="Delete Bag">
                                  <Trash2 size={13} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Data Grid: Inline like Dispatch */}
                          <div className="flex items-baseline justify-between mt-1">
                            <div className="flex items-baseline gap-1.5 flex-nowrap w-full overflow-hidden">
                              <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-[13px] font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(r.gross_weight)}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Gross</span>
                              </div>
                              
                              {r.rola_count > 0 && (
                                <>
                                  <span className="text-gray-200 text-[10px] shrink-0">|</span>
                                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                                    <span className="text-[12px] font-bold text-gray-600 tabular-nums">{r.rola_count} pcs</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Rola</span>
                                    {isBigRola(r.tare_weight, r.rola_count, resolvePartyRolaWeight(r.party)) && (
                                      <span className="bg-amber-50 text-amber-600 border border-amber-200/50 text-[9px] px-1 py-0.5 rounded font-black uppercase tracking-wider ml-1">Big</span>
                                    )}
                                  </div>
                                </>
                              )}

                              <span className="text-gray-200 text-[10px] shrink-0">|</span>
                              
                              <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-[13px] font-black text-[#a57b3f] tabular-nums tracking-tight">{fmtKg(r.net_weight)}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#a57b3f]/80">Net</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!isOpen && (
        <button
          onClick={startAdd}
          className="sm:hidden fixed bottom-[80px] right-5 bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(165,123,63,0.5)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-[#a57b3f]/50"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">New Receipt</span>
        </button>
      )}
    </div>
  )
}
