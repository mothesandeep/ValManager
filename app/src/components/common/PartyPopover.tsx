import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { shouldAutoFocusSearch, isTouchOrMobileDevice } from '@/utils/device'

export interface PartyPopoverParty {
  id: string
  name: string
  aliases?: string[] | null
}

export interface PartyPopoverProps {
  isOpen: boolean
  onClose: () => void
  parties: PartyPopoverParty[]
  selectedPartyId: string | null
  onSelectParty: (partyId: string | null) => void
  receiptCounts?: Record<string, number>
  totalCount?: number
  align?: 'left' | 'right'
  className?: string
}

export const PartyPopover: React.FC<PartyPopoverProps> = ({
  isOpen,
  onClose,
  parties,
  selectedPartyId,
  onSelectParty,
  receiptCounts,
  totalCount,
  align = 'left',
  className = '',
}) => {
  const location = useLocation()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Reset search and only auto-focus on desktop devices (non-touch)
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setIsSearchFocused(false)
      if (shouldAutoFocusSearch()) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen])

  // Handle mobile keyboard and visualViewport adjustments when user explicitly focuses search input
  useEffect(() => {
    if (!isOpen) return

    const handleViewportChange = () => {
      if (document.activeElement === searchInputRef.current && popoverRef.current) {
        popoverRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

  // Auto-dismiss on page scroll (skip if scroll is inside popover or search is actively focused)
  useEffect(() => {
    if (!isOpen) return

    const handleScroll = (e: Event) => {
      // Don't dismiss if scroll event comes from within the popover
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return
      }
      // Don't dismiss if user is actively focused in the search input
      if (document.activeElement === searchInputRef.current) {
        return
      }
      onClose()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isOpen, onClose])

  // Auto-dismiss on screen change (route transition)
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Active party label for header mini row
  const activeParty = useMemo(() => {
    if (!selectedPartyId) return null
    return parties.find((p) => p.id === selectedPartyId) || null
  }, [parties, selectedPartyId])

  const activeLabel = activeParty ? activeParty.name : 'All Parties'

  // Filter & sort parties
  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    let list = parties
    if (q) {
      list = parties.filter((p) => {
        const matchName = p.name.toLowerCase().includes(q)
        const matchAlias = p.aliases ? p.aliases.some((a) => a.toLowerCase().includes(q)) : false
        return matchName || matchAlias
      })
    }

    // Sort: active parties with receipts in view first, then alphabetical by name
    return [...list].sort((a, b) => {
      const countA = receiptCounts ? receiptCounts[a.id] || 0 : 0
      const countB = receiptCounts ? receiptCounts[b.id] || 0 : 0
      if (countA > 0 && countB === 0) return -1
      if (countA === 0 && countB > 0) return 1
      if (countA > 0 && countB > 0 && countA !== countB) return countB - countA
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [parties, searchQuery, receiptCounts])

  if (!isOpen) return null

  return (
    <>
      {/* Invisible tap-outside backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Dismiss popover"
      />

      {/* Anchored popover card matching PeriodPopover architecture & styling */}
      <div
        ref={popoverRef}
        className={`absolute top-full ${
          align === 'right' ? 'right-0' : 'left-0'
        } mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-2.5 space-y-2 select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Mini Row (matching PeriodPopover TIMELINE pattern) */}
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 px-1.5">
            PARTIES
          </span>
          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[130px]">
            {activeLabel}
          </span>
        </div>

        {/* In-dropdown Search Bar */}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search parties..."
            value={searchQuery}
            onFocus={() => {
              setIsSearchFocused(true)
              if (isTouchOrMobileDevice()) {
                setTimeout(() => {
                  popoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }, 150)
              }
            }}
            onBlur={() => {
              setIsSearchFocused(false)
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                if (shouldAutoFocusSearch()) {
                  searchInputRef.current?.focus()
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Quick Select Option: "All Parties" with check indicator when active */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectParty(null)
              onClose()
            }}
            className={`w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
              !selectedPartyId
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70'
            }`}
          >
            <span className="truncate">All Parties</span>
            <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
              {totalCount !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    !selectedPartyId
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {totalCount}
                </span>
              )}
              {!selectedPartyId && (
                <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

        {/* Dynamic Party List: Single-column high-density list with checkmark indicators */}
        <div
          className={`overflow-y-auto no-scrollbar space-y-1 pr-0.5 md:scrollbar-thin transition-[max-height] duration-200 ${
            isSearchFocused ? 'max-h-36 sm:max-h-56' : 'max-h-56 sm:max-h-60'
          }`}
        >
          {filteredParties.map((p) => {
            const isSelected = selectedPartyId === p.id
            const count = receiptCounts ? receiptCounts[p.id] : undefined

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectParty(p.id)
                  onClose()
                }}
                className={`w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70'
                }`}
              >
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {isSelected && (
                    <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}

          {filteredParties.length === 0 && (
            <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
              No parties found
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PartyPopover
