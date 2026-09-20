import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '../../context/MonthContext'
import { currentMonthStr } from '../../utils/date'

interface MonthSelectorProps {
  className?: string
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ className = '' }) => {
  const {
    selectedMonth,
    setSelectedMonth,
    prevMonth,
    nextMonth,
    setThisMonth,
    setAllTime,
    formattedMonth,
    isAllTime,
    isCurrentMonth,
  } = useMonth()

  const monthInputRef = useRef<HTMLInputElement>(null)

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedMonth(e.target.value)
    }
  }

  const triggerMonthPicker = () => {
    if (monthInputRef.current) {
      if (typeof monthInputRef.current.showPicker === 'function') {
        monthInputRef.current.showPicker()
      } else {
        monthInputRef.current.focus()
      }
    }
  }

  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {/* Hidden native month picker */}
      <input
        ref={monthInputRef}
        type="month"
        value={selectedMonth === 'all' ? currentMonthStr() : selectedMonth}
        onChange={handleMonthInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-label="Pick specific month"
      />

      {/* 1. Month Selector */}
      <div
        className="inline-flex items-center rounded-full bg-[var(--color-card)] border border-[var(--color-border)] px-1 shadow-[var(--shadow-sm)]"
        style={{ height: '32px' }}
      >
        <button
          type="button"
          disabled={isAllTime}
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={triggerMonthPicker}
          disabled={isAllTime}
          className="px-3 h-full flex items-center justify-center rounded-full hover:bg-[var(--color-paper)] active:bg-[var(--color-border-soft)] disabled:cursor-default cursor-pointer transition-all"
        >
          <span className="text-[13px] font-bold tabular-nums tracking-tight whitespace-nowrap text-[var(--color-brass)]">
            {formattedMonth}
          </span>
        </button>

        <button
          type="button"
          disabled={isAllTime}
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* 2. Now / All Segmented Control */}
      <div
        className="inline-flex items-center rounded-full bg-[var(--color-card)] border border-[var(--color-border)] p-0.5 shadow-[var(--shadow-sm)]"
        style={{ height: '32px' }}
      >
        <button
          type="button"
          onClick={setThisMonth}
          className={`h-full px-3 flex items-center justify-center rounded-full text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            isCurrentMonth && !isAllTime
              ? 'bg-[var(--color-paper)] text-[var(--color-brass)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
          style={{ minWidth: '40px' }}
        >
          Now
        </button>
        <button
          type="button"
          onClick={setAllTime}
          className={`h-full px-3 flex items-center justify-center rounded-full text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            isAllTime
              ? 'bg-[var(--color-paper)] text-[var(--color-brass)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
          style={{ minWidth: '40px' }}
        >
          All
        </button>
      </div>
    </div>
  )
}

export default MonthSelector
