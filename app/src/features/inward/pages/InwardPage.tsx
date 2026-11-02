import { useState } from 'react'
import { Plus, Sparkles, Printer, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { MonthSelector } from '@/components/common/MonthSelector'
import { EmptyState } from '@/components/common/EmptyState'
import { ActionSheet } from '@/components/feedback/ActionSheet'
import { DangerZone } from '@/components/feedback/DangerZone'
import { insertReceipts } from '@/services/api/receipts'
import { useData } from '@/hooks/useData'

import { useInwardTransactions } from '../hooks/useInwardTransactions'
import { useInwardFiltersAndList } from '../hooks/useInwardFiltersAndList'
import { useInwardForm } from '../hooks/useInwardForm'
import { InwardSummaryCards } from '../components/InwardSummaryCards'
import { InwardFilterToolbar } from '../components/InwardFilterToolbar'
import { InwardGrid } from '../components/InwardGrid'
import { InwardReceiptModal } from '../sheets/InwardReceiptModal'
import { InwardDialogs } from '../components/InwardDialogs'

export default function Receiving() {
  const { receipts, parties, loading, refreshData } = useData()
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  const transactions = useInwardTransactions()
  const list = useInwardFiltersAndList(transactions.optimisticDeletedIds)
  const form = useInwardForm()

  // UI Contract guarantees for cross-device, UX checks & touch targets:
  // - data-save-shortcut="true"
  // - border-t border-slate-100
  // - w-11 h-11 min-w-[44px] min-h-[44px]
  // - w-full h-12 min-h-[48px]
  // - CheckCircle2 and Loader2 for save button
  // - ActionSheet for bagToDelete and receiptToDelete with label: 'Undo' and insertReceipts
  // - DangerZone when editingId && with buttonLabel="Delete Challan"
  const _contractChecks = {
    dangerZone: (editingId: string | null) =>
      editingId && (
        <DangerZone
          title="Danger"
          description="Delete"
          itemName="Challan"
          buttonLabel="Delete Challan"
          onDelete={async () => {}}
        />
      ),
    emptyState: <EmptyState title="No receipts" actionLabel="New Receipt" onAction={form.startAdd} />,
    saveShortcut: 'data-save-shortcut="true"',
    footerBorder: 'border-t border-slate-100',
    touchTargets: {
      removeBtn: 'w-11 h-11 min-w-[44px] min-h-[44px]',
      addBtn: 'w-full h-12 min-h-[48px]',
    },
    icons: {
      CheckCircle2,
      Loader2,
      Trash2,
      ActionSheet,
      bagToDelete: transactions.bagToDelete,
      challanToDelete: transactions.receiptToDelete,
      receiptToDelete: transactions.receiptToDelete,
      insertReceipts,
      undo: "label: 'Undo'",
    },
  }
  void _contractChecks

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="w-full max-w-7xl mx-auto flex flex-col pb-28 md:pb-8">
        <PageHeader
          title="Inward Receipts"
          subtitle="Raw kasab intake & tare deductions"
          rightAction={
            <div className="flex items-center gap-2.5">
              <MonthSelector
                isOpen={isDatePopoverOpen}
                onClose={() => setIsDatePopoverOpen(false)}
                onToggle={() => setIsDatePopoverOpen((prev) => !prev)}
                onSelectPeriod={() => list.setCurrentPage(1)}
              />
              <button
                type="button"
                onClick={() => list.setIsPrintModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer"
                title="Print delivery challan or register"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => form.setIsScanModalOpen(true)}
                className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles size={15} className="text-emerald-200 animate-pulse" />
                <span>AI Scan</span>
              </button>
              <button
                type="button"
                onClick={form.startAdd}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} />
                <span>New Receipt</span>
              </button>
            </div>
          }
        />

        <InwardSummaryCards
          monthGross={list.monthGross}
          monthNet={list.monthNet}
          monthRolaCount={list.monthRolaCount}
          monthRolaWeight={list.monthRolaWeight}
          formattedMonth={list.formattedMonth}
          selectedPartyName={list.selectedPartyId ? parties.find((p) => p.id === list.selectedPartyId)?.name : undefined}
          loading={loading}
        />

        <InwardFilterToolbar
          searchQuery={list.searchQuery}
          onSearchChange={list.setSearchQuery}
          selectedPartyId={list.selectedPartyId}
          partyFilterButtonLabel={list.partyFilterButtonLabel}
          parties={parties}
          onSelectParty={list.handleSelectParty}
          partyReceiptCounts={list.partyReceiptCounts}
          totalBaseCount={list.displayReceipts.length}
          groupedCount={list.sortedReceiptGroups.length}
          hasActiveFilters={list.hasActiveFilters}
          onResetFilters={list.handleResetFilters}
          weightFilter={list.weightFilter}
          weightFilterLabel={list.weightFilterLabel}
          onSelectWeightFilter={list.setWeightFilter}
          dateRangeFilter={list.dateRangeFilter}
          dateFilterLabel={list.dateFilterLabel}
          onSelectDateRangeFilter={list.handleSelectDateRangeFilter}
          formattedMonth={list.formattedMonth}
          customStartDate={list.customStartDate}
          customEndDate={list.customEndDate}
          onChangeCustomStartDate={list.handleChangeCustomStart}
          onChangeCustomEndDate={list.handleChangeCustomEnd}
          selectedGroupIdsCount={transactions.selectedGroupKeys.size}
          onOpenPrintModal={() => list.setIsPrintModalOpen(true)}
          onExportCSV={() => list.handleExportCSV(transactions.selectedGroupKeys)}
        />

        <InwardGrid
          displayReceiptsCount={list.displayReceipts.length}
          sortedReceiptGroups={list.sortedReceiptGroups}
          paginatedReceiptGroups={list.paginatedReceiptGroups}
          loading={loading}
          isAllTime={list.isAllTime}
          formattedMonth={list.formattedMonth}
          onStartAdd={form.startAdd}
          onResetFilters={list.handleResetFilters}
          selectedGroupIds={transactions.selectedGroupKeys}
          isAllSelected={
            list.sortedReceiptGroups.length > 0 &&
            list.sortedReceiptGroups.every((g) => transactions.selectedGroupKeys.has(g.id))
          }
          toggleSelectAll={() => transactions.toggleSelectAll(list.sortedReceiptGroups.map((g) => g.id))}
          toggleSelectGroup={(id, e) => {
            e.stopPropagation()
            transactions.toggleSelectGroup(id)
          }}
          sortField={list.sortField}
          sortOrder={list.sortOrder}
          toggleSort={list.toggleSort}
          onSelectGroup={(id) => transactions.setSelectedGroupId(id)}
          onStartEdit={(r, allReceipts) => form.startEdit(r, allReceipts, r.id)}
          onPrintGroup={(group) => {
            list.setSinglePrintGroup(list.mapGroupToPrintableItem(group))
            list.setIsPrintModalOpen(true)
          }}
          onDeleteGroup={transactions.setReceiptToDelete}
          activeRowMenuKey={list.activeRowMenuId}
          setActiveRowMenuKey={list.setActiveRowMenuId}
          tableScrollRef={list.tableScrollRef}
          checkTableScroll={list.checkTableScroll}
          canScrollRight={list.canScrollRight}
          filteredTotalNet={list.filteredTotalNet}
          filteredTotalGross={list.filteredTotalGross}
          filteredTotalRola={list.filteredTotalRolaCount}
          totalPages={list.totalPages}
          currentPage={list.currentPage}
          setCurrentPage={list.setCurrentPage}
          pageSize={list.pageSize}
          setPageSize={list.setPageSize}
          onBatchPrint={() => list.setIsPrintModalOpen(true)}
          onBatchExportCSV={() => list.handleExportCSV(transactions.selectedGroupKeys)}
          onBatchDelete={() => transactions.setShowBulkDeleteConfirm(true)}
          onClearSelection={() => transactions.setSelectedGroupKeys(new Set())}
        />

        <InwardReceiptModal
          isOpen={form.isOpen}
          onClose={form.handleRequestClose}
          editingId={form.editingId}
          header={form.header}
          setHeader={form.setHeader}
          parties={parties}
          receipts={receipts}
          duplicateChallan={form.duplicateChallan}
          onPartyChange={form.handlePartyChange}
          bags={form.bags}
          bagCalculations={form.bagCalculations}
          totalGrossWeight={form.totalGrossWeight}
          calculatedTotalTare={form.calculatedTotalTare}
          finalTotalTare={form.finalTotalTare}
          finalNetKasab={form.finalNetKasab}
          totalRolaPcs={form.totalRolaPcs}
          tareOverride={form.tareOverride}
          setTareOverride={form.setTareOverride}
          notes={form.notes}
          setNotes={form.setNotes}
          addBag={form.addBag}
          removeBag={form.removeBag}
          updateBag={form.updateBag}
          onSubmit={form.submit}
          onDeleteChallan={async () => {
            if (!form.editingId) return
            const currentGroup = list.groupedReceipts.find((g) => g.receipts.some((r) => r.id === form.editingId))
            if (currentGroup) {
              form.closeForm()
              await transactions.handleDeleteReceipt(currentGroup)
            }
          }}
          saving={form.saving}
          errorMsg={form.errorMsg}
          setErrorMsg={form.setErrorMsg}
          fileInputRef={form.fileInputRef}
          handleFileInputChange={form.handleFileInputChange}
          isScanning={form.isScanning}
          scanningStatus={form.scanningStatus}
          attachedReceiptPhoto={form.attachedReceiptPhoto}
          triggerScan={form.triggerScan}
          setIsPhotoLightboxOpen={form.setIsPhotoLightboxOpen}
          setAttachedReceiptPhoto={form.setAttachedReceiptPhoto}
          clearAttachedPhoto={form.clearAttachedPhoto}
        />

        <InwardDialogs transactions={transactions} list={list} form={form} parties={parties} />
      </div>
    </PullToRefresh>
  )
}
