import { Search, Printer, Download, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { OutwardTable } from './OutwardTable'
import type { ChallanGroup, DispatchSortField, DispatchWithParty } from '@/features/outward/types'

interface OutwardGridProps {
  displayDispatchesCount: number
  sortedChallanGroups: ChallanGroup[]
  paginatedChallanGroups: ChallanGroup[]
  loading: boolean
  isAllTime: boolean
  formattedMonth: string
  onStartAdd: () => void
  onResetFilters: () => void
  selectedGroupKeys: Set<string>
  isAllSelected: boolean
  toggleSelectAll: () => void
  toggleSelectGroup: (key: string) => void
  sortField: DispatchSortField
  sortOrder: 'asc' | 'desc'
  toggleSort: (field: DispatchSortField) => void
  onSelectGroup: (key: string) => void
  onStartEdit: (d: DispatchWithParty, group?: ChallanGroup) => void
  onPrintGroup: (group: ChallanGroup) => void
  onDeleteGroup: (group: ChallanGroup) => void
  activeRowMenuKey: string | null
  setActiveRowMenuKey: (key: string | null) => void
  tableScrollRef: React.RefObject<HTMLDivElement | null>
  checkTableScroll: () => void
  canScrollRight: boolean
  rowMenuRef: React.RefObject<HTMLDivElement | null>
  filteredTotalValNet: number
  filteredTotalGross: number
  filteredTotalRolaGross: number
  filteredTotalRolaCount: number
  filteredTotalAmount: number
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  pageSize: number
  setPageSize: React.Dispatch<React.SetStateAction<number>>
  onBatchPrint: () => void
  onBatchExportCSV: () => void
  onBatchDelete: () => void
}

export function OutwardGrid({
  displayDispatchesCount,
  sortedChallanGroups,
  paginatedChallanGroups,
  loading,
  isAllTime,
  formattedMonth,
  onStartAdd,
  onResetFilters,
  selectedGroupKeys,
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
  rowMenuRef,
  filteredTotalValNet,
  filteredTotalGross,
  filteredTotalRolaGross,
  filteredTotalRolaCount,
  filteredTotalAmount,
  totalPages,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  onBatchPrint,
  onBatchExportCSV,
  onBatchDelete,
}: OutwardGridProps) {
  if (displayDispatchesCount === 0 && !loading) {
    return (
      <EmptyState
        title="No dispatch entries found"
        description={`No dispatch records logged for ${isAllTime ? 'All Time' : formattedMonth}.`}
        actionLabel="New Dispatch"
        onAction={onStartAdd}
      />
    )
  }

  if (sortedChallanGroups.length === 0 && !loading) {
    return (
      <EmptyState
        icon={Search}
        title="No matching dispatches found"
        description="Try adjusting your filters or search query."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
        className="mt-3"
      />
    )
  }

  return (
    <>
      <div className="pb-28 md:pb-8 animate-in fade-in duration-300">
        <OutwardTable
          paginatedChallanGroups={paginatedChallanGroups}
          selectedGroupKeys={selectedGroupKeys}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectGroup={toggleSelectGroup}
          sortField={sortField}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
          onSelectGroup={onSelectGroup}
          onStartEdit={onStartEdit}
          onPrintGroup={onPrintGroup}
          onDeleteGroup={onDeleteGroup}
          activeRowMenuKey={activeRowMenuKey}
          setActiveRowMenuKey={setActiveRowMenuKey}
          tableScrollRef={tableScrollRef}
          checkTableScroll={checkTableScroll}
          canScrollRight={canScrollRight}
          rowMenuRef={rowMenuRef}
          filteredTotalValNet={filteredTotalValNet}
          filteredTotalGross={filteredTotalGross}
          filteredTotalRolaGross={filteredTotalRolaGross}
          filteredTotalRolaCount={filteredTotalRolaCount}
          filteredTotalAmount={filteredTotalAmount}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalEntries={sortedChallanGroups.length}
          pageSize={pageSize}
          setPageSize={setPageSize}
        />
      </div>

      {/* Sticky Batch Actions Floating Toolbar */}
      {selectedGroupKeys.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-white text-slate-900 text-xs font-black w-6 h-6 rounded-full font-mono">
              {selectedGroupKeys.size}
            </span>
            <span className="text-xs font-semibold tracking-wide">
              {selectedGroupKeys.size === 1 ? 'Challan selected' : 'Challans selected'}
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
              <span>Print ({selectedGroupKeys.size})</span>
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
              <span>Delete Selected ({selectedGroupKeys.size})</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
