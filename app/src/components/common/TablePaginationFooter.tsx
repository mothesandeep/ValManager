import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface TablePaginationFooterProps {
  totalEntries: number
  currentPage: number
  totalPages: number
  pageSize: number
  setPageSize: (size: number) => void
  setCurrentPage: React.Dispatch<React.SetStateAction<number>> | ((page: number | ((prev: number) => number)) => void)
  className?: string
}

export function TablePaginationFooter({
  totalEntries,
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
  className = '',
}: TablePaginationFooterProps) {
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endEntry = Math.min(currentPage * pageSize, totalEntries)

  return (
    <div
      className={`flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-3 sm:px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 select-none ${className}`}
    >
      {/* Left Section: Count & Page Size */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span className="text-slate-500 dark:text-slate-400 font-normal truncate">
          Showing {startEntry}–{endEntry} of {totalEntries}
        </span>

        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
          •
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            aria-label="Rows per page"
            className="h-7 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Right Section: Pagination Navigation */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
          <span className="sm:hidden">{currentPage} / {totalPages}</span>
          <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default TablePaginationFooter

