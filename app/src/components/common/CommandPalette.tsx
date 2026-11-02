import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  PackagePlus,
  Truck,
  Users,
  IndianRupee,
  Receipt,
  BarChart3,
  SlidersHorizontal,
  Plus,
  FileText,
  Sparkles,
  X,
  CornerDownLeft,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useData } from '@/hooks/useData'
import { fmtDate } from '@/utils/date'
import { fmtKg, fmtMoney } from '@/utils/format'
import { shouldAutoFocusSearch } from '@/utils/device'
import { getPartyAliases } from '@/features/parties/utils'
import type { Party } from '@/features/parties/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenPartyLedger?: (party: Party) => void
}

interface PaletteItem {
  id: string
  category: 'Actions' | 'Navigation' | 'Parties' | 'Challans'
  title: string
  subtitle?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string
  shortcut?: string
  onSelect: () => void
}

export function CommandPalette({ isOpen, onClose, onOpenPartyLedger }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { parties, receipts, dispatches, partyStats } = useData()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset query and focus on open (desktop only)
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      if (shouldAutoFocusSearch()) {
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }, [isOpen])

  // Core navigation items
  const navItems = useMemo<PaletteItem[]>(
    () => [
      {
        id: 'nav-dashboard',
        category: 'Navigation' as const,
        title: 'Dashboard',
        subtitle: 'Overview, operations KPI, and monthly revenue',
        icon: LayoutDashboard,
        onSelect: () => {
          navigate('/')
          onClose()
        },
      },
      {
        id: 'nav-receiving',
        category: 'Navigation' as const,
        title: 'Inward Receipts',
        subtitle: 'Raw kasab yarn intake, tare weights & rola count',
        icon: PackagePlus,
        shortcut: 'G I',
        onSelect: () => {
          navigate('/receiving')
          onClose()
        },
      },
      {
        id: 'nav-dispatch',
        category: 'Navigation' as const,
        title: 'Outward Dispatch',
        subtitle: 'Finished val deliveries, billing & spindle tare',
        icon: Truck,
        shortcut: 'G O',
        onSelect: () => {
          navigate('/dispatch')
          onClose()
        },
      },
      {
        id: 'nav-parties',
        category: 'Navigation' as const,
        title: 'Party Directory',
        subtitle: 'Customer ledgers, contact directory & balances',
        icon: Users,
        shortcut: 'G P',
        onSelect: () => {
          navigate('/parties')
          onClose()
        },
      },
      {
        id: 'nav-payments',
        category: 'Navigation' as const,
        title: 'Billing & Payments',
        subtitle: 'Payment collections, split-logging & receipts',
        icon: IndianRupee,
        onSelect: () => {
          navigate('/payments')
          onClose()
        },
      },
      {
        id: 'nav-expenses',
        category: 'Navigation' as const,
        title: 'Operating Expenses',
        subtitle: 'Labor, maintenance, transport & daily expenses',
        icon: Receipt,
        onSelect: () => {
          navigate('/expenses')
          onClose()
        },
      },
      {
        id: 'nav-reports',
        category: 'Navigation' as const,
        title: 'Reports & Analytics',
        subtitle: 'Executive profit & loss statements, party activity',
        icon: BarChart3,
        onSelect: () => {
          navigate('/reports')
          onClose()
        },
      },
      {
        id: 'nav-settings',
        category: 'Navigation' as const,
        title: 'System Settings',
        subtitle: 'Company profile, rola weights, and party defaults',
        icon: SlidersHorizontal,
        onSelect: () => {
          navigate('/settings')
          onClose()
        },
      },
    ],
    [navigate, onClose]
  )

  // Quick Action items
  const actionItems = useMemo<PaletteItem[]>(
    () => [
      {
        id: 'act-new-inward',
        category: 'Actions' as const,
        title: 'New Inward Receipt',
        subtitle: 'Record fresh kasab yarn delivery from party',
        icon: Plus,
        badge: 'Quick Add',
        shortcut: 'N I',
        onSelect: () => {
          navigate('/receiving?action=new')
          onClose()
        },
      },
      {
        id: 'act-new-outward',
        category: 'Actions' as const,
        title: 'New Outward Dispatch',
        subtitle: 'Create delivery challan for processed val finish',
        icon: Plus,
        badge: 'Quick Add',
        shortcut: 'N O',
        onSelect: () => {
          navigate('/dispatch?action=new')
          onClose()
        },
      },
      {
        id: 'act-new-payment',
        category: 'Actions' as const,
        title: 'Record Payment Collection',
        subtitle: 'Log Cash, Cheque, UPI, or Bank Transfer credit',
        icon: IndianRupee,
        shortcut: 'N P',
        onSelect: () => {
          navigate('/payments?action=new')
          onClose()
        },
      },
      {
        id: 'act-new-party',
        category: 'Actions' as const,
        title: 'Add New Party',
        subtitle: 'Create customer account with customized default tare',
        icon: Users,
        onSelect: () => {
          navigate('/parties?action=new')
          onClose()
        },
      },
      {
        id: 'act-ai-scan',
        category: 'Actions' as const,
        title: 'AI Scan Challan Photo',
        subtitle: 'Auto-extract party, weights, and items from camera/photo',
        icon: Sparkles,
        badge: 'AI Vision',
        onSelect: () => {
          navigate('/receiving')
          onClose()
        },
      },
      {
        id: 'act-theme-dark',
        category: 'Actions' as const,
        title: 'Switch to Dark Mode',
        subtitle: 'Enable high-contrast OLED dark theme',
        icon: Moon,
        onSelect: () => {
          setTheme('dark')
          onClose()
        },
      },
      {
        id: 'act-theme-light',
        category: 'Actions' as const,
        title: 'Switch to Light Mode',
        subtitle: 'Enable clean daylight theme',
        icon: Sun,
        onSelect: () => {
          setTheme('light')
          onClose()
        },
      },
      {
        id: 'act-theme-system',
        category: 'Actions' as const,
        title: 'Switch to System Theme',
        subtitle: 'Automatically sync theme with device operating system',
        icon: Laptop,
        onSelect: () => {
          setTheme('system')
          onClose()
        },
      },
    ],
    [navigate, onClose, setTheme]
  )

  // Build searchable items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      // Default: show quick actions + top navigation
      return [...actionItems, ...navItems]
    }

    const results: PaletteItem[] = []

    // 1. Matched Actions
    actionItems.forEach((item) => {
      if (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
      ) {
        results.push(item)
      }
    })

    // 2. Matched Navigation
    navItems.forEach((item) => {
      if (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
      ) {
        results.push(item)
      }
    })

    // 3. Search Parties by Name, Phone, or Aliases
    const matchedParties = parties.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q)
      const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false
      const aliasMatch = getPartyAliases(p).some((a) => a.toLowerCase().includes(q))
      return nameMatch || phoneMatch || aliasMatch
    })

    matchedParties.slice(0, 8).forEach((p) => {
      const stats = partyStats[p.id]
      const balance = stats?.balance || 0
      const balanceText =
        balance > 0
          ? `${fmtMoney(balance)} due`
          : balance < 0
          ? `${fmtMoney(Math.abs(balance))} adv`
          : 'Cleared'

      results.push({
        id: `party-${p.id}`,
        category: 'Parties',
        title: p.name,
        subtitle: `${p.phone ? `Phone: ${p.phone} • ` : ''}${balanceText} • ${stats?.rolaPending || 0} rola due`,
        icon: Users,
        badge: balance > 0 ? 'Receivable' : undefined,
        onSelect: () => {
          if (onOpenPartyLedger) {
            onOpenPartyLedger(p)
          } else {
            navigate(`/parties?party=${p.id}`)
          }
          onClose()
        },
      })
    })

    // 4. Search Challans by number from both Receipts and Dispatches
    // Extract inward receipt challans
    const receiptChallansMap = new Map<string, { challanNo: string; partyName: string; date: string; weight: number }>()
    receipts.forEach((r) => {
      if (r.challan_no && r.challan_no.trim() !== '') {
        const c = r.challan_no.trim()
        if (c.toLowerCase().includes(q)) {
          if (!receiptChallansMap.has(c)) {
            receiptChallansMap.set(c, {
              challanNo: c,
              partyName: r.party?.name || 'Party',
              date: r.date,
              weight: Number(r.net_weight) || 0,
            })
          }
        }
      }
    })

    // Extract outward dispatch challans
    const dispatchChallansMap = new Map<string, { challanNo: string; partyName: string; date: string; weight: number }>()
    dispatches.forEach((d) => {
      if (d.challan_no && d.challan_no.trim() !== '') {
        const c = d.challan_no.trim()
        if (c.toLowerCase().includes(q)) {
          if (!dispatchChallansMap.has(c)) {
            dispatchChallansMap.set(c, {
              challanNo: c,
              partyName: d.party?.name || 'Party',
              date: d.date,
              weight: Number(d.net_val_weight) || 0,
            })
          }
        }
      }
    })

    receiptChallansMap.forEach((item) => {
      results.push({
        id: `challan-inward-${item.challanNo}`,
        category: 'Challans',
        title: `Challan #${item.challanNo}`,
        subtitle: `Inward Receipt • ${item.partyName} • ${fmtDate(item.date)} • ${fmtKg(item.weight)} net`,
        icon: FileText,
        badge: 'Inward',
        onSelect: () => {
          navigate(`/receiving?search=${encodeURIComponent(item.challanNo)}`)
          onClose()
        },
      })
    })

    dispatchChallansMap.forEach((item) => {
      results.push({
        id: `challan-outward-${item.challanNo}`,
        category: 'Challans',
        title: `Challan #${item.challanNo}`,
        subtitle: `Outward Dispatch • ${item.partyName} • ${fmtDate(item.date)} • ${fmtKg(item.weight)} val`,
        icon: Truck,
        badge: 'Outward',
        onSelect: () => {
          navigate(`/dispatch?search=${encodeURIComponent(item.challanNo)}`)
          onClose()
        },
      })
    })

    return results
  }, [query, actionItems, navItems, parties, partyStats, receipts, dispatches, navigate, onClose, onOpenPartyLedger])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filteredItems, selectedIndex, onClose]
  )

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  // Group items by category
  const categories = ['Actions', 'Navigation', 'Parties', 'Challans'] as const
  let itemCounter = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Palette Container */}
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[75vh] animate-in zoom-in-95 duration-150 transition-colors"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search size={18} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parties, challans, pages, or actions..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none border-none ring-0 focus:ring-0 p-0"
            aria-label="Command search"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0 text-slate-400">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded shadow-2xs">
                ESC
              </kbd>
            </div>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-hide">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400 dark:text-slate-500">
                <Search size={18} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No matching commands, parties, or challans</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try searching by party name, phone number, or challan #</p>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredItems.filter((i) => i.category === cat)
              if (catItems.length === 0) return null

              return (
                <div key={cat} className="py-2 first:pt-1 last:pb-1">
                  <div className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map((item) => {
                      const currentIndex = itemCounter++
                      const isSelected = currentIndex === selectedIndex
                      const Icon = item.icon

                      return (
                        <div
                          key={item.id}
                          data-index={currentIndex}
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                      isSelected
                                        ? 'bg-blue-700 text-blue-100 border border-blue-500'
                                        : item.badge === 'Inward'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
                                        : item.badge === 'Outward'
                                        ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                                        : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.shortcut && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                                  isSelected
                                    ? 'bg-blue-700 text-blue-100 border border-blue-500'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {item.shortcut}
                              </span>
                            )}
                            {isSelected && (
                              <CornerDownLeft size={14} className="text-blue-200" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.2 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.2 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">Esc</kbd>
              <span>to close</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              ⌘/Ctrl + S (Save)
            </span>
            <span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              N + I (Inward)
            </span>
            <span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              N + O (Outward)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette

