import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  LayoutGrid,
  List,
  Download,
  Copy,
  PackagePlus,
  Truck,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import { insertParty, updateParty } from '@/services/api/parties'
import type { Party } from '@/features/parties/types/party.types'
import { getPartyAliases, getPartyInitials, checkCanDeleteParty, checkDuplicatePartyName } from '@/features/parties/utils'
import { fmtMoney } from '@/utils/format'
import { shouldAutoFocusSearch } from '@/utils/device'
import { exportTableToCSV, getSanitizedFilename } from '@/utils/exportHelpers'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { KpiCard } from '@/components/common/KpiCard'
import { ConfirmDelete } from '@/components/feedback/ConfirmDelete'
import { DangerZone } from '@/components/feedback/DangerZone'
import { addToTrashBin } from '@/services/storage/trashBinService'
import { SwipeableRow } from '@/components/common/SwipeableRow'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import PartyKhataModal from '@/features/parties/components/PartyKhataModal'
import { FieldError } from '@/components/common/FieldError'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import { PartyFormSchema, formatZodErrors } from '@/lib/validation/schemas'
import { sanitizeIntegerInput } from '@/utils/numberInput'
import {
  savePartyDraft,
  loadPartyDraft,
  clearPartyDraft,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'

interface PartyFormState {
  id: string | null
  name: string
  phone: string
  address: string
  notes: string
  aliases: string
  rolaWeight: string
  bungariWeight: string
}

const EMPTY_FORM: PartyFormState = {
  id: null,
  name: '',
  phone: '',
  address: '',
  notes: '',
  aliases: '',
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

export default function Parties() {
  const navigate = useNavigate()
  const {
    parties,
    receipts,
    dispatches,
    payments,
    partyStats: stats,
    isLoading: loading,
    removeParty,
    refreshData,
  } = useData()

  // Toast & View Toggle State
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Search & Filter Toolbar State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccount, setFilterAccount] = useState<'all' | 'due' | 'credit' | 'rola'>('all')
  const [sortOption, setSortOption] = useState<'name' | 'balance' | 'rola'>('name')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Khata Modal
  const [activeKhataParty, setActiveKhataParty] = useState<Party | null>(null)

  // Form State (restores draft if backgrounded or killed by Android)
  const [form, setForm] = useState<PartyFormState | null>(() => loadPartyDraft())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auto-save draft whenever active and register background listener
  useEffect(() => {
    if (!form) return
    const isDirty =
      form.name.trim().length > 0 ||
      form.phone.trim().length > 0 ||
      form.address.trim().length > 0 ||
      form.notes.trim().length > 0 ||
      form.aliases.trim().length > 0
    if (isDirty) {
      const timer = setTimeout(() => {
        savePartyDraft(form)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      clearPartyDraft()
    }
  }, [form])

  useEffect(() => {
    if (!form) return
    const cleanup = registerAppBackgroundListener(() => {
      const isDirty =
        form.name.trim().length > 0 ||
        form.phone.trim().length > 0 ||
        form.address.trim().length > 0 ||
        form.notes.trim().length > 0 ||
        form.aliases.trim().length > 0
      if (isDirty) {
        savePartyDraft(form)
      }
    })
    return cleanup
  }, [form])

  // Search Params Handler (Quick Actions & Direct Links)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      window.location.hash = 'modal'
      let sharedNotes = ''
      let sharedName = ''
      try {
        const storedText = sessionStorage.getItem('valmanager_shared_import_text')
        if (storedText) {
          sharedNotes = storedText
          const lines = storedText.split('\n')
          if (lines[0] && lines[0].length < 40 && !lines[0].toLowerCase().includes('http')) {
            sharedName = lines[0].trim()
          }
          sessionStorage.removeItem('valmanager_shared_import_text')
        }
      } catch { }

      setForm({ ...EMPTY_FORM, name: sharedName || EMPTY_FORM.name, notes: sharedNotes })
      setFieldErrors({})
      setErrorMsg(null)
      const p = new URLSearchParams(searchParams)
      p.delete('action')
      const qs = p.toString() ? `?${p.toString()}` : ''
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}#modal`)
    }
    const partyId = searchParams.get('party')
    if (partyId && parties.length > 0) {
      const found = parties.find((p) => p.id === partyId)
      if (found) {
        setActiveKhataParty(found)
        window.location.hash = 'modal'
      }
      const p = new URLSearchParams(searchParams)
      p.delete('party')
      const qs = p.toString() ? `?${p.toString()}` : ''
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}#modal`)
    }
  }, [searchParams, parties])

  // Context-aware FAB custom event listener
  useEffect(() => {
    const handleOpenModal = () => {
      setForm({ ...EMPTY_FORM })
      setErrorMsg(null)
      setFieldErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('kasab:open-party-modal', handleOpenModal)
    return () => {
      window.removeEventListener('kasab:open-party-modal', handleOpenModal)
    }
  }, [])

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

  // Top Micro-KPI Aggregates
  const totalParties = parties.length
  const totalBalanceDue = useMemo(
    () => Object.values(stats).reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0),
    [stats]
  )
  const totalCreditHeld = useMemo(
    () => Object.values(stats).reduce((sum, s) => sum + (s.balance < 0 ? Math.abs(s.balance) : 0), 0),
    [stats]
  )
  const totalRolaPending = useMemo(
    () => Object.values(stats).reduce((sum, s) => sum + (s.rolaPending > 0 ? s.rolaPending : 0), 0),
    [stats]
  )

  const dueCount = useMemo(
    () => parties.filter((p) => (stats[p.id]?.balance || 0) > 0).length,
    [parties, stats]
  )
  const creditCount = useMemo(
    () => parties.filter((p) => (stats[p.id]?.balance || 0) < 0).length,
    [parties, stats]
  )
  const rolaCount = useMemo(
    () => parties.filter((p) => (stats[p.id]?.rolaPending || 0) > 0).length,
    [parties, stats]
  )

  // Filtered and Sorted Parties
  const filteredAndSortedParties = useMemo(() => {
    let result = [...parties]

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q)
        const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false
        const addressMatch = p.address ? p.address.toLowerCase().includes(q) : false
        const aliases = getPartyAliases(p)
        const aliasMatch = aliases.some((a) => a.toLowerCase().includes(q))
        const notesMatch = p.notes ? p.notes.toLowerCase().includes(q) : false
        return nameMatch || phoneMatch || addressMatch || aliasMatch || notesMatch
      })
    }

    if (filterAccount === 'due') {
      result = result.filter((p) => (stats[p.id]?.balance || 0) > 0)
    } else if (filterAccount === 'credit') {
      result = result.filter((p) => (stats[p.id]?.balance || 0) < 0)
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
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (p: Party) => {
    const rawNotes = p.notes || ''
    const aliases = getPartyAliases(p)
    const cleanedNotes = rawNotes
      .replace(/(?:^|\s*\(?)aliases:\s*[^;\n)]+\)?/gi, '')
      .trim()

    setForm({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      address: p.address || '',
      notes: cleanedNotes,
      aliases: aliases.join(', '),
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
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    setFieldErrors({})
    setErrorMsg(null)

    const rolaG = form.rolaWeight ? parseInt(form.rolaWeight, 10) : null
    const bungariG = form.bungariWeight ? parseInt(form.bungariWeight, 10) : null
    const parsedAliases = form.aliases
      ? form.aliases.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const validation = PartyFormSchema.safeParse({
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
      default_rola_weight_g: rolaG,
      default_bungari_weight_g: bungariG,
    })

    if (!validation.success) {
      const errs = formatZodErrors(validation.error)
      setFieldErrors(errs)
      showToast('Please correct the highlighted fields.', 'warning')
      return
    }

    const isDuplicate = checkDuplicatePartyName(form.name, parties, form.id)
    if (isDuplicate) {
      setFieldErrors({ name: 'A party with this name already exists.' })
      showToast('A party with this name already exists.', 'warning')
      return
    }

    setSaving(true)

    try {
      const cleanPhone = form.phone ? form.phone.replace(/\D/g, '') || null : null
      const payload = {
        name: form.name.trim(),
        phone: cleanPhone,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        aliases: parsedAliases,
        default_rola_weight_g: rolaG,
        default_bungari_weight_g: bungariG,
      }

      if (form.id) {
        await updateParty(form.id, payload)
      } else {
        await insertParty(payload)
      }
      const isEdit = Boolean(form.id)
      setForm(null)
      clearPartyDraft()
      showToast(isEdit ? 'Party account updated successfully' : 'Party registered successfully', 'success')
      await refreshData(['parties'])
    } catch (err: unknown) {
      console.error('Save party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save party — ${msg}`)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Edge-case guard: Prevent deleting party with active receipts, dispatches, or payments
    const party = parties.find((p) => p.id === id)
    const check = checkCanDeleteParty(id, receipts, dispatches, payments, party?.name)
    if (!check.canDelete) {
      setDeleting(null)
      setErrorMsg(check.reason || 'Cannot delete party with active records.')
      showToast(check.reason || 'Cannot delete party with active records.', 'error')
      return
    }

    const partyToRestore = party
    try {
      setDeleting(null)
      await removeParty(id)

      if (partyToRestore) {
        addToTrashBin({
          id: partyToRestore.id,
          type: 'party',
          title: `Party: ${partyToRestore.name}`,
          subtitle: partyToRestore.phone ? `Phone: ${partyToRestore.phone}` : undefined,
          payload: {
            name: partyToRestore.name,
            phone: partyToRestore.phone,
            address: partyToRestore.address,
            notes: partyToRestore.notes,
            aliases: partyToRestore.aliases,
            default_rola_weight_g: partyToRestore.default_rola_weight_g,
            default_bungari_weight_g: partyToRestore.default_bungari_weight_g,
          },
        })
      }

      showToast('Party deleted successfully', {
        type: 'delete',
        action: partyToRestore
          ? {
              label: 'Undo',
              onClick: async () => {
                try {
                  await insertParty({
                    name: partyToRestore.name,
                    phone: partyToRestore.phone,
                    address: partyToRestore.address,
                    notes: partyToRestore.notes,
                    aliases: partyToRestore.aliases,
                    default_rola_weight_g: partyToRestore.default_rola_weight_g,
                  })
                  await refreshData()
                  showToast('Party restored successfully', 'success')
                } catch (undoErr) {
                  console.error('Failed to restore party:', undoErr)
                  showToast('Could not restore party', 'error')
                }
              },
            }
          : undefined,
      })
    } catch (err: unknown) {
      console.error('Delete party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
      showToast(`Delete failed: ${msg}`, 'error')
    }
  }

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
    showToast(`Copied phone: ${phone}`, 'info')
  }

  const handleExportCSV = () => {
    if (!filteredAndSortedParties.length) return
    const filename = getSanitizedFilename('Party_Directory')
    exportTableToCSV({
      filename,
      headers: ['Party Name', 'Phone', 'Address', 'Outstanding Balance (INR)', 'Pending Rola (pcs)', 'Aliases', 'Notes'],
      data: filteredAndSortedParties,
      rowMapper: (p) => {
        const pStats = stats[p.id] || { balance: 0, rolaPending: 0 }
        return [
          p.name,
          p.phone ? `+91 ${p.phone}` : '',
          p.address || '',
          pStats.balance || 0,
          pStats.rolaPending || 0,
          getPartyAliases(p).join(', '),
          p.notes || '',
        ]
      },
    })
    showToast(`Exported ${filteredAndSortedParties.length} party records to ${filename}`, 'success')
  }

  const renderPartyCard = (p: Party) => {
    const s = stats[p.id] || { rolaPending: 0, balance: 0 }

    return (
      <div
        key={p.id}
        onClick={() => {
          window.location.hash = 'modal'
          setActiveKhataParty(p)
        }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-xs hover:border-slate-200 dark:hover:border-slate-700 active:bg-slate-50/50 dark:active:bg-slate-800/50 transition-all mb-3 md:mb-0 cursor-pointer group select-none relative flex flex-col justify-between space-y-2.5 h-full min-h-[195px]"
      >
        <div className="flex-1 flex flex-col justify-start">
          {/* Top Row: Avatar + Title Details & Phone + 3-dots kebab menu */}
          <div className="flex items-start justify-between gap-2.5 relative">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar pill */}
              <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 select-none shadow-2xs">
                {getPartyInitials(p.name)}
              </div>

              {/* Title & Phone */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3
                    className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate"
                    title={p.name}
                  >
                    {p.name}
                  </h3>
                  {getPartyAliases(p).length > 0 && (
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 truncate shrink-0">
                      aka {getPartyAliases(p)[0]}
                    </span>
                  )}
                </div>

                {p.phone ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <a
                      href={`tel:${p.phone}`}
                      className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 font-mono transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <span>{formatPhone(p.phone)}</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(p.phone!, e)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer transition-colors"
                      title="Copy phone"
                    >
                      <Copy size={10} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    No contact number
                  </span>
                )}
              </div>
            </div>

            {/* Top Right: 3-dots kebab menu */}
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                className="size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Party options"
                aria-label="Party options"
              >
                <MoreVertical size={14} />
              </button>

              {menuOpenId === p.id && (
                <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null)
                      edit(p)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} className="text-slate-400" />
                    <span>Edit Party</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null)
                      navigate('/receiving')
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <PackagePlus size={13} className="text-slate-400" />
                    <span>Add Inward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null)
                      navigate('/dispatch')
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Truck size={13} className="text-slate-400" />
                    <span>Add Dispatch</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null)
                      setDeleting(p.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} className="text-rose-500" />
                    <span>Delete Party</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle Metadata Strip */}
          {p.address && (
            <div
              className="text-[11px] text-slate-400 truncate mt-1.5 flex items-center gap-1"
              title={p.address}
            >
              <MapPin size={10} className="text-slate-400 shrink-0" />
              <span className="truncate">{p.address}</span>
            </div>
          )}

          {/* Tare rules badge pill */}
          <div className="text-[10px] font-mono px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 inline-block mt-1.5">
            Rola: {p.default_rola_weight_g ? `${p.default_rola_weight_g}g` : '205g'} • Bungri: {p.default_bungari_weight_g ? `${p.default_bungari_weight_g}g` : '70g'}
          </div>
        </div>

        {/* Inline Delete Confirmation if active */}
        {deleting === p.id && (
          <div
            className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg flex items-center justify-between animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete party?</span>
            <ConfirmDelete
              onConfirm={() => handleDelete(p.id)}
              onCancel={() => setDeleting(null)}
            />
          </div>
        )}

        {/* Bottom Action & Ledger Summary Row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
          {/* Left: Pending Rola badge */}
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono tabular-nums">
            {s.rolaPending < 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                +{Math.abs(s.rolaPending)} Adv Return
              </span>
            ) : s.rolaPending > 0 ? (
              <span>
                <strong className="font-bold text-slate-800 dark:text-slate-100">{s.rolaPending}</strong> pcs rola
              </span>
            ) : (
              <span className="text-slate-400 font-normal">0 rola</span>
            )}
          </div>

          {/* Right: Balance status pill + Chevron */}
          <div className="flex items-center gap-1.5">
            {s.balance > 0 ? (
              <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 px-2 py-0.5 rounded-md tabular-nums">
                {fmtMoney(s.balance)} Due
              </span>
            ) : s.balance < 0 ? (
              <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2 py-0.5 rounded-md tabular-nums">
                {fmtMoney(Math.abs(s.balance))} Adv
              </span>
            ) : (
              <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-md tabular-nums">
                Settled
              </span>
            )}
            <ChevronRight size={14} className="text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="flex flex-col pb-28 md:pb-16 animate-in fade-in duration-300 w-full">
        {/* ── Standardized Universal Page Header ── */}
        <PageHeader
          title="Party Directory"
          subtitle="Customer accounts, ledgers & custom rules"
          showBack={true}
          badge={
            <span className="hidden md:inline-flex bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-mono font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs">
              {totalParties} {totalParties === 1 ? 'Account' : 'Accounts'}
            </span>
          }
          rightAction={
            <>
              {/* Mobile: Standardized Count Badge in Top-Right */}
              <div className="md:hidden flex items-center">
                <span className="h-8.5 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  {totalParties} {totalParties === 1 ? 'Account' : 'Accounts'}
                </span>
              </div>

              {/* Desktop: Primary Action Button */}
              {!form && (
                <div className="hidden md:flex items-center h-9">
                  <Button
                    onClick={() => startAdd()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-xs px-4 py-2 h-9 flex items-center gap-1.5"
                  >
                    <Plus size={16} strokeWidth={2.5} /> New Party
                  </Button>
                </div>
              )}
            </>
          }
        />

        {/* ── Mobile Search & Filter Toolbar (< 768px) ── */}
        {!form && (
          <div className="space-y-2.5 mb-4 block md:hidden">
            {/* Search Bar: Standard h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm shadow-xs */}
            <div className="relative w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm shadow-xs flex items-center gap-2.5">
              <Search
                size={16}
                className="text-slate-400 shrink-0 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search party, phone, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter & Sort Controls: Standard h-9, rounded-xl */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              {/* Category Chip */}
              <div className="relative h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all">
                <Users size={13} className="text-slate-400 shrink-0" />
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value as 'all' | 'due' | 'credit' | 'rola')}
                  aria-label="Filter accounts"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer appearance-none pr-3.5"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All ({parties.length})</option>
                  <option value="due" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Due ({dueCount})</option>
                  <option value="credit" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Credit ({creditCount})</option>
                  <option value="rola" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Rola ({rolaCount})</option>
                </select>
                <ChevronDown size={12} className="text-slate-400 shrink-0 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Sort Pill */}
              <div className="relative h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'name' | 'balance' | 'rola')}
                  aria-label="Sort accounts"
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer appearance-none pr-3.5"
                >
                  <option value="name" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Name (A-Z)</option>
                  <option value="balance" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Balance Due</option>
                  <option value="rola" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pending Rola</option>
                </select>
                <ChevronDown size={12} className="text-slate-400 shrink-0 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* ── Top Micro-KPI Summary Strip (Hidden on Mobile <768px, 4-col on Desktop) ── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-2.5 sm:mb-4">
          <KpiCard
            label="Parties"
            value={totalParties}
            unit="Accts"
            subtitle="Registered masters"
            dotColor="slate"
            loading={loading}
          />
          <KpiCard
            label="Balance Due"
            value={fmtMoney(totalBalanceDue)}
            subtitle="Receivables"
            dotColor="rose"
            valueClassName="text-rose-600 dark:text-rose-400"
            loading={loading}
          />
          <KpiCard
            label="Credit Held"
            value={fmtMoney(totalCreditHeld)}
            subtitle="Party advances"
            dotColor="emerald"
            valueClassName="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
          <KpiCard
            label="Rola Pending"
            value={totalRolaPending.toLocaleString('en-IN')}
            unit="pcs"
            subtitle="With parties"
            dotColor="indigo"
            loading={loading}
          />
        </div>

        {errorMsg && (
          <div className="rounded-lg p-3 text-xs font-medium flex items-center justify-between shadow-xs bg-rose-50 text-rose-800 border border-rose-200">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="underline cursor-pointer font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}



        {/* ── Desktop Enterprise Toolbar (>= 768px) ──────────────── */}
        {!form && (
          <div className="hidden md:flex items-center justify-between gap-2.5 mb-4">
            {/* Left: Clean Search Bar */}
            <div className="relative flex-1 max-w-sm sm:max-w-md">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by party name, phone, GSTIN, area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-xs font-medium text-slate-800 bg-white border border-slate-200/90 rounded-lg shadow-2xs placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Right: Grouped Controls & Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
              {/* Status / Type Dropdown */}
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-lg px-2.5 h-9 shadow-2xs hover:bg-slate-50 transition-colors">
                <Filter size={13} className="text-slate-400 shrink-0 mr-1.5" />
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value as 'all' | 'due' | 'credit' | 'rola')}
                  aria-label="Filter accounts"
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all">All Accounts ({parties.length})</option>
                  <option value="due">With Balance Due ({dueCount})</option>
                  <option value="credit">With Credit / Adv ({creditCount})</option>
                  <option value="rola">With Pending Rola ({rolaCount})</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex items-center bg-white border border-slate-200/90 rounded-lg px-2.5 h-9 shadow-2xs hover:bg-slate-50 transition-colors">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0 mr-1.5" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'name' | 'balance' | 'rola')}
                  aria-label="Sort accounts"
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="name">Sort by: Name (A-Z)</option>
                  <option value="balance">Sort by: Balance Due</option>
                  <option value="rola">Sort by: Pending Rola</option>
                </select>
              </div>

              {/* View Mode Toggle: [ ⊞ Grid | ☰ Table ] */}
              <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200/80 rounded-lg h-9 items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid size={13} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                  title="Table View"
                  aria-label="Table View"
                >
                  <List size={14} />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Actions: Export CSV & New Party */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Export CSV"
              >
                <Download size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={startAdd}
                className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs border border-slate-900 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} className="text-white" />
                <span>New Party</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Parties Content (Grid or Table View) ───────────────── */}
        {!form && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 h-56 animate-pulse bg-white border border-slate-200/80 shadow-xs"
                  />
                ))}
              </div>
            ) : parties.length === 0 ? (
              <EmptyState
                title="No parties registered"
                description="Add customer accounts to start tracking work, inward, outward, and ledgers."
                actionLabel="New Party"
                onAction={startAdd}
              />
            ) : filteredAndSortedParties.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 text-center border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mt-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto mb-3 shrink-0 shadow-2xs">
                  <Search size={22} strokeWidth={1.8} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  No matching accounts found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-normal">
                  {searchQuery ? `No parties matching "${searchQuery}"` : 'No parties match the selected filter'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterAccount('all')
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── 2. Refactored Party Cards (Grid View with Swipe-to-Trash) ─────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5 items-stretch">
                {filteredAndSortedParties.map((p) => (
                  <SwipeableRow
                    key={p.id}
                    onDelete={() => {
                      const check = checkCanDeleteParty(p.id, receipts, dispatches, payments, p.name)
                      if (!check.canDelete) {
                        showToast(check.reason || 'Cannot delete party with active records.', 'error')
                        return
                      }
                      handleDelete(p.id)
                    }}
                  >
                    {renderPartyCard(p)}
                  </SwipeableRow>
                ))}
              </div>
            ) : (
              /* ── 3. High-Density Table / List View ─────────────────── */
              <div className="bg-transparent md:bg-white md:dark:bg-slate-900 md:rounded-2xl md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:border md:border-slate-200/60 md:dark:border-slate-800 md:overflow-hidden">
                {/* ── Mobile Card Feed (< 768px Zero-H-Scroll UX with Swipe-to-Trash) ── */}
                <div className="md:hidden space-y-2.5">
                  {filteredAndSortedParties.map((p) => (
                    <SwipeableRow
                      key={p.id}
                      onDelete={() => {
                        const check = checkCanDeleteParty(p.id, receipts, dispatches, payments, p.name)
                        if (!check.canDelete) {
                          showToast(check.reason || 'Cannot delete party with active records.', 'error')
                          return
                        }
                        handleDelete(p.id)
                      }}
                    >
                      {renderPartyCard(p)}
                    </SwipeableRow>
                  ))}
                </div>

                {/* ── Desktop Wide Table (>= 768px) ── */}
                <div className="hidden md:block overflow-x-auto rounded-xl">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[840px]">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 select-none">
                      <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-900">Party Name</th>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Phone</th>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Area / Address</th>
                        <th className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900">Rola Tare Spec</th>
                        <th className="py-2.5 px-3 text-right bg-slate-50 dark:bg-slate-900">Pending Rola</th>
                        <th className="py-2.5 px-3 text-right bg-slate-50 dark:bg-slate-900">Balance / Credit</th>
                        <th className="py-2.5 px-4 text-right bg-slate-50 dark:bg-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAndSortedParties.map((p) => {
                        const s = stats[p.id] || { rolaPending: 0, balance: 0 }

                        return (
                          <tr
                            key={p.id}
                            className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => {
                              window.location.hash = 'modal'
                              setActiveKhataParty(p)
                            }}
                          >
                            {/* Party Name */}
                            <td className="py-2.5 px-3.5 align-middle">
                              <div className="flex items-center gap-2.5">
                                <div className="bg-slate-100 text-slate-700 font-semibold text-xs size-8 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 select-none">
                                  {getPartyInitials(p.name)}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-xs text-slate-900 block truncate leading-tight">
                                    {p.name}
                                  </span>
                                  {getPartyAliases(p).length > 0 && (
                                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block truncate max-w-[180px]">
                                      aka {getPartyAliases(p).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="py-2.5 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                              {p.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${p.phone}`}
                                    className="text-xs font-mono font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                  >
                                    {formatPhone(p.phone)}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyPhone(p.phone!, e)}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
                                    title="Copy phone"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            {/* Area / Address */}
                            <td className="py-2.5 px-3 align-middle">
                              <span
                                className="text-xs text-slate-500 block truncate max-w-[190px]"
                                title={p.address || undefined}
                              >
                                {p.address || '—'}
                              </span>
                            </td>

                            {/* Rola Tare Spec */}
                            <td className="py-2.5 px-3 align-middle">
                              <span className="font-mono text-xs text-slate-600 font-medium whitespace-nowrap">
                                {p.default_rola_weight_g ? `${p.default_rola_weight_g}g` : '200g'} / {p.default_bungari_weight_g ? `${p.default_bungari_weight_g}g` : '70g'}
                              </span>
                            </td>

                            {/* Pending Rola (Strictly Right-aligned) */}
                            <td className="py-2.5 px-3 align-middle text-right">
                              {s.rolaPending < 0 ? (
                                <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 whitespace-nowrap">
                                  +{Math.abs(s.rolaPending)} Adv
                                </span>
                              ) : s.rolaPending > 0 ? (
                                <span className="font-mono tabular-nums text-xs font-bold text-slate-800 whitespace-nowrap">
                                  {s.rolaPending} pcs
                                </span>
                              ) : (
                                <span className="font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                                  0 pcs
                                </span>
                              )}
                            </td>

                            {/* Balance / Credit (Strictly Right-aligned) */}
                            <td className="py-2.5 px-3 align-middle text-right">
                              {s.balance > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 tabular-nums whitespace-nowrap">
                                  {fmtMoney(s.balance)} Due
                                </span>
                              ) : s.balance < 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 tabular-nums whitespace-nowrap">
                                  {fmtMoney(Math.abs(s.balance))} Adv
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 tabular-nums whitespace-nowrap">
                                  Settled
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.location.hash = 'modal'
                                    setActiveKhataParty(p)
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer shadow-2xs"
                                  title="View Party Khata / Ledger"
                                >
                                  <BookOpen size={12} strokeWidth={2.2} />
                                  <span>Khata</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => edit(p)}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="Edit party"
                                >
                                  <Pencil size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleting(p.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete party"
                                >
                                  <Trash2 size={13} />
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
            )}
          </div>
        )}

        {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
        <BottomSheetModal
          isOpen={Boolean(form)}
          onClose={() => {
            setForm(null)
            clearPartyDraft()
            clearModalHash()
          }}
          category="PARTY DIRECTORY"
          title={form?.id ? 'Edit Party' : 'New Party'}
          subtitle="Customer account details and defaults"
          maxWidth="sm:max-w-lg"
          bodyClassName="p-5 sm:p-6"
          footer={
            form ? (
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setForm(null)
                    clearPartyDraft()
                    clearModalHash()
                  }}
                  disabled={saving}
                  className="flex-1 h-12 min-h-[48px] rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="party-entry-form"
                  data-save-shortcut="true"
                  disabled={saving}
                  className="flex-[2] h-12 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-900 dark:border-white disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin shrink-0" />
                      <span>Saving Party...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{form.id ? 'Update Party' : 'Save Party'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : null
          }
        >
          {form && (
            <form id="party-entry-form" onSubmit={submit} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                    Party Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    autoFocus={shouldAutoFocusSearch()}
                    placeholder="e.g. Ramesh Jariwala"
                    className={`w-full h-10 px-3 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-all shadow-2xs ${fieldErrors.name
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-200/90 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10'
                      }`}
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value })
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.name
                          return next
                        })
                      }
                    }}
                  />
                  <FieldError error={fieldErrors.name} />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                    AI Aliases / Nicknames
                  </label>
                  <input
                    placeholder="e.g. Vijay Bhai, Vijay"
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10 transition-all shadow-2xs"
                    value={form.aliases}
                    onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 pl-0.5">
                    Comma-separated. Auto-maps scanned challans bearing these names to this party.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98250 12345"
                    className={`w-full h-10 px-3 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-all shadow-2xs ${fieldErrors.phone
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-200/90 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10'
                      }`}
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value })
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.phone
                          return next
                        })
                      }
                    }}
                  />
                  <FieldError error={fieldErrors.phone} />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                    Address
                  </label>
                  <input
                    placeholder="e.g. Katargam, Surat"
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10 transition-all shadow-2xs"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                    Notes
                  </label>
                  <input
                    placeholder="e.g. Regular 8-cord party"
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10 transition-all shadow-2xs"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                      Def. Rola (g)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="200"
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10 transition-all shadow-2xs"
                      value={form.rolaWeight}
                      onChange={(e) => setForm({ ...form, rolaWeight: sanitizeIntegerInput(e.target.value) })}
                    />
                    <FieldError error={fieldErrors.default_rola_weight_g} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1 tracking-wider pl-0.5">
                      Def. Bungri (g)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="70"
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 dark:focus:border-slate-200 focus:ring-1 focus:ring-slate-800/10 transition-all shadow-2xs"
                      value={form.bungariWeight}
                      onChange={(e) => setForm({ ...form, bungariWeight: sanitizeIntegerInput(e.target.value) })}
                    />
                    <FieldError error={fieldErrors.default_bungari_weight_g} />
                  </div>
                </div>

                {/* Danger Zone for Deleting Party (Pattern 2) */}
                {form.id && (
                  <DangerZone
                    title="Danger Zone"
                    description="Permanently delete this party record. Parties with active inward receipts, outward dispatches, or ledger transactions cannot be deleted."
                    itemName={`Party "${form.name}"`}
                    buttonLabel="Delete Party"
                    disabled={!checkCanDeleteParty(form.id, receipts, dispatches, payments, form.name).canDelete}
                    disabledReason={checkCanDeleteParty(form.id, receipts, dispatches, payments, form.name).reason}
                    onDelete={async () => {
                      const partyId = form.id!
                      setForm(null)
                      clearPartyDraft()
                      clearModalHash()
                      await handleDelete(partyId)
                    }}
                  />
                )}
              </div>
            </form>
          )}
        </BottomSheetModal>

        {/* ── Party Khata / Passbook Modal ──────────────────────────── */}
        <PartyKhataModal
          isOpen={Boolean(activeKhataParty)}
          onClose={() => {
            clearModalHash()
            setActiveKhataParty(null)
          }}
          party={activeKhataParty}
          stats={activeKhataParty ? stats[activeKhataParty.id] || null : null}
          receipts={receipts}
          dispatches={dispatches}
          payments={payments}
        />
      </div>
    </PullToRefresh>
  )
}
