import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '../../context/MonthContext'
import { currentMonthStr } from '../../types'

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

  // Hidden native month picker (shared)
  const hiddenInput = (
    <input
      ref={monthInputRef}
      type="month"
      value={selectedMonth === 'all' ? currentMonthStr() : selectedMonth}
      onChange={handleMonthInputChange}
      className="sr-only"
      tabIndex={-1}
      aria-label="Pick specific month"
    />
  )

  return (
    <>
      {hiddenInput}

      {/* ── MOBILE: compact single-row strip (hidden on sm+) ─────────── */}
      <div
        className={`sm:hidden flex items-center gap-1.5 ${className}`}
      >
        {/* Prev arrow */}
        <button
          type="button"
          disabled={isAllTime}
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          aria-label="Previous Month"
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>

        {/* Month label — tap to open picker */}
        <button
          type="button"
          onClick={triggerMonthPicker}
          disabled={isAllTime}
          className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 rounded-lg border border-[var(--color-border)] bg-white cursor-pointer disabled:cursor-default active:bg-[var(--color-border-soft)] transition-all"
          title={isAllTime ? 'All Time' : 'Tap to jump to month'}
        >
          <span
            className="text-sm font-bold truncate tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              color: isAllTime ? 'var(--color-ink-soft)' : 'var(--color-brass)',
            }}
          >
            {formattedMonth}
          </span>
        </button>

        {/* Next arrow */}
        <button
          type="button"
          disabled={isAllTime}
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          aria-label="Next Month"
        >
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>

        {/* Compact This Month / All Time toggle */}
        <div
          className="flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-paper)] shrink-0"
          style={{ height: '32px' }}
        >
          <button
            type="button"
            onClick={setThisMonth}
            className={`h-full px-2.5 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isCurrentMonth && !isAllTime
                ? 'bg-[var(--color-brass)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            Now
          </button>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <button
            type="button"
            onClick={setAllTime}
            className={`h-full px-2.5 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isAllTime
                ? 'bg-[var(--color-brass)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* ── DESKTOP: full card layout (hidden on mobile) ──────────────── */}
      <div
        className={`hidden sm:flex w-full rounded-2xl bg-white border border-[var(--color-border)] px-4 py-2.5 shadow-2xs items-center justify-between gap-3 ${className}`}
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Left: Month navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isAllTime}
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-white hover:border-[var(--color-brass)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={triggerMonthPicker}
            disabled={isAllTime}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg hover:bg-[var(--color-paper)] active:bg-[var(--color-border-soft)] disabled:hover:bg-transparent cursor-pointer disabled:cursor-default transition-all group"
            title={isAllTime ? 'All Time Selected' : 'Click to jump to a specific month'}
          >
            <span
              className={`font-bold tabular-nums text-base tracking-wide whitespace-nowrap ${
                isAllTime ? 'text-[var(--color-ink-soft)]' : 'text-[var(--color-ink)]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formattedMonth}
            </span>
          </button>

          <button
            type="button"
            disabled={isAllTime}
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-white hover:border-[var(--color-brass)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Right: This Month / All Time segmented toggle */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] gap-1 shadow-inner">
          <button
            type="button"
            onClick={setThisMonth}
            className={`min-h-[32px] px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              isCurrentMonth && !isAllTime
                ? 'bg-[var(--color-brass)] text-white shadow-xs font-bold'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/70'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={setAllTime}
            className={`min-h-[32px] px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              isAllTime
                ? 'bg-[var(--color-brass)] text-white shadow-xs font-bold'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/70'
            }`}
          >
            All Time
          </button>
        </div>
      </div>
    </>
  )
}

export default MonthSelector
