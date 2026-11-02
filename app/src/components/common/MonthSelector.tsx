import React, { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { useMonth } from '@/context/MonthContext'
import { PeriodPopover } from '@/components/common/PeriodPopover'

export interface MonthSelectorProps {
  className?: string
  buttonClassName?: string
  isOpen?: boolean
  onClose?: () => void
  onToggle?: () => void
  onSelectPeriod?: (period: string) => void
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  className = '',
  buttonClassName = '',
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onToggle: controlledOnToggle,
  onSelectPeriod,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleToggle = () => {
    if (controlledOnToggle) {
      controlledOnToggle()
    } else {
      setInternalIsOpen((prev) => !prev)
    }
  }

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  const { formattedMonth, isAllTime } = useMonth()

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={
          buttonClassName ||
          'h-10 sm:h-9 min-h-[40px] sm:min-h-0 px-3 sm:px-3.5 text-xs font-semibold rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 sm:gap-2 active:scale-95 transition-transform shrink-0 cursor-pointer select-none'
        }
        title="Filter by period"
        aria-label="Filter by period"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate max-w-[100px] sm:max-w-[120px]">
          {isAllTime ? 'All Time' : formattedMonth}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 ml-0.5 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <PeriodPopover
        isOpen={isOpen}
        onClose={handleClose}
        onSelectPeriod={onSelectPeriod}
      />
    </div>
  )
}

export default MonthSelector
