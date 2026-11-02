import React, { Fragment } from 'react'
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
import { fmtKg, fmtMoney } from '@/utils/format'
import type { ChallanGroup, DispatchSortField, DispatchWithParty } from '@/features/outward/types'

export interface OutwardTableProps {
  paginatedChallanGroups: ChallanGroup[]
  selectedGroupKeys?: Set<string>
  isAllSelected?: boolean
  toggleSelectAll?: () => void
  toggleSelectGroup?: (key: string, e: React.MouseEvent) => void
  sortField: DispatchSortField
  sortOrder: 'asc' | 'desc'
  toggleSort: (field: DispatchSortField) => void
  onSelectGroup: (key: string) => void
  onStartEdit: (dispatch: DispatchWithParty, group?: ChallanGroup) => void
  onPrintGroup?: (group: ChallanGroup) => void
  onDeleteGroup?: (group: ChallanGroup) => void
  activeRowMenuKey?: string | null
  setActiveRowMenuKey?: (key: string | null) => void
  tableScrollRef: React.RefObject<HTMLDivElement | null>
  checkTableScroll: () => void
  canScrollRight: boolean
  rowMenuRef?: React.RefObject<HTMLDivElement | null>
  filteredTotalValNet: number
  filteredTotalGross: number
  filteredTotalRolaGross: number
  filteredTotalRolaCount: number
  filteredTotalAmount: number
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  totalEntries: number
  pageSize: number
  setPageSize: (size: number) => void
}

