import React from 'react'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowRight,
  Pencil,
  Trash2,
} from 'lucide-react'
import { TablePaginationFooter } from '@/components/common/TablePaginationFooter'
import { fmtDate } from '@/utils/date'
import { fmtKg } from '@/utils/format'
import type { InwardReceiptGroup, InwardSortField, ReceiptWithParty } from '@/features/inward/types'

export interface InwardTableProps {
  paginatedReceiptGroups: InwardReceiptGroup[]
  selectedGroupIds?: Set<string>
  isAllSelected?: boolean
  toggleSelectAll?: () => void
  toggleSelectGroup?: (id: string, e: React.MouseEvent) => void
  sortField: InwardSortField
  sortOrder: 'asc' | 'desc'
  toggleSort: (field: InwardSortField) => void
  onSelectGroup: (id: string) => void
  onStartEdit: (receipt: ReceiptWithParty, group?: InwardReceiptGroup) => void
  onPrintGroup?: (group: InwardReceiptGroup) => void
  onDeleteGroup?: (group: InwardReceiptGroup) => void
  activeRowMenuKey?: string | null
  setActiveRowMenuKey?: (key: string | null) => void
  tableScrollRef: React.RefObject<HTMLDivElement | null>
  checkTableScroll: () => void
  canScrollRight: boolean
  rowMenuRef?: React.RefObject<HTMLDivElement | null>
  filteredTotalNet: number
  filteredTotalGross: number
  filteredTotalRola: number
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  totalEntries: number
  pageSize: number
  setPageSize: (size: number) => void
}

