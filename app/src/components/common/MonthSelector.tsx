import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
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
    <div className={`flex items-center gap-2 sm:gap-3 shrink-0 select-none ${className}`}>
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

      {/* 1. Month Navigator with solid rounded-xl border & dropdown support */}
      <div
        className="inline-flex items-center rounded-xl bg-white border border-slate-200/90 px-1 shadow-xs transition-all hover:border-slate-300 h-[36px]"
      >
        <button
          type="button"
          disabled={isAllTime}
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          title="Previous month"
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>

        <button
          type="button"
          onClick={triggerMonthPicker}
          disabled={isAllTime}
          className="px-2 h-full flex items-center justify-center gap-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 disabled:cursor-default cursor-pointer transition-all group"
          title={isAllTime ? 'All historical records' : 'Click to pick custom month'}
        >
          <Calendar size={13} className="text-slate-600 group-hover:text-slate-900 shrink-0 transition-colors" />
          <span className="text-[12.5px] font-bold tabular-nums tracking-tight whitespace-nowrap text-slate-800 group-hover:text-slate-900 transition-colors">
            {formattedMonth}
          </span>
          {!isAllTime && (
            <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
          )}
        </button>

        <button
          type="button"
          disabled={isAllTime}
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          title="Next month"
        >
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
      </div>

      {/* 2. Modern Segmented Tab Pills: [ Current Month | All Time ] */}
      <div
        className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/80 p-0.5 shadow-xs"
      >
        <button
          type="button"
          onClick={setThisMonth}
          className={`font-medium px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
            !isAllTime
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="hidden sm:inline">Current Month</span>
          <span className="sm:hidden">Current</span>
        </button>
        <button
          type="button"
          onClick={setAllTime}
          className={`font-medium px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
            isAllTime
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>All Time</span>
        </button>
      </div>
    </div>
  )
}

export default MonthSelector
