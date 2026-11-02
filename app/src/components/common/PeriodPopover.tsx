import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Calendar, Check, Clock, Globe, CalendarRange } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useMonth } from '../../context/MonthContext'
import { currentMonthStr, shiftMonth, SHORT_MONTH_NAMES } from '../../utils/date'
import { shouldAutoFocusSearch } from '@/utils/device'

export interface PeriodPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSelectPeriod?: (period: string) => void
  className?: string
}

export const PeriodPopover: React.FC<PeriodPopoverProps> = ({
  isOpen,
  onClose,
  onSelectPeriod,
  className = '',
}) => {
  const location = useLocation()
  const {
    selectedMonth,
    setSelectedMonth,
    setThisMonth,
    setLastMonth,
    setLast7Days,
    setAllTime,
    setCustomRange,
    isCurrentMonth,
    isLastMonth,
    isLast7Days,
    isAllTime,
    formattedMonth,
  } = useMonth()

  const monthInputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [showInlinePicker, setShowInlinePicker] = useState(false)
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(() =>
    selectedMonth.startsWith('custom:')
  )
  const [customStart, setCustomStart] = useState(() => {
    if (selectedMonth.startsWith('custom:')) {
      return selectedMonth.split(':')[1] || ''
    }
    return ''
  })
  const [customEnd, setCustomEnd] = useState(() => {
    if (selectedMonth.startsWith('custom:')) {
      return selectedMonth.split(':')[2] || ''
    }
    return ''
  })

  // Auto-dismiss on page scroll (skip if scroll event originated within popover)
  useEffect(() => {
    if (!isOpen) return

    const handleScroll = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
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

  // Compute dynamic preset labels & values
  const presets = useMemo(() => {
    const now = new Date()
    const curMonth = currentMonthStr(now)
    const lastMonth = shiftMonth(curMonth, -1)

    // Current Month format: e.g. "Oct 2026"
    const curLabel = `${SHORT_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

    // Last Month format: e.g. "Sep 2026"
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastLabel = `${SHORT_MONTH_NAMES[prevDate.getMonth()]} ${prevDate.getFullYear()}`

    return [
      {
        id: 'this_month',
        label: `This Month (${curLabel})`,
        icon: Calendar,
        isSelected: isCurrentMonth,
        select: () => {
          setThisMonth()
          setShowCustomRangePicker(false)
          onSelectPeriod?.(curMonth)
          onClose()
        },
      },
      {
        id: 'last_month',
        label: `Last Month (${lastLabel})`,
        icon: Calendar,
        isSelected: isLastMonth,
        select: () => {
          setLastMonth()
          setShowCustomRangePicker(false)
          onSelectPeriod?.(lastMonth)
          onClose()
        },
      },
      {
        id: '7days',
        label: 'Last 7 Days',
        icon: Clock,
        isSelected: isLast7Days,
        select: () => {
          setLast7Days()
          setShowCustomRangePicker(false)
          onSelectPeriod?.('7days')
          onClose()
        },
      },
      {
        id: 'all',
        label: 'All Time',
        icon: Globe,
        isSelected: isAllTime,
        select: () => {
          setAllTime()
          setShowCustomRangePicker(false)
          onSelectPeriod?.('all')
          onClose()
        },
      },
      {
        id: 'custom',
        label: 'Custom Range',
        icon: CalendarRange,
        isSelected: selectedMonth.startsWith('custom:'),
        select: () => {
          setShowCustomRangePicker((prev) => !prev)
        },
      },
    ]
  }, [
    isCurrentMonth,
    isLastMonth,
    isLast7Days,
    isAllTime,
    selectedMonth,
    setThisMonth,
    setLastMonth,
    setLast7Days,
    setAllTime,
    onSelectPeriod,
    onClose,
  ])

  if (!isOpen) return null

  // Active label for header mini row
  const activeLabel = formattedMonth || 'All Time'

  const handleApplyCustomRange = () => {
    if (customStart || customEnd) {
      setCustomRange(customStart, customEnd)
      onSelectPeriod?.(`custom:${customStart}:${customEnd}`)
      onClose()
    }
  }

  const handleCustomMonthClick = () => {
    if (monthInputRef.current) {
      if (typeof monthInputRef.current.showPicker === 'function') {
        try {
          monthInputRef.current.showPicker()
          return
        } catch {
          // Fall back to inline input if showPicker fails (e.g. user gesture permission)
        }
      }
    }
    setShowInlinePicker((prev) => !prev)
  }

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const val = e.target.value
      setSelectedMonth(val)
      onSelectPeriod?.(val)
      setShowInlinePicker(false)
      setShowCustomRangePicker(false)
      onClose()
    }
  }

  return (
    <>
      {/* Invisible tap-outside backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Dismiss popover"
      />

      {/* Anchored popover card */}
      <div
        ref={popoverRef}
        className={`absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 p-2.5 space-y-2 select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Mini Row */}
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 px-1.5">
            TIMELINE
          </span>
          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[120px]">
            {activeLabel}
          </span>
        </div>

        {/* Quick Presets: 5 options */}
        <div className="space-y-1">
          {presets.map((preset) => {
            const isSelected = preset.isSelected
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                type="button"
                onClick={preset.select}
                className={`w-full h-8 px-2.5 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon size={13.5} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                  <span className="truncate">{preset.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1.5" />
                )}
              </button>
            )
          })}
        </div>

        {/* Custom Date Range Picker Container */}
        {showCustomRangePicker && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 mt-1">
            <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">From Date</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-400">To Date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCustomRange}
              className="w-full mt-1 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Apply Date Range
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

        {/* Pick Other Month Option */}
        <div className="relative">
          <button
            type="button"
            onClick={handleCustomMonthClick}
            className="w-full h-8 px-2.5 rounded-lg flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">Pick Specific Month...</span>
          </button>

          {/* Hidden native month picker */}
          <input
            ref={monthInputRef}
            type="month"
            value={
              selectedMonth.startsWith('fy-') ||
              selectedMonth === 'all' ||
              selectedMonth === '7days' ||
              selectedMonth.startsWith('custom:')
                ? currentMonthStr()
                : selectedMonth
            }
            onChange={handleMonthInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-label="Pick custom month"
          />

          {/* Fallback inline month input if showPicker is unsupported */}
          {showInlinePicker && (
            <div className="mt-1.5 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="month"
                value={
                  selectedMonth.startsWith('fy-') ||
                  selectedMonth === 'all' ||
                  selectedMonth === '7days' ||
                  selectedMonth.startsWith('custom:')
                    ? currentMonthStr()
                    : selectedMonth
                }
                onChange={handleMonthInputChange}
                className="w-full h-7 px-2 text-xs font-mono font-medium rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                autoFocus={shouldAutoFocusSearch()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PeriodPopover