export function InwardTable({
  paginatedReceiptGroups,
  sortField,
  sortOrder,
  toggleSort,
  onSelectGroup,
  onStartEdit,
  onDeleteGroup,
  tableScrollRef,
  checkTableScroll,
  canScrollRight,
  filteredTotalNet,
  filteredTotalGross,
  filteredTotalRola,
  totalPages,
  currentPage,
  setCurrentPage,
  totalEntries,
  pageSize,
  setPageSize,
  selectedGroupIds: _selectedGroupIds,
  isAllSelected: _isAllSelected,
  toggleSelectAll: _toggleSelectAll,
  toggleSelectGroup: _toggleSelectGroup,
  onPrintGroup: _onPrintGroup,
  activeRowMenuKey: _activeRowMenuKey,
  setActiveRowMenuKey: _setActiveRowMenuKey,
  rowMenuRef: _rowMenuRef,
}: InwardTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
      {/* Unified Enterprise Table - Horizontal Scroll Only */}
      <div className="relative w-full">
        <div
          ref={tableScrollRef}
          onScroll={checkTableScroll}
          className="w-full overflow-x-auto overscroll-x-contain scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
          tabIndex={0}
          role="region"
          aria-label="Inward Receipts Table"
        >
          <table className="w-full min-w-[650px] md:min-w-[760px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <tr className="select-none border-b border-slate-200 dark:border-slate-800">
                {/* 1. CH. # */}
                <th
                  onClick={() => toggleSort('challan_no')}
                  className="sticky left-0 top-0 z-30 bg-slate-50/95 dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] py-2.5 px-3 w-14 min-w-[54px] md:w-24 font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none select-none border-b border-slate-200 dark:border-slate-800 cursor-pointer whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>CH. #</span>
                    {sortField === 'challan_no' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 2. PARTY NAME */}
                <th
                  onClick={() => toggleSort('party_name')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[110px] max-w-[130px] md:max-w-[200px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-1">
                    <span>PARTY NAME</span>
                    {sortField === 'party_name' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 3. DATE */}
                <th
                  onClick={() => toggleSort('date')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 w-[82px] min-w-[78px] md:w-[105px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>DATE</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 4. NET KASAB */}
                <th
                  onClick={() => toggleSort('net')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 w-[76px] min-w-[70px] md:w-[95px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>NET KASAB</span>
                    {sortField === 'net' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 5. GROSS */}
                <th
                  onClick={() => toggleSort('gross')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[65px] md:min-w-[85px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>GROSS</span>
                    {sortField === 'gross' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 6. ROLA PCS */}
                <th
                  onClick={() => toggleSort('rola')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[65px] md:min-w-[90px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ROLA (PCS)</span>
                    {sortField === 'rola' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 7. BAGS */}
                <th
                  onClick={() => toggleSort('bagsCount')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[60px] md:min-w-[80px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>BAGS</span>
                    {sortField === 'bagsCount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 8. ACTIONS */}
                <th className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-3 border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-center w-20 min-w-[76px] md:w-28 md:min-w-[100px]">
                  <span>ACTIONS</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs md:text-sm">
              {paginatedReceiptGroups.map((group) => {
                return (
                  <tr
                    key={group.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/50 transition-colors cursor-pointer select-none group/tr"
                    onClick={() => onSelectGroup(group.id)}
                  >
                    {/* 1. CH. # */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover/tr:bg-slate-50 dark:group-hover/tr:bg-slate-800 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] w-14 min-w-[54px] md:w-24 px-2 md:px-3.5 py-1.5 md:py-2.5 font-mono text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 align-middle whitespace-nowrap">
                      {group.challan_no && group.challan_no !== '—' ? (
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm leading-none">
                          #{String(group.challan_no).replace(/^#/, '')}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs md:text-sm leading-none">
                          —
                        </span>
                      )}
                    </td>

                    {/* 2. PARTY NAME */}
                    <td className="max-w-[110px] md:max-w-[200px] px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 min-w-[110px] text-xs md:text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                      <span
                        className="font-medium text-xs md:text-sm text-slate-800 dark:text-slate-200 tracking-tight block truncate max-w-[110px] md:max-w-[200px] leading-tight group-hover/tr:text-slate-950 dark:group-hover/tr:text-white transition-colors"
                        title={group.party_name}
                      >
                        {group.party_name}
                      </span>
                    </td>

                    {/* 3. DATE */}
                    <td className="whitespace-nowrap px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 text-left align-middle font-mono tabular-nums text-slate-500 dark:text-slate-400 text-[11px] md:text-xs whitespace-nowrap w-[82px] min-w-[78px] md:w-[105px]">
                      {fmtDate(group.date)}
                    </td>

                    {/* 4. NET KASAB */}
                    <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle w-[76px] min-w-[70px] md:w-[95px]">
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-xs md:text-sm leading-none block">
                        {(Number(group.net) || 0).toFixed(3)}
                      </span>
                    </td>

                    {/* 5. GROSS */}
                    <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[65px] md:min-w-[85px]">
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-none block">
                        {fmtKg(group.gross)}
                      </span>
                    </td>

                    {/* 6. ROLA PCS */}
                    <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[65px] md:min-w-[90px]">
                      {group.rola > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10.5px] md:text-xs font-medium leading-tight bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 align-middle">
                          <span>{group.rola} pcs</span>
                          {group.hasBig && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/70 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1 py-0.5 rounded-xs leading-none">
                              BIG
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-mono select-none text-xs md:text-sm leading-none block">—</span>
                      )}
                    </td>

                    {/* 7. BAGS */}
                    <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[60px] md:min-w-[80px]">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10.5px] md:text-xs font-medium leading-tight bg-sky-50 md:bg-slate-100 dark:bg-sky-950/40 dark:md:bg-slate-800 text-sky-700 md:text-slate-600 dark:text-sky-300 dark:md:text-slate-300 border border-sky-200/60 dark:border-sky-800/60 md:border-transparent align-middle">
                        {group.bagsCount} {group.bagsCount === 1 ? 'bag' : 'bags'}
                      </span>
                    </td>

                    {/* 8. ACTIONS */}
                    <td
                      className="px-3 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-center align-middle w-20 min-w-[76px] md:w-28 md:min-w-[100px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1 md:gap-1.5 py-0 my-0 h-auto">
                        <button
                          type="button"
                          onClick={() => onSelectGroup(group.id)}
                          className="p-1 md:p-1.5 h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="View Challan"
                          aria-label="View Challan"
                        >
                          <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (group.receipts[0]) {
                              onStartEdit(group.receipts[0], group)
                            }
                          }}
                          className="p-1 md:p-1.5 h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Edit Challan"
                          aria-label="Edit Challan"
                        >
                          <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                        </button>
                        {onDeleteGroup && (
                          <button
                            type="button"
                            onClick={() => onDeleteGroup(group)}
                            className="p-1 md:p-1.5 h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Challan"
                            aria-label="Delete Challan"
                          >
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Subtle right-edge shadow / gradient fade to indicate horizontal scrollability on mobile */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-300/40 via-slate-100/20 to-transparent rounded-r-xl transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>

      {/* ── 1. Clean Inline Table Summary Footer Strip Directly Below Last Table Row ── */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 select-none">
        <div className="flex flex-nowrap items-center justify-start gap-2 overflow-x-auto whitespace-nowrap text-xs py-1.5 px-1">
          <span className="text-slate-500 dark:text-slate-400 font-normal">Net:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
            {filteredTotalNet.toFixed(3)} kg
          </span>

          <span className="text-slate-300 dark:text-slate-700 mx-0.5">•</span>

          <span className="text-slate-500 dark:text-slate-400 font-normal">Gross:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
            {filteredTotalGross.toFixed(3)} kg
          </span>

          <span className="text-slate-300 dark:text-slate-700 mx-0.5">•</span>

          <span className="text-slate-500 dark:text-slate-400 font-normal">Rola:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
            {filteredTotalRola.toLocaleString('en-IN')} pcs
          </span>
        </div>
      </div>

      {/* ── 2. Unified Pagination & Controls Row Directly Beneath Summary Strip ── */}
      <TablePaginationFooter
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}
