import React from 'react'
import { Search, Printer, Download, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { InwardTable } from '@/features/inward/components/InwardTable'
import type { InwardReceiptGroup, InwardSortField, ReceiptWithParty } from '@/features/inward/types/inward.types'

interface InwardGridProps {
  displayReceiptsCount: number
  sortedReceiptGroups: InwardReceiptGroup[]
  paginatedReceiptGroups: InwardReceiptGroup[]
  loading: boolean
  isAllTime: boolean
  formattedMonth: string
  onStartAdd: () => void
  onResetFilters: () => void
  selectedGroupIds: Set<string>
  isAllSelected: boolean
  toggleSelectAll: () => void
  toggleSelectGroup: (id: string, e: React.MouseEvent) => void
  sortField: InwardSortField
  sortOrder: 'asc' | 'desc'
  toggleSort: (field: InwardSortField) => void
  onSelectGroup: (id: string) => void
  onStartEdit: (r: ReceiptWithParty, receipts?: ReceiptWithParty[]) => void
  onPrintGroup: (group: InwardReceiptGroup) => void
  onDeleteGroup: (group: InwardReceiptGroup) => void
  activeRowMenuKey: string | null
  setActiveRowMenuKey: (key: string | null) => void
  tableScrollRef: React.RefObject<HTMLDivElement | null>
  checkTableScroll: () => void
  canScrollRight: boolean
  filteredTotalNet: number
  filteredTotalGross: number
  filteredTotalRola: number
  totalPages: number
  currentPage: number
  setCurrentPage: (p: number) => void
  pageSize: number
  setPageSize: (s: number) => void
  onBatchPrint: () => void
  onBatchExportCSV: () => void
  onBatchDelete: () => void
  onClearSelection: () => void
}

export function InwardGrid({
  displayReceiptsCount,
  sortedReceiptGroups,
  paginatedReceiptGroups,
  loading,
  isAllTime,
  formattedMonth,
  onStartAdd,
  onResetFilters,
  selectedGroupIds,
  isAllSelected,
  toggleSelectAll,
  toggleSelectGroup,
  sortField,
  sortOrder,
  toggleSort,
  onSelectGroup,
  onStartEdit,
  onPrintGroup,
  onDeleteGroup,
  activeRowMenuKey,
  setActiveRowMenuKey,
  tableScrollRef,
  checkTableScroll,
  canScrollRight,
  filteredTotalNet,
  filteredTotalGross,
  filteredTotalRola,
  totalPages,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  onBatchPrint,
  onBatchExportCSV,
  onBatchDelete,
  onClearSelection,
}: InwardGridProps) {
  if (displayReceiptsCount === 0 && !loading) {
    return (
      <EmptyState
        title="No inward receipts found"
        description={`No receipt records logged for ${isAllTime ? 'All Time' : formattedMonth}.`}
        actionLabel="New Receipt"
        onAction={onStartAdd}
      />
    )
  }

  if (sortedReceiptGroups.length === 0 && !loading) {
    return (
      <EmptyState
        icon={Search}
        title="No matching receipts found"
        description="Try adjusting your filters or search query."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
        className="mt-3"
      />
    )
  }

  return (
    <div className="pb-28 md:pb-8 animate-in fade-in duration-300">
      <InwardTable
        paginatedReceiptGroups={paginatedReceiptGroups}
        selectedGroupIds={selectedGroupIds}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        toggleSelectGroup={toggleSelectGroup}
        sortField={sortField}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        onSelectGroup={onSelectGroup}
        onStartEdit={(r, group) => onStartEdit(r, group?.receipts)}
        onPrintGroup={onPrintGroup}
        onDeleteGroup={onDeleteGroup}
        activeRowMenuKey={activeRowMenuKey}
        setActiveRowMenuKey={setActiveRowMenuKey}
        tableScrollRef={tableScrollRef}
        checkTableScroll={checkTableScroll}
        canScrollRight={canScrollRight}
        filteredTotalNet={filteredTotalNet}
        filteredTotalGross={filteredTotalGross}
        filteredTotalRola={filteredTotalRola}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={(val) => {
          if (typeof val === 'function') {
            setCurrentPage((val as (prev: number) => number)(currentPage))
          } else {
            setCurrentPage(val)
          }
        }}
        totalEntries={sortedReceiptGroups.length}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

      {selectedGroupIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-white text-slate-900 text-xs font-black w-6 h-6 rounded-full font-mono">
              {selectedGroupIds.size}
            </span>
            <span className="text-xs font-semibold tracking-wide">
              {selectedGroupIds.size === 1 ? 'Challan selected' : 'Challans selected'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBatchPrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print ({selectedGroupIds.size})</span>
            </button>

            <button
              type="button"
              onClick={onBatchExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onBatchDelete}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-white shadow-sm"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedGroupIds.size})</span>
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default InwardGrid
