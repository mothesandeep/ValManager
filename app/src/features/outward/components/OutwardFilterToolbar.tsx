import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Search,
  X,
  Users,
  ChevronDown,
  RotateCcw,
  Scale,
  Calendar,
  Check,
  Printer,
  Download,
  FileText,
  UserCheck,
  Truck,
  Clock,
  Globe,
  CalendarRange,
} from 'lucide-react'
import { PartyPopover } from '@/components/common/PartyPopover'
import type { Party } from '@/features/parties/types'
import type { DispatchDateRange, DispatchWeightFilter } from '@/features/outward/types'
import { SHORT_MONTH_NAMES } from '@/utils/date'

export interface OutwardFilterToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedPartyId: string | null
  partyFilterButtonLabel: string
  parties: Party[]
  onSelectParty: (partyId: string | null) => void
  partyDispatchCounts: Record<string, number>
  totalBaseCount: number
  recordsCount: number
  hasActiveFilters: boolean
  onResetFilters: () => void
  weightFilter: DispatchWeightFilter
  weightFilterLabel: string
  onSelectWeightFilter: (filter: DispatchWeightFilter) => void
  dateRangeFilter: DispatchDateRange
  dateFilterLabel: string
  onSelectDateRangeFilter: (filter: DispatchDateRange) => void
  formattedMonth: string
  customStartDate: string
  customEndDate: string
  onChangeCustomStartDate: (val: string) => void
  onChangeCustomEndDate: (val: string) => void
  selectedGroupKeysCount: number
  onOpenPrintModal?: (view: 'register' | 'statement' | 'challan') => void
  onExportCSV: () => void
}

