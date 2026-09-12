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

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 shrink-0 ${className}`}>
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

      {/* 1. Month Selector — Single cohesive pill container */}
      <div
        className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200/80 px-1 shadow-inner"
        style={{ height: '30px' }}
      >
        {/* Prev arrow */}
        <button
          type="button"
          disabled={isAllTime}
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-sm active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          title="Previous Month"
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        {/* Month label */}
        <button
          type="button"
          onClick={triggerMonthPicker}
          disabled={isAllTime}
          className="px-2.5 h-full flex items-center justify-center rounded-full hover:bg-white/50 active:bg-gray-200/50 disabled:cursor-default cursor-pointer transition-all"
          title={isAllTime ? 'All Time Selected' : 'Tap to jump to month'}
        >
          <span
            className="text-[13px] font-black tabular-nums tracking-tight whitespace-nowrap text-[#a57b3f] hover:text-[#8f6932] transition-colors"
          >
            {formattedMonth}
          </span>
        </button>

        {/* Next arrow */}
        <button
          type="button"
          disabled={isAllTime}
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-sm active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
          title="Next Month"
          aria-label="Next Month"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. Now / All Segmented Control */}
      <div
        className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200/80 p-0.5 shadow-inner"
        style={{ height: '30px' }}
      >
        <button
          type="button"
          onClick={setThisMonth}
          className={`h-full px-3.5 flex items-center justify-center rounded-full text-[12px] transition-all cursor-pointer whitespace-nowrap ${
            isCurrentMonth && !isAllTime
              ? 'bg-white text-[#a57b3f] font-black shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:text-gray-700 font-bold'
          }`}
          style={{ minWidth: '42px' }}
        >
          Now
        </button>
        <button
          type="button"
          onClick={setAllTime}
          className={`h-full px-3.5 flex items-center justify-center rounded-full text-[12px] transition-all cursor-pointer whitespace-nowrap ${
            isAllTime
              ? 'bg-white text-[#a57b3f] font-black shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:text-gray-700 font-bold'
          }`}
          style={{ minWidth: '42px' }}
        >
          All
        </button>
      </div>    </div>
  )
}

export default MonthSelector
