import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, X, AlertCircle, ChevronDown, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts, insertReceipts, updateReceipt, deleteReceipt, type ReceiptPayload } from '../lib/api/receipts'


import type { Party, ReceiptWithParty } from '../types'
import { COLOR_TYPES, fmtDate, fmtKg, todayStr } from '../types'
import { SectionHeader } from '../components/ui/SectionHeader'
import { KpiCard } from '../components/ui/KpiCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'
import { resolvePartyRolaWeight, resolvePartyBigRolaWeight, getGlobalSettings } from '../lib/settings'

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
  const monthGross = filteredReceipts.reduce((s, r) => s + (Number(r.gross_weight) || 0), 0)
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

    setBags([
      {
        id: r.id,
        gross: String(r.gross_weight),
        rolaCount: String(rolaCnt),
        perRolaGrams: originalPerRola,
        color: r.color || 'M.gold',
        twistType: 'S',
        sizeType: 'Norm'
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
      } catch {}
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

  const selectedPartyObj = parties.find(p => p.id === header.partyId)

  return (
    <div>
      <SectionHeader
        title="Raw Material Receiving"
        subtitle="Record raw kasab intake, calculate net weight, and manage Normal/Big rola tare"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Received Bags', value: filteredReceipts.length, sub: formattedMonth, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Net Kasab', value: fmtKg(monthNet), sub: formattedMonth, color: 'text-[#a57b3f]', bg: 'bg-[#a57b3f]/5' },
          { label: 'Gross Weight', value: fmtKg(monthGross), sub: 'raw yarn + rola', color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Rola Received', value: `${monthRola} pcs`, sub: 'empty spools', color: 'text-gray-600', bg: 'bg-gray-50' },
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

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording receiving entries." />
      )}

            {/* --- Slide-Up Form Modal --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-md sm:items-center sm:justify-center p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:w-[500px] rounded-t-[24px] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:slide-in-from-bottom-6 duration-400 ease-out max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1 bg-white shrink-0 sticky top-0 z-20">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4 pt-2 bg-white flex justify-between items-start shrink-0 sticky top-[20px] z-20 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-[#a57b3f]/70 uppercase mb-1.5">
                  {editingId ? 'EDIT CHALLAN' : 'NEW CHALLAN'}
                </p>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {parties.find(p => p.id === header.partyId)?.name || 'Select Party'}
                </h2>
              </div>
              <button 
                onClick={closeForm}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 relative">
              {errorMsg && (
                <div className="mb-5 rounded-[16px] p-4 text-xs font-bold flex items-center gap-2 bg-red-50 text-red-600 border border-red-100">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Metadata */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">
                    Party (From M/S) <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm appearance-none cursor-pointer"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Ch. No.</label>
                    <input
                      placeholder="Optional"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={header.challanNo}
                      onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[14px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                      value={header.date}
                      onChange={(e) => setHeader({ ...header, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bags Section */}
              <div className="space-y-4 mb-6">
                {bagCalculations.map(({ bag: b, tareKg, netKg }, idx) => (
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
                          <div className="text-[11px] font-bold text-red-500/90 leading-none">
                            -{fmtKg(tareKg)}
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
                    <div className="flex gap-3 mb-5">
                      <div className="flex-[2]">
                        <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">
                          Gross (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full h-[48px] px-4 bg-[#a57b3f]/5 border border-[#a57b3f]/20 rounded-[14px] text-[18px] font-black tabular-nums text-[#8c6530] placeholder:text-[#a57b3f]/30 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
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
                          className="w-full h-[48px] px-2 bg-gray-50 border border-gray-200/80 rounded-[14px] text-[18px] font-black tabular-nums text-gray-900 text-center placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all shadow-sm"
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
                          className={`w-9 h-8 rounded-[8px] text-[13px] font-bold transition-all cursor-pointer ${
                            b.twistType === 'S' 
                              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          S
                        </button>
                        <button 
                          type="button"
                          onClick={() => updateBag(b.id, 'twistType', 'Z')}
                          className={`w-9 h-8 rounded-[8px] text-[13px] font-bold transition-all cursor-pointer ${
                            b.twistType === 'Z' 
                              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Z
                        </button>
                      </div>
                      
                      <div className="flex-1 relative">
                        <select 
                          className="w-full h-10 pl-3 pr-6 bg-white border border-gray-200/80 rounded-[12px] text-[13px] font-bold text-gray-700 appearance-none focus:outline-none focus:border-[#a57b3f] shadow-sm cursor-pointer"
                          value={b.color}
                          onChange={(e) => updateBag(b.id, 'color', e.target.value)}
                        >
                          <option value="">Color...</option>
                          {COLOR_TYPES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={14} strokeWidth={3} />
                        </div>
                      </div>

                      <div className="flex p-1 bg-gray-50 border border-gray-200/80 rounded-[12px]">
                        <button 
                          type="button"
                          onClick={() => handleSizeTypeChange(b.id, 'Norm')}
                          className={`px-2 h-8 rounded-[8px] text-[12px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                            b.sizeType === 'Norm' 
                              ? 'bg-white text-[#a57b3f] shadow-sm border border-[#a57b3f]/20' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Norm
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleSizeTypeChange(b.id, 'Big')}
                          className={`px-2 h-8 rounded-[8px] text-[12px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                            b.sizeType === 'Big' 
                              ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Big
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Bag Button */}
                <button
                  type="button"
                  onClick={addBag}
                  className="w-full py-4 border-[2px] border-dashed border-[#d9c7aa] rounded-[16px] text-[14px] font-bold text-[#a57b3f] flex items-center justify-center gap-2 hover:bg-[#a57b3f]/5 hover:border-[#a57b3f]/50 transition-all cursor-pointer bg-white"
                >
                  <Plus size={18} strokeWidth={3} /> Add Bag #{bags.length + 1}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-4 pb-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 py-4 rounded-[14px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="flex-[2] py-4 rounded-[14px] font-black text-white bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#a57b3f]/50"
                >
                  {saving ? 'Saving...' : `Save ${bags.length} Bag${bags.length > 1 ? 's' : ''} • ${fmtKg(totalFormNet)}`}
                </button>
              </div>
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
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide bg-[#a57b3f] text-white shadow-sm shrink-0">
                          Ch. #{group.challan_no}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide bg-gray-100 text-gray-500 shrink-0">
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
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Gross</div>
                      <div className="text-[15px] font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(group.gross)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold text-red-400/80 uppercase tracking-widest mb-1">Tare</div>
                      <div className="text-[15px] font-black text-red-500 tabular-nums tracking-tight">{group.tare > 0 ? '-' : ''}{fmtKg(group.tare)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Rola</div>
                      <div className="text-[15px] font-black text-gray-700 tabular-nums tracking-tight flex items-center gap-1.5">
                        {group.rola} <span className="text-[11px] font-bold text-gray-400">pcs</span>
                        {group.rola > 0 && group.hasBig && <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Big</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-extrabold text-[#a57b3f]/70 uppercase tracking-widest mb-1">Net Kasab</div>
                      <div className="text-[17px] font-black text-[#a57b3f] tabular-nums tracking-tight">{fmtKg(group.net)}</div>
                    </div>
                  </div>
                  
                  {group.bagsCount > 0 && (
                    <div className="mt-3 inline-flex items-center bg-gray-50 border border-gray-200 text-gray-500 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                      {group.bagsCount} Bag{group.bagsCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Expanded Individual Rows */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100/80 bg-white border-t border-gray-100/80">
                    {group.receipts.map((r, idx) => (
                      <div
                        key={r.id}
                        className={`px-5 py-4 hover:bg-amber-50/30 transition-colors group/row ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider bg-white text-gray-600 border border-gray-200">
                              Bag #{idx + 1}
                            </span>
                            {r.color && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-gray-700 border border-gray-200 shadow-sm">
                                {r.color}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); startEdit(r); }}
                              className="p-2 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                              title="Edit Bag"
                            >
                              <Pencil size={16} strokeWidth={2.5} />
                            </button>
                            
                            {deleting === r.id ? (
                              <div className="flex items-center gap-1.5 text-xs bg-red-50 px-2 py-1 rounded-xl border border-red-100">
                                <span className="text-red-600 font-bold px-1">Sure?</span>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg font-bold shadow-sm hover:bg-red-600 transition-colors">Yes</button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleting(null); }} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 transition-colors">No</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDeleting(r.id); }}
                                className="p-2 rounded-xl flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Bag"
                              >
                                <Trash2 size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mt-3 text-[14px]">
                          <div className="flex items-baseline gap-2 text-gray-500 font-medium">
                            <span className="font-black text-gray-900 tabular-nums tracking-tight">{fmtKg(r.gross_weight)}</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Gross</span>
                            <span className="text-gray-300">·</span>
                            <span className="font-black text-red-500 tabular-nums tracking-tight">-{fmtKg(r.tare_weight)}</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-red-400/80">Tare</span>
                          </div>
                          <div className="text-[17px] font-black text-[#a57b3f] tabular-nums tracking-tight mt-1 sm:mt-0 text-right">
                            {fmtKg(r.net_weight)}
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

      {/* Floating Action Button (+ New Receipt) */}
      {!isOpen && (
        <button
          onClick={startAdd}
          className="fixed bottom-[80px] right-5 sm:right-8 bg-gradient-to-b from-[#b58c50] to-[#997036] hover:from-[#a57b3f] hover:to-[#8a632b] text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(165,123,63,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(165,123,63,0.6)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-[#c49a5d]/50 hover:-translate-y-1"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">New Receipt</span>
        </button>
      )}
    </div>
  )
}
