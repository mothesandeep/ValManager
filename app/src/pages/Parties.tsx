import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  BookOpen,
  X,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  FileText,
  LayoutGrid,
  List,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { fetchParties, insertParty, updateParty, deleteParty } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchPayments } from '../lib/api/payments'
import { computePartyStats } from '../lib/api/stats'


import type { Party, PartyStats } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import type { PaymentWithParty } from '../features/payments/types'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import PartyKhataModal from '../features/parties/components/PartyKhataModal'

interface PartyFormState {
  id: string | null
  name: string
  phone: string
  address: string
  notes: string
  rolaWeight: string
  bungariWeight: string
}

const EMPTY_FORM: PartyFormState = {
  id: null,
  name: '',
  phone: '',
  address: '',
  notes: '',
  rolaWeight: '',
  bungariWeight: '',
}

function formatPhone(phone?: string | null): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
  }
  return phone
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_PALETTES = [
  { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200/80' },
  { bg: 'bg-slate-200/60', text: 'text-slate-900', border: 'border-slate-300' },
  { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-200' },
  { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
  { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  { bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-200' },
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [payments, setPayments] = useState<PaymentWithParty[]>([])
  const [stats, setStats] = useState<Record<string, PartyStats>>({})
  const [loading, setLoading] = useState(true)

  // Toast & View Toggle State
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Search & Filter Toolbar State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccount, setFilterAccount] = useState<'all' | 'due' | 'rola'>('all')
  const [sortOption, setSortOption] = useState<'name' | 'balance' | 'rola'>('name')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Khata Modal
  const [activeKhataParty, setActiveKhataParty] = useState<Party | null>(null)

  // Form State
  const [form, setForm] = useState<PartyFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [partiesData, receiptsData, dispatchesData, paymentsData] = await Promise.all([
        fetchParties(),
        fetchReceipts(),
        fetchDispatches(),
        fetchPayments(),
      ])

      setParties(partiesData)
      setReceipts(receiptsData)
      setDispatches(dispatchesData)
      setPayments(paymentsData)

      const computed = computePartyStats(partiesData, receiptsData, dispatchesData, paymentsData)
      setStats(computed)
    } catch (err) {
      console.error('Error loading parties:', err)
      setErrorMsg('Could not load parties. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Close three-dots menu when clicking outside
  useEffect(() => {
    const handleCloseMenu = () => setMenuOpenId(null)
    window.addEventListener('click', handleCloseMenu)
    return () => window.removeEventListener('click', handleCloseMenu)
  }, [])

  // Handle mobile hardware back button to close Khata Modal
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== '#modal' && activeKhataParty) {
        setActiveKhataParty(null)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeKhataParty])

  // Filtered and Sorted Parties
  const filteredAndSortedParties = useMemo(() => {
    let result = [...parties]

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q)
        const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false
        const addressMatch = p.address ? p.address.toLowerCase().includes(q) : false
        return nameMatch || phoneMatch || addressMatch
      })
    }

    if (filterAccount === 'due') {
      result = result.filter((p) => (stats[p.id]?.balance || 0) > 0)
    } else if (filterAccount === 'rola') {
      result = result.filter((p) => (stats[p.id]?.rolaPending || 0) > 0)
    }

    result.sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortOption === 'balance') {
        return (stats[b.id]?.balance || 0) - (stats[a.id]?.balance || 0)
      } else if (sortOption === 'rola') {
        return (stats[b.id]?.rolaPending || 0) - (stats[a.id]?.rolaPending || 0)
      }
      return 0
    })

    return result
  }, [parties, searchQuery, filterAccount, sortOption, stats])

  const startAdd = () => {
    setForm({ ...EMPTY_FORM })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (p: Party) => {
    setForm({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      address: p.address || '',
      notes: p.notes || '',
      rolaWeight:
        p.default_rola_weight_g !== null && p.default_rola_weight_g !== undefined
          ? String(p.default_rola_weight_g)
          : '',
      bungariWeight:
        p.default_bungari_weight_g !== null && p.default_bungari_weight_g !== undefined
          ? String(p.default_bungari_weight_g)
          : '',
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim()) return
    setSaving(true)
    setErrorMsg(null)

    const rolaG = form.rolaWeight ? parseInt(form.rolaWeight, 10) : null
    const bungariG = form.bungariWeight ? parseInt(form.bungariWeight, 10) : null

    try {
      if (form.id) {
        await updateParty(form.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          default_rola_weight_g: rolaG,
          default_bungari_weight_g: bungariG,
        })
      } else {
        await insertParty({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          default_rola_weight_g: rolaG,
          default_bungari_weight_g: bungariG,
        })
      }
      const isEdit = Boolean(form.id)
      setForm(null)
      showToast(isEdit ? 'Party account updated successfully' : 'Party registered successfully')
      await loadData()
    } catch (err: unknown) {
      console.error('Save party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save party — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteParty(id)
      setDeleting(null)
      showToast('Party deleted successfully')
      await loadData()
    } catch (err: unknown) {
      console.error('Delete party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Party Directory"
        description="Party management, material standing, and statement overview"
        actions={
          !form && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} variant="primary">
                <Plus size={18} strokeWidth={2.5} /> New Party
              </Button>
            </div>
          )
        }
      />

      {errorMsg && (
        <div
          className="rounded-lg p-3 mb-4 text-xs font-medium flex items-center justify-between shadow-xs"
          style={{ background: 'var(--color-due-bg)', color: 'var(--color-due)' }}
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Search & Filter Toolbar ──────────────────────────────── */}
      {!form && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by party name, phone number, or area..."
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

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 h-10 shadow-xs">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value as 'all' | 'due' | 'rola')}
                aria-label="Filter accounts"
                className="bg-transparent text-[12.5px] font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Accounts ({parties.length})</option>
                <option value="due">Has Balance Due</option>
                <option value="rola">Has Pending Rola</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 h-10 shadow-xs">
              <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as 'name' | 'balance' | 'rola')}
                aria-label="Sort accounts"
                className="bg-transparent text-[12.5px] font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                <option value="name">Name (A-Z)</option>
                <option value="balance">Highest Outstanding</option>
                <option value="rola">Most Pending Rola</option>
              </select>
            </div>

            {/* View Mode Toggle (Grid vs Table) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parties Grid ─────────────────────────────────────────── */}
      {!form && (
        <div className="pb-28">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[20px] p-5 h-56 animate-pulse bg-white border border-slate-200/80 shadow-xs"
                />
              ))}
            </div>
          ) : parties.length === 0 ? (
            <EmptyState text="No parties yet. Add the first party to start tracking their work." />
          ) : filteredAndSortedParties.length === 0 ? (
            <div className="bg-white rounded-[20px] p-12 text-center border border-slate-200/80 shadow-xs mt-2">
              <Search size={32} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-800">No matching accounts found</h4>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery ? `No parties matching "${searchQuery}"` : 'No parties match the selected filter'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setFilterAccount('all')
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {filteredAndSortedParties.map((p) => {
                const s = stats[p.id] || { rolaPending: 0, balance: 0 }
                const avatarStyle = getAvatarColor(p.name)

                return (
                  <div
                    key={p.id}
                    className="border border-slate-200/80 shadow-xs rounded-xl bg-white hover:border-slate-300 transition-all duration-200 p-5 flex flex-col justify-between group relative min-h-[260px]"
                  >
                    <div>
                      {/* Top Header: Initials Avatar + Name & Phone + Three-dots Menu */}
                      <div className="flex items-start justify-between gap-2 mb-3 relative">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-[13.5px] shrink-0 border ${avatarStyle.bg} ${avatarStyle.text} ${avatarStyle.border} shadow-2xs select-none`}
                          >
                            {getInitials(p.name)}
                          </div>
                          <div className="min-w-0">
                            <h3
                              className="font-bold text-[16px] text-slate-900 tracking-tight truncate leading-tight group-hover:text-slate-900 transition-colors"
                              title={p.name}
                            >
                              {p.name}
                            </h3>
                            {p.phone ? (
                              <p className="text-[12px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <span>{formatPhone(p.phone)}</span>
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">No contact</span>
                            )}
                          </div>
                        </div>

                        {/* Three-dots Menu */}
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Party options"
                            aria-label="Party options"
                          >
                            <MoreVertical size={16} strokeWidth={2.2} />
                          </button>

                          {menuOpenId === p.id && (
                            <div className="absolute right-0 top-9 z-30 w-48 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  edit(p)
                                }}
                                className="w-full px-3.5 py-2 text-left text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Pencil size={14} className="text-slate-400" />
                                <span>Edit Details</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  window.location.hash = 'modal'
                                  setActiveKhataParty(p)
                                }}
                                className="w-full px-3.5 py-2 text-left text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <FileText size={14} className="text-slate-400" />
                                <span>View Statement</span>
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  setDeleting(p.id)
                                }}
                                className="w-full px-3.5 py-2 text-left text-[12.5px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} className="text-rose-500" />
                                <span>Delete Party</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="min-h-[36px] my-1 flex items-start">
                        {p.address ? (
                          <p
                            className="text-[12px] text-slate-500 flex items-start gap-1.5 leading-snug line-clamp-2"
                            title={p.address}
                          >
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{p.address}</span>
                          </p>
                        ) : (
                          <span className="text-[11.5px] text-slate-400 italic">No address provided</span>
                        )}
                      </div>

                      {/* Notes (if any) */}
                      {p.notes && (
                        <p className="text-[11.5px] text-slate-400 mt-1 italic font-medium truncate" title={p.notes}>
                          &ldquo;{p.notes}&rdquo;
                        </p>
                      )}

                      {/* Rola and Bungri config badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs">
                          Rola: {p.default_rola_weight_g ? `${p.default_rola_weight_g}g` : '200g'}
                        </span>
                        {p.default_bungari_weight_g && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200/70">
                            Bungri: {p.default_bungari_weight_g}g
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* Accounting Standing: Pending Rola & Balance Due */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-100/90 items-end">
                        {/* Pending Rola */}
                        <div>
                          <div className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-1">
                            Pending Rola
                          </div>
                          {s.rolaPending < 0 ? (
                            <span
                              className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-md tabular-nums"
                              title={`${Math.abs(s.rolaPending)} pcs return received in advance`}
                            >
                              +{Math.abs(s.rolaPending)} Adv Return
                            </span>
                          ) : s.rolaPending > 0 ? (
                            <div className="font-bold tabular-nums text-[16px] text-slate-800 leading-none">
                              {s.rolaPending} <span className="text-[11px] font-medium text-slate-500">pcs</span>
                            </div>
                          ) : (
                            <div className="font-medium tabular-nums text-[14px] text-slate-400 leading-none">
                              0 pcs
                            </div>
                          )}
                        </div>

                        {/* Balance Due / Advance */}
                        <div className="text-right">
                          {s.balance < 0 ? (
                            <div className="flex flex-col items-end">
                              <div className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-1">
                                Credit / Advance
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {fmtMoney(Math.abs(s.balance))} (Credit)
                              </span>
                            </div>
                          ) : s.balance > 0 ? (
                            <div className="flex flex-col items-end">
                              <div className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-1">
                                Balance Due
                              </div>
                              <div className="text-rose-600 font-bold font-mono tabular-nums text-[17px] tracking-tight leading-none">
                                {fmtMoney(s.balance)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <div className="text-slate-400 text-xs uppercase font-semibold tracking-wider mb-1">
                                Balance Due
                              </div>
                              <div className="font-medium font-mono tabular-nums text-[15px] text-slate-500 leading-none">
                                ₹0
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline Delete Confirmation */}
                      {deleting === p.id && (
                        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-700">Delete party?</span>
                          <ConfirmDelete
                            onConfirm={() => handleDelete(p.id)}
                            onCancel={() => setDeleting(null)}
                          />
                        </div>
                      )}

                      {/* ── 📖 Party Khata / Passbook ─ */}
                      <div className="mt-4 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = 'modal'
                            setActiveKhataParty(p)
                          }}
                          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg text-slate-700 font-medium text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.99] group/btn"
                        >
                          <BookOpen
                            size={14}
                            strokeWidth={2}
                            className="text-slate-500 group-hover/btn:text-slate-800 transition-colors"
                          />
                          <span>Statement / Khata</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75">
                    <th className="pl-5 pr-3 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Party Name</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Total Billed</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Total Received</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Balance Due / Advance</th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Pending Rola</th>
                    <th className="pl-4 pr-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Statement Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedParties.map((p) => {
                    const s = stats[p.id] || { rolaPending: 0, balance: 0, receivable: 0, received: 0 }
                    const avatarStyle = getAvatarColor(p.name)

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/75 transition-colors group cursor-pointer"
                        onClick={() => {
                          window.location.hash = 'modal'
                          setActiveKhataParty(p)
                        }}
                      >
                        {/* Party Name */}
                        <td className="pl-5 pr-3 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[12px] shrink-0 border ${avatarStyle.bg} ${avatarStyle.text} ${avatarStyle.border} select-none`}
                            >
                              {getInitials(p.name)}
                            </div>
                            <div>
                              <span className="font-bold text-[13.5px] text-slate-900 group-hover:text-slate-900 group-hover:underline transition-colors block">
                                {p.name}
                              </span>
                              {p.address && (
                                <span className="text-[11px] font-medium text-slate-400 block truncate max-w-[180px]">
                                  {p.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                          {p.phone ? (
                            <a
                              href={`tel:${p.phone}`}
                              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Phone size={12} className="text-slate-400 shrink-0" />
                              <span>{formatPhone(p.phone)}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Total Billed */}
                        <td className="px-4 py-3.5 align-middle text-right">
                          <span className="text-[13.5px] font-bold tabular-nums text-slate-800">
                            {fmtMoney(s.receivable || 0)}
                          </span>
                        </td>

                        {/* Total Received */}
                        <td className="px-4 py-3.5 align-middle text-right">
                          <span className="text-[13.5px] font-bold tabular-nums text-emerald-700">
                            {fmtMoney(s.received || 0)}
                          </span>
                        </td>

                        {/* Balance Due / Advance */}
                        <td className="px-4 py-3.5 align-middle text-right">
                          {s.balance < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {fmtMoney(Math.abs(s.balance))} (Advance)
                            </span>
                          ) : s.balance > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-black tabular-nums bg-rose-50 text-rose-700 border border-rose-200/80">
                              {fmtMoney(s.balance)} (Due)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/70">
                              Settled
                            </span>
                          )}
                        </td>

                        {/* Pending Rola */}
                        <td className="px-4 py-3.5 align-middle text-right">
                          {s.rolaPending < 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60 tabular-nums">
                              +{Math.abs(s.rolaPending)} Adv
                            </span>
                          ) : s.rolaPending > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 tabular-nums">
                              {s.rolaPending} pcs
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">0 pcs</span>
                          )}
                        </td>

                        {/* Statement Actions */}
                        <td className="pl-4 pr-6 py-3.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                window.location.hash = 'modal'
                                setActiveKhataParty(p)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white transition-all cursor-pointer shadow-2xs"
                              title="View Party Khata / Ledger"
                            >
                              <BookOpen size={13} strokeWidth={2.2} />
                              <span>Khata</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => edit(p)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Party"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleting(p.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Party"
                            >
                              <Trash2 size={14} />
                            </button>
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
      )}

      {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-200 ease-out max-h-[90dvh] sm:max-h-[85dvh] overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white shrink-0 sticky top-0 z-10">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start shrink-0 sticky top-0 sm:top-0 z-10 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-1.5">
                  {form.id ? 'EDIT PARTY' : 'NEW PARTY'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Party Details
                </h2>
              </div>
              <button 
                onClick={() => setForm(null)}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 bg-[#fcfcfb] space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Party Name *</label>
                  <input
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Jariwala"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 98250 12345"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Address</label>
                  <input
                    placeholder="e.g. Katargam, Surat"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Notes</label>
                  <input
                    placeholder="e.g. Regular 8-cord party"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Def. Rola (g)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="200"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm placeholder:text-gray-300"
                      value={form.rolaWeight}
                      onChange={(e) => setForm({ ...form, rolaWeight: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Def. Bungri (g)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="70"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm placeholder:text-gray-300"
                      value={form.bungariWeight}
                      onChange={(e) => setForm({ ...form, bungariWeight: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  disabled={saving}
                  className="flex-1 py-4 rounded-[14px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-4 rounded-[14px] font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-900"
                >
                  {saving ? 'Saving...' : form.id ? 'Update Party' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!form && (
        <button
          onClick={startAdd}
          className="sm:hidden fixed bottom-[80px] right-5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-2.5 font-bold transition-all active:scale-95 z-40 border border-slate-800"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Add Party</span>
        </button>
      )}

      {/* ── Party Khata / Passbook Modal ──────────────────────────── */}
      <PartyKhataModal
        isOpen={Boolean(activeKhataParty)}
        onClose={() => { if(window.location.hash === '#modal') window.history.back(); else setActiveKhataParty(null); }}
        party={activeKhataParty}
        stats={activeKhataParty ? stats[activeKhataParty.id] || null : null}
        receipts={receipts}
        dispatches={dispatches}
        payments={payments}
      />
    </div>
  )
}