export function OutwardFilterToolbar({
  searchQuery,
  onSearchChange,
  selectedPartyId,
  partyFilterButtonLabel,
  parties,
  onSelectParty,
  partyDispatchCounts,
  totalBaseCount,
  recordsCount,
  hasActiveFilters,
  onResetFilters,
  weightFilter,
  weightFilterLabel,
  onSelectWeightFilter,
  dateRangeFilter,
  dateFilterLabel,
  onSelectDateRangeFilter,
  formattedMonth,
  customStartDate,
  customEndDate,
  onChangeCustomStartDate,
  onChangeCustomEndDate,
  selectedGroupKeysCount,
  onOpenPrintModal,
  onExportCSV,
}: OutwardFilterToolbarProps) {
  const [partyPopoverAnchor, setPartyPopoverAnchor] = useState<'mobile' | 'desktop' | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<'weight' | 'date' | 'print' | null>(null)

  const weightDropdownRef = useRef<HTMLDivElement>(null)
  const dateDropdownRef = useRef<HTMLDivElement>(null)
  const printDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        activeDropdown === 'weight' &&
        weightDropdownRef.current &&
        !weightDropdownRef.current.contains(target)
      ) {
        setActiveDropdown(null)
      }
      if (
        activeDropdown === 'date' &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(target)
      ) {
        setActiveDropdown(null)
      }
      if (
        activeDropdown === 'print' &&
        printDropdownRef.current &&
        !printDropdownRef.current.contains(target)
      ) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const now = new Date()
  const curMonthLabel = `${SHORT_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthLabel = `${SHORT_MONTH_NAMES[prevDate.getMonth()]} ${prevDate.getFullYear()}`

  const dateFilterOptions = useMemo<
    { id: DispatchDateRange; label: string; icon: typeof Calendar }[]
  >(
    () => [
      { id: 'month', label: `This Month (${curMonthLabel})`, icon: Calendar },
      { id: 'last_month', label: `Last Month (${prevMonthLabel})`, icon: Calendar },
      { id: '7days', label: 'Last 7 Days', icon: Clock },
      { id: 'all', label: 'All Time', icon: Globe },
      { id: 'custom', label: 'Custom Range', icon: CalendarRange },
    ],
    [curMonthLabel, prevMonthLabel]
  )

  const DateIcon =
    dateRangeFilter === '7days'
      ? Clock
      : dateRangeFilter === 'all'
      ? Globe
      : dateRangeFilter === 'custom'
      ? CalendarRange
      : Calendar

  return (
    <>
      {/* ── Mobile Search Bar (< 768px) ── */}
      <div className="block md:hidden mb-3">
        <div className="relative w-full h-11 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs shadow-sm flex items-center gap-2.5">
          <Search size={16} className="text-slate-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Challan #, Party, Date..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-full bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer shrink-0"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Clean Single-Row Filter Bar (< 768px) ── */}
      <div className="flex md:hidden items-center justify-between mb-3 px-0.5">
        {/* Left: All Parties Filter Pill with anchored Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPartyPopoverAnchor((prev) => (prev === 'mobile' ? null : 'mobile'))}
            className={`h-9 px-3 text-xs font-medium rounded-xl border flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 select-none ${
              selectedPartyId
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/90 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Filter by party"
          >
            <Users
              size={13}
              className={
                selectedPartyId
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }
            />
            <span className="truncate max-w-[130px]">{partyFilterButtonLabel}</span>
            <ChevronDown
              size={12}
              className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150 ${
                partyPopoverAnchor === 'mobile' ? 'rotate-180' : ''
              }`}
            />
          </button>

          <PartyPopover
            isOpen={partyPopoverAnchor === 'mobile'}
            onClose={() => setPartyPopoverAnchor(null)}
            parties={parties}
            selectedPartyId={selectedPartyId}
            onSelectParty={onSelectParty}
            receiptCounts={partyDispatchCounts}
            totalCount={totalBaseCount}
            align="left"
          />
        </div>

        {/* Right: Records count / Active filter status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium font-mono">
            {recordsCount} records
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-7 px-2 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              title="Clear all filters"
            >
              <RotateCcw size={11} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sleek Compact Enterprise Toolbar (Desktop >= 768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-2.5 mb-4">
        {/* Left: Compact Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by Challan #, Party, Date..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-800 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-800/10 dark:focus:ring-slate-700/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: Dropdown Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-between md:justify-end">
          {/* 1. Party Filter Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPartyPopoverAnchor((prev) => (prev === 'desktop' ? null : 'desktop'))}
              className={`h-9 px-3 text-xs font-medium rounded-xl border border-slate-200/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs select-none ${
                selectedPartyId
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-900/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Filter by party"
            >
              <Users
                size={14}
                className={
                  selectedPartyId
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }
              />
              <span className="truncate max-w-[150px]">{partyFilterButtonLabel}</span>
              <ChevronDown
                size={13}
                className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150 ${
                  partyPopoverAnchor === 'desktop' ? 'rotate-180' : ''
                }`}
              />
            </button>

            <PartyPopover
              isOpen={partyPopoverAnchor === 'desktop'}
              onClose={() => setPartyPopoverAnchor(null)}
              parties={parties}
              selectedPartyId={selectedPartyId}
              onSelectParty={onSelectParty}
              receiptCounts={partyDispatchCounts}
              totalCount={totalBaseCount}
              align="right"
            />
          </div>

          {/* 2. Weight Range Dropdown */}
          <div className="relative" ref={weightDropdownRef}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'weight' ? null : 'weight')}
              className={`h-9 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                weightFilter !== 'all'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Scale size={14} className={weightFilter !== 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
              <span>{weightFilterLabel}</span>
              <ChevronDown size={13} className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${activeDropdown === 'weight' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'weight' && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-40 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                {[
                  { id: 'all', label: 'All Weights' },
                  { id: 'under10', label: 'Under 10 kg (< 10kg)' },
                  { id: '10to25', label: 'Medium (10 – 25 kg)' },
                  { id: 'over25', label: 'Heavy (> 25 kg)' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onSelectWeightFilter(w.id as DispatchWeightFilter)
                      setActiveDropdown(null)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      weightFilter === w.id
                        ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{w.label}</span>
                    {weightFilter === w.id && <Check size={13} className="text-slate-800 dark:text-slate-200" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Date / Period Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
              className={`h-9 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                dateRangeFilter !== 'month'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <DateIcon size={14} className={dateRangeFilter !== 'month' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
              <span>{dateFilterLabel}</span>
              <ChevronDown size={13} className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${activeDropdown === 'date' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'date' && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-40 p-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-0.5">
                  {dateFilterOptions.map((p) => {
                    const isSelected = dateRangeFilter === p.id
                    const OptionIcon = p.icon
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectDateRangeFilter(p.id)
                          if (p.id !== 'custom') setActiveDropdown(null)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <OptionIcon size={13.5} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                          <span className="truncate">{p.label}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-slate-800 dark:text-slate-200 ml-1 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {dateRangeFilter === 'custom' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">From Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => onChangeCustomStartDate(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">To Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => onChangeCustomEndDate(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(null)}
                      className="w-full mt-1 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Print & Export Action Dropdown */}
          <div className="relative" ref={printDropdownRef}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'print' ? null : 'print')}
              className="h-9 px-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer select-none"
              title="Print Register & Challans"
            >
              <Printer size={14} className="text-slate-500 dark:text-slate-400" />
              <span>Print</span>
              {selectedGroupKeysCount > 0 && (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono">
                  {selectedGroupKeysCount}
                </span>
              )}
              <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${activeDropdown === 'print' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'print' && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-40 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                {onOpenPrintModal && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null)
                        onOpenPrintModal('register')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-medium text-left"
                    >
                      <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="font-semibold">Dispatch Register</div>
                        <div className="text-[10px] text-slate-400">Monthly breakdown matrix</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null)
                        onOpenPrintModal('statement')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-medium text-left"
                    >
                      <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-semibold">Party Statement</div>
                        <div className="text-[10px] text-slate-400">Individual ledger report</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null)
                        onOpenPrintModal('challan')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-medium text-left"
                    >
                      <Truck size={14} className="text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold">Delivery Challans</div>
                        <div className="text-[10px] text-slate-400">Official slips (Rule 55)</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null)
                    onExportCSV()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-medium text-left"
                >
                  <Download size={14} className="text-slate-500" />
                  <div>
                    <div className="font-semibold">Export to CSV</div>
                    <div className="text-[10px] text-slate-400">Raw ledger table rows</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 5. Reset Filters (if active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-9 px-2.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Bottom Sheet Modals (< 768px) ── */}
      {activeDropdown && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setActiveDropdown(null)}
            aria-label="Close filter modal"
          />

          {/* Sheet Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] p-5 pb-8 space-y-4 bg-white dark:bg-slate-900 animate-in slide-in-from-bottom duration-250 ease-out max-h-[85vh] flex flex-col"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center -mt-1 pb-1">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {activeDropdown === 'weight' && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Filter by Weight Range
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                <div className="space-y-1.5 py-1">
                  {[
                    { id: 'all', label: 'All Weights', desc: 'Show all dispatches regardless of weight' },
                    { id: 'under10', label: 'Under 10 kg', desc: 'Net Val < 10.000 kg' },
                    { id: '10to25', label: 'Medium (10 – 25 kg)', desc: 'Net Val between 10.000 and 25.000 kg' },
                    { id: 'over25', label: 'Heavy (> 25 kg)', desc: 'Net Val greater than 25.000 kg' },
                  ].map((w) => {
                    const isSelected = weightFilter === w.id
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onSelectWeightFilter(w.id as DispatchWeightFilter)
                          setActiveDropdown(null)
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className={`text-sm font-bold ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                            {w.label}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                            {w.desc}
                          </div>
                        </div>
                        {isSelected && <Check size={16} strokeWidth={2.5} className="text-white dark:text-slate-900 shrink-0 ml-2" />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {activeDropdown === 'date' && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Filter by Period
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                <div className="space-y-1.5 py-1">
                  {dateFilterOptions.map((p) => {
                    const isSelected = dateRangeFilter === p.id
                    const OptionIcon = p.icon
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectDateRangeFilter(p.id)
                          if (p.id !== 'custom') setActiveDropdown(null)
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <OptionIcon size={18} className={isSelected ? 'text-white dark:text-slate-900' : 'text-slate-400 dark:text-slate-500'} />
                          <span className={`text-sm font-bold ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                            {p.label}
                          </span>
                        </div>
                        {isSelected && <Check size={16} strokeWidth={2.5} className="text-white dark:text-slate-900 shrink-0 ml-2" />}
                      </button>
                    )
                  })}

                  {dateRangeFilter === 'custom' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">From Date</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => onChangeCustomStartDate(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">To Date</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => onChangeCustomEndDate(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(null)}
                        className="w-full mt-2 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Apply Date Range
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeDropdown === 'print' && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Print Reports & Registers
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Official statements and outward challan slips
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                <div className="space-y-2 py-1">
                  {onOpenPrintModal && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown(null)
                          onOpenPrintModal('register')
                        }}
                        className="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-start gap-3 transition-colors cursor-pointer"
                      >
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Monthly Dispatch Register</span>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono font-medium">
                              {formattedMonth}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Combined monthly dispatch register with totals
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown(null)
                          onOpenPrintModal('statement')
                        }}
                        className="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-start gap-3 transition-colors cursor-pointer"
                      >
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            Party-wise Monthly Statement
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Statement breakdown for selected parties
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown(null)
                          onOpenPrintModal('challan')
                        }}
                        className="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-start gap-3 transition-colors cursor-pointer"
                      >
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                          <Truck size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Delivery Challans (Batch)</span>
                            {selectedGroupKeysCount > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                {selectedGroupKeysCount} selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Official delivery challan slips (Rule 55, 1-per-page)
                          </p>
                        </div>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdown(null)
                      onExportCSV()
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                      <Download size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Export to CSV
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Download raw dispatch records to CSV
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