export function OutwardTable({
  paginatedChallanGroups,
  sortField,
  sortOrder,
  toggleSort,
  onSelectGroup,
  onStartEdit,
  onDeleteGroup,
  tableScrollRef,
  checkTableScroll,
  canScrollRight,
  filteredTotalValNet,
  filteredTotalGross: _filteredTotalGross,
  filteredTotalRolaGross,
  filteredTotalRolaCount,
  filteredTotalAmount,
  totalPages,
  currentPage,
  setCurrentPage,
  totalEntries,
  pageSize,
  setPageSize,
  selectedGroupKeys: _selectedGroupKeys,
  isAllSelected: _isAllSelected,
  toggleSelectAll: _toggleSelectAll,
  toggleSelectGroup: _toggleSelectGroup,
  onPrintGroup: _onPrintGroup,
  activeRowMenuKey: _activeRowMenuKey,
  setActiveRowMenuKey: _setActiveRowMenuKey,
  rowMenuRef: _rowMenuRef,
}: OutwardTableProps) {
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
          aria-label="Outward Dispatch Table"
        >
          <table className="w-full min-w-[650px] md:min-w-[760px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <tr className="select-none border-b border-slate-200 dark:border-slate-800">
                {/* 1. CH. # */}
                <th
                  onClick={() => toggleSort('challanNo')}
                  className="sticky left-0 top-0 z-30 bg-slate-50/95 dark:bg-slate-900 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] py-2.5 px-3 w-14 min-w-[54px] md:w-28 font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none select-none border-b border-slate-200 dark:border-slate-800 cursor-pointer whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>CH. #</span>
                    {sortField === 'challanNo' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 2. PARTY NAME */}
                <th
                  onClick={() => toggleSort('partyName')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[110px] max-w-[130px] md:max-w-[200px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-1">
                    <span>PARTY NAME</span>
                    {sortField === 'partyName' ? (
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

                {/* 4. NET VAL */}
                <th
                  onClick={() => toggleSort('totalValNet')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 w-[76px] min-w-[70px] md:w-[95px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>NET VAL</span>
                    {sortField === 'totalValNet' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 5. ROLA WT */}
                <th
                  onClick={() => toggleSort('totalRolaGross')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[65px] md:min-w-[85px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ROLA WT</span>
                    {sortField === 'totalRolaGross' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 6. ROLA RTN */}
                <th
                  onClick={() => toggleSort('totalRolaCount')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[65px] md:min-w-[90px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ROLA RTN</span>
                    {sortField === 'totalRolaCount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 7. AMOUNT */}
                <th
                  onClick={() => toggleSort('totalAmount')}
                  className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-2 md:px-3.5 min-w-[70px] md:min-w-[90px] border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>AMOUNT</span>
                    {sortField === 'totalAmount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" /> : <ArrowDown size={11} className="text-slate-900 dark:text-white md:w-3.5 md:h-3.5" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 dark:text-slate-500 md:w-3.5 md:h-3.5" />
                    )}
                  </div>
                </th>

                {/* 8. ACTIONS */}
                <th className="bg-slate-50 dark:bg-slate-900 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2 md:py-2.5 px-3 border-b border-slate-200 dark:border-slate-800 leading-none select-none whitespace-nowrap text-center w-20 min-w-[76px] md:w-28 md:min-w-[100px]">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs md:text-sm">
              {paginatedChallanGroups.map((group) => {
                return (
                  <Fragment key={group.key}>
                    <tr
                      className="border-b border-slate-100 dark:border-slate-800/60 even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 active:bg-blue-100/50 transition-colors cursor-pointer select-none group/tr"
                      onClick={() => onSelectGroup(group.key)}
                    >
                      {/* 1. CH. # */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover/tr:bg-slate-50 dark:group-hover/tr:bg-slate-800 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] w-14 min-w-[54px] md:w-28 px-2 md:px-3.5 py-1.5 md:py-2.5 font-mono text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {group.challanNo ? (
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm leading-none">
                              #{String(group.challanNo).replace(/^#/, '')}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-xs md:text-sm leading-none">
                              —
                            </span>
                          )}
                          {group.entries.length > 1 && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-mono leading-none">
                              {group.entries.length} bags
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. PARTY NAME */}
                      <td className="max-w-[110px] md:max-w-[200px] px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 min-w-[110px] text-xs md:text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                        <span
                          className="font-medium text-xs md:text-sm text-slate-800 dark:text-slate-200 tracking-tight block truncate max-w-[110px] md:max-w-[200px] leading-tight group-hover/tr:text-slate-950 dark:group-hover/tr:text-white transition-colors"
                          title={group.partyName}
                        >
                          {group.partyName}
                        </span>
                      </td>

                      {/* 3. DATE */}
                      <td className="whitespace-nowrap px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 text-left align-middle font-mono tabular-nums text-slate-500 dark:text-slate-400 text-[11px] md:text-xs whitespace-nowrap w-[82px] min-w-[78px] md:w-[105px]">
                        {fmtDate(group.date)}
                      </td>

                      {/* 4. NET VAL */}
                      <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle w-[76px] min-w-[70px] md:w-[95px]">
                        {group.hasVal && group.totalValNet > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-xs md:text-sm leading-none block">
                            {(Number(group.totalValNet) || 0).toFixed(3)}
                          </span>
                        ) : group.hasRola && group.totalRolaGross > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-xs md:text-sm leading-none block">
                            {(Number(group.totalRolaGross) || 0).toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono select-none text-xs md:text-sm leading-none block">—</span>
                        )}
                      </td>

                      {/* 5. ROLA WT */}
                      <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[65px] md:min-w-[85px]">
                        {group.hasRola && group.totalRolaGross > 0 ? (
                          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-none block">
                            {fmtKg(group.totalRolaGross)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono select-none text-xs md:text-sm leading-none block">—</span>
                        )}
                      </td>

                      {/* 6. ROLA RTN */}
                      <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[65px] md:min-w-[90px]">
                        {group.hasRola && group.totalRolaCount > 0 ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-medium tabular-nums text-xs md:text-sm leading-none block">
                            {group.totalRolaCount} pcs
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono select-none text-xs md:text-sm leading-none block">—</span>
                        )}
                      </td>

                      {/* 7. AMOUNT */}
                      <td className="px-2 md:px-3.5 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right align-middle min-w-[70px] md:min-w-[90px]">
                        {group.hasVal && group.totalAmount > 0 ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-xs md:text-sm leading-none block">
                            {fmtMoney(group.totalAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono select-none text-xs md:text-sm leading-none block">—</span>
                        )}
                      </td>

                      {/* 8. ACTIONS */}
                      <td
                        className="px-3 py-1.5 md:py-2.5 border-b border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-center align-middle w-20 min-w-[76px] md:w-28 md:min-w-[100px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1 md:gap-1.5 py-0 my-0 h-auto">
                          <button
                            type="button"
                            onClick={() => onSelectGroup(group.key)}
                            className="p-1 md:p-1.5 h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="View Challan"
                            aria-label="View Challan"
                          >
                            <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (group.entries[0]) {
                                onStartEdit(group.entries[0], group)
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
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Subtle right-edge shadow / gradient fade to indicate horizontal scrollability */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-300/40 via-slate-100/20 to-transparent rounded-r-xl transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>

      {/* ── 1. Clean Inline Table Summary Footer Strip Directly Below Last Table Row ── */}
      <div className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 select-none">
        <div className="flex flex-nowrap items-center justify-start gap-2 overflow-x-auto whitespace-nowrap text-xs py-1.5 px-1">
          <span className="text-slate-500 dark:text-slate-400 font-normal">Net:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
            {filteredTotalValNet.toFixed(3)} kg
          </span>

          <span className="text-slate-300 dark:text-slate-700 mx-0.5">•</span>

          <span className="text-slate-500 dark:text-slate-400 font-normal">Billing:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
            {fmtMoney(filteredTotalAmount)}
          </span>

          <span className="text-slate-300 dark:text-slate-700 mx-0.5">•</span>

          <span className="text-slate-500 dark:text-slate-400 font-normal">Rola:</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">
            {filteredTotalRolaCount.toLocaleString('en-IN')} pcs ({filteredTotalRolaGross.toFixed(3)} kg)
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
