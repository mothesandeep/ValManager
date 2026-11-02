import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Plus, Check, User, Phone, X } from 'lucide-react'
import type { Party, PartyStats } from '@/features/parties/types'
import { getPartyInitials, getPartyAliases } from '@/features/parties/utils'
import { insertParty } from '@/services/api/parties'
import { PartyFormSchema, formatZodErrors } from '@/lib/validation/schemas'
import { FieldError } from '@/components/common/FieldError'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import { fmtMoney } from '@/utils/format'
import { shouldAutoFocusSearch } from '@/utils/device'

export interface PartyComboboxProps {
  value: string
  onChange: (partyId: string) => void
  parties: Party[]
  partyStats?: Record<string, PartyStats>
  label?: string
  required?: boolean
  error?: string | null
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export const PartyCombobox: React.FC<PartyComboboxProps> = ({
  value,
  onChange,
  parties,
  partyStats,
  label = 'Party',
  required = false,
  error,
  placeholder = 'Select or search party...',
  disabled = false,
  className = '',
  id = 'party-combobox',
}) => {
  const { showToast } = useToast()
  const { refreshData } = useData()

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  // Quick Party Creation Modal state
  const [quickName, setQuickName] = useState('')
  const [quickPhone, setQuickPhone] = useState('')
  const [quickAddress, setQuickAddress] = useState('')
  const [quickRolaWeight, setQuickRolaWeight] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  // Selected party object
  const selectedParty = useMemo(
    () => parties.find((p) => p.id === value),
    [parties, value]
  )

  // Filtered party list based on search
  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties
    const q = search.trim().toLowerCase()
    return parties.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q)
      const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false
      const aliasMatch = getPartyAliases(p).some((a) => a.toLowerCase().includes(q))
      return nameMatch || phoneMatch || aliasMatch
    })
  }, [parties, search])

  // Total selectable items (filtered parties + 1 for '+ New Party' action)
  const totalItems = filteredParties.length + 1

  // Keep highlightedIndex in bounds
  useEffect(() => {
    setHighlightedIndex(0)
  }, [search, isOpen])

  // Focus handling & visualViewport adjustment
  useEffect(() => {
    if (!isOpen) return

    // Only auto-focus on desktop devices; never auto-focus on touch/mobile
    if (shouldAutoFocusSearch()) {
      inputRef.current?.focus()
    }

    const handleViewportChange = () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      window.visualViewport.addEventListener('scroll', handleViewportChange)
    }

    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
        window.visualViewport.removeEventListener('scroll', handleViewportChange)
      }
    }
  }, [isOpen])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex < filteredParties.length) {
          const chosen = filteredParties[highlightedIndex]
          if (chosen) {
            onChange(chosen.id)
            setIsOpen(false)
            setSearch('')
          }
        } else {
          // Highlighted '+ New Party'
          setIsOpen(false)
          openQuickAdd(search)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement | undefined
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const openQuickAdd = (prefillName = '') => {
    setQuickName(prefillName.trim())
    setQuickPhone('')
    setQuickAddress('')
    setQuickRolaWeight('')
    setQuickErrors({})
    setIsQuickAddOpen(true)
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuickErrors({})

    const validation = PartyFormSchema.safeParse({
      name: quickName,
      phone: quickPhone || null,
      address: quickAddress || null,
      notes: null,
      default_rola_weight_g: quickRolaWeight ? parseInt(quickRolaWeight, 10) : null,
      default_bungari_weight_g: null,
    })

    if (!validation.success) {
      setQuickErrors(formatZodErrors(validation.error))
      return
    }

    setQuickSaving(true)
    try {
      const cleanPhone = quickPhone.replace(/\D/g, '') || null
      const created = await insertParty({
        name: quickName.trim(),
        phone: cleanPhone,
        address: quickAddress.trim() || null,
        default_rola_weight_g: quickRolaWeight ? parseInt(quickRolaWeight, 10) : null,
      })

      showToast(`Party "${created.name}" created!`, 'success')
      await refreshData(['parties'])
      onChange(created.id)
      setIsQuickAddOpen(false)
    } catch (err: unknown) {
      console.error('Failed to create party:', err)
      const msg = err instanceof Error ? err.message : 'Could not create party'
      setQuickErrors({ _form: msg })
      showToast(msg, 'error')
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => openQuickAdd()}
            tabIndex={-1}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 cursor-pointer transition-colors active:scale-95"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span>New Party</span>
          </button>
        </div>
      )}

      {/* Input container */}
      <div
        className={`relative flex items-center w-full h-11 min-h-[44px] rounded-lg bg-white dark:bg-slate-900 border transition-all ${
          error
            ? 'border-red-400 ring-2 ring-red-400/20'
            : isOpen
              ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-900/60'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
        } ${disabled ? 'opacity-60 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed' : ''}`}
      >
        <div className="pl-3 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0">
          <User size={15} />
        </div>

        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          disabled={disabled}
          value={isOpen ? search : selectedParty?.name || ''}
          placeholder={selectedParty ? selectedParty.name : placeholder}
          onFocus={() => {
            setSearch('')
            setIsOpen(true)
          }}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden bg-transparent"
        />

        <div className="flex items-center gap-1 pr-2.5 shrink-0">
          {value && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearch('')
              }}
              tabIndex={-1}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="Clear party"
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false)
              } else {
                if (shouldAutoFocusSearch()) {
                  inputRef.current?.focus()
                }
                setIsOpen(true)
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronDown size={15} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <FieldError error={error} />

      {/* Dropdown Listbox */}
      {isOpen && (
        <div
          id={`${id}-listbox`}
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{filteredParties.length} parties found</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">↑↓ to navigate • ↵ to select</span>
          </div>

          <ul ref={listboxRef} role="listbox" className="max-h-64 overflow-y-auto no-scrollbar p-1.5 space-y-0.5 overscroll-contain">
            {filteredParties.map((p, idx) => {
              const isSelected = p.id === value
              const isHighlighted = idx === highlightedIndex
              const aliases = getPartyAliases(p)
              const stats = partyStats ? partyStats[p.id] : undefined

              return (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(p.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 font-semibold text-blue-700 dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {getPartyInitials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[13.5px] truncate text-slate-900 dark:text-white">{p.name}</span>
                        {aliases.length > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px]">
                            ({aliases[0]})
                          </span>
                        )}
                      </div>
                      {p.phone && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} />
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {stats && stats.balance !== 0 && (
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
                          stats.balance > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                        }`}
                      >
                        {stats.balance > 0 ? `Dues: ${fmtMoney(stats.balance)}` : `Adv: ${fmtMoney(-stats.balance)}`}
                      </span>
                    )}

                    {isSelected && <Check size={15} className="text-slate-900 dark:text-white" />}
                  </div>
                </li>
              )
            })}

            {/* Quick Add Party Option in Dropdown */}
            <li
              role="option"
              aria-selected={false}
              onClick={() => {
                setIsOpen(false)
                openQuickAdd(search)
              }}
              onMouseEnter={() => setHighlightedIndex(filteredParties.length)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 ${
                highlightedIndex === filteredParties.length
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  highlightedIndex === filteredParties.length
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                }`}
              >
                <Plus size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-bold block">
                  + Add &quot;{search.trim() || 'New Party'}&quot;
                </span>
                <span
                  className={`text-[10.5px] block ${
                    highlightedIndex === filteredParties.length ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Create and immediately select for this voucher
                </span>
              </div>
            </li>
          </ul>
        </div>
      )}

      {/* ── Quick Add Party Modal ────────────────────────────────────────── */}
      {isQuickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-slate-900 dark:text-white">Add New Party</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Quickly register party and link to current entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                disabled={quickSaving}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {quickErrors._form && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
                {quickErrors._form}
              </div>
            )}

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Party / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus={shouldAutoFocusSearch()}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Sardar Textiles"
                  className={`w-full py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden transition-all ${
                    quickErrors.name
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-slate-800 dark:focus:border-white focus:ring-2 focus:ring-slate-800/10'
                  }`}
                />
                <FieldError error={quickErrors.name} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className={`w-full py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden transition-all ${
                    quickErrors.phone
                      ? 'border-rose-400 ring-2 ring-rose-400/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-slate-800 dark:focus:border-white focus:ring-2 focus:ring-slate-800/10'
                  }`}
                />
                <FieldError error={quickErrors.phone} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City / Address</label>
                  <input
                    type="text"
                    value={quickAddress}
                    onChange={(e) => setQuickAddress(e.target.value)}
                    placeholder="e.g. Surat"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:border-slate-800 dark:focus:border-white focus:ring-2 focus:ring-slate-800/10 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Default Rola (Grams)</label>
                  <input
                    type="number"
                    value={quickRolaWeight}
                    onChange={(e) => setQuickRolaWeight(e.target.value)}
                    placeholder="200"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:border-slate-800 dark:focus:border-white focus:ring-2 focus:ring-slate-800/10 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  disabled={quickSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {quickSaving ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PartyCombobox

