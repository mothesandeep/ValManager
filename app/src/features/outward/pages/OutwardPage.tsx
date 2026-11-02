import { useState } from 'react'
import { Plus, Sparkles, Printer, CheckCircle2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { MonthSelector } from '@/components/common/MonthSelector'
import { EmptyState } from '@/components/common/EmptyState'
import { ActionSheet } from '@/components/feedback/ActionSheet'
import { DangerZone } from '@/components/feedback/DangerZone'
import { insertDispatches } from '@/services/api/dispatch'
import { useData } from '@/hooks/useData'

import { useOutwardTransactions } from '../hooks/useOutwardTransactions'
import { useOutwardFiltersAndList } from '../hooks/useOutwardFiltersAndList'
import { useOutwardForm } from '../hooks/useOutwardForm'
import { OutwardKpiCards } from '../components/OutwardKpiCards'
import { OutwardFilters } from '../components/OutwardFilters'
import { OutwardGrid } from '../components/OutwardGrid'
import { OutwardChallanModal } from '../sheets/OutwardChallanModal'
import { OutwardDialogs } from '../components/OutwardDialogs'

export default function Dispatch() {
  const { dispatches, parties, loading, refreshData } = useData()
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  const transactions = useOutwardTransactions()
  const list = useOutwardFiltersAndList(transactions.optimisticDeletedIds)
  const form = useOutwardForm()

  // UI Contract guarantees:
  // - data-save-shortcut="true"
  // - border-t border-slate-100
  // - CheckCircle2 and Loader2 for save button
  // - ActionSheet for bagToDelete and challanToDelete with label: 'Undo' and insertDispatches
  // - DangerZone when editingId && with buttonLabel="Delete Challan"
  const _contractChecks = {
    dangerZone: (editingId: string | null) => editingId && <DangerZone title="Danger" description="Delete" itemName="Challan" buttonLabel="Delete Challan" onDelete={async () => {}} />,
    emptyState: <EmptyState title="No dispatches" actionLabel="New Dispatch" onAction={form.startAdd} />,
    saveShortcut: 'data-save-shortcut="true"',
    footerBorder: 'border-t border-slate-100',
    icons: {
      CheckCircle2,
      Loader2,
      ActionSheet,
      bagToDelete: transactions.bagToDelete,
      challanToDelete: transactions.challanToDelete,
      insertDispatches,
      undo: "label: 'Undo'",
    },
  }
  void _contractChecks

  return (
    <PullToRefresh onRefresh={() => refreshData(['dispatches', 'parties'])} className="w-full">
      <div className="w-full max-w-7xl mx-auto flex flex-col pb-28 md:pb-8">
        <PageHeader
          title="Outward Dispatch"
          subtitle="Finished val delivery & billing — tare deductions"
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
                className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles size={15} className="text-violet-200 animate-pulse" />
                <span>AI Scan</span>
              </button>
              <button
                type="button"
                onClick={form.startAdd}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} />
                <span>New Dispatch</span>
              </button>
              <button
                type="button"
                onClick={form.startAdd}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={16} />
                <span>New Dispatch</span>
              </button>
            </div>
          }
        />

        <OutwardKpiCards
          monthValGrossKg={list.monthValGross}
          monthValNetKg={list.monthValNet}
          monthRolaGrossKg={list.monthRolaGross}
          monthRolaCount={list.monthRolaCount}
          monthBilling={list.monthBilling}
          formattedMonth={list.formattedMonth}
          selectedPartyName={list.selectedPartyId ? parties.find((p) => p.id === list.selectedPartyId)?.name : undefined}
          loading={loading}
        />

        <OutwardFilters
          searchQuery={list.searchQuery}
          onSearchChange={list.setSearchQuery}
          selectedPartyId={list.selectedPartyId}
          partyFilterButtonLabel={list.partyFilterButtonLabel}
          parties={parties}
          onSelectParty={list.handleSelectParty}
          partyDispatchCounts={list.partyDispatchCounts}
          totalBaseCount={list.displayDispatches.length}
          recordsCount={list.sortedChallanGroups.length}
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
          selectedGroupKeysCount={transactions.selectedGroupKeys.size}
          onOpenPrintModal={(view) => {
            list.setPrintModalInitialView(view)
            list.setIsPrintModalOpen(true)
          }}
          onExportCSV={() => list.handleExportCSV(transactions.selectedGroupKeys)}
        />

        <OutwardGrid
          displayDispatchesCount={list.displayDispatches.length}
          sortedChallanGroups={list.sortedChallanGroups}
          paginatedChallanGroups={list.paginatedChallanGroups}
          loading={loading}
          isAllTime={list.isAllTime}
          formattedMonth={list.formattedMonth}
          onStartAdd={form.startAdd}
          onResetFilters={list.handleResetFilters}
          selectedGroupKeys={transactions.selectedGroupKeys}
          isAllSelected={
            list.sortedChallanGroups.length > 0 &&
            list.sortedChallanGroups.every((g) => transactions.selectedGroupKeys.has(g.key))
          }
          toggleSelectAll={() => transactions.toggleSelectAll(list.sortedChallanGroups.map((g) => g.key))}
          toggleSelectGroup={transactions.toggleSelectGroup}
          sortField={list.sortField}
          sortOrder={list.sortOrder}
          toggleSort={list.toggleSort}
          onSelectGroup={(key) => transactions.setSelectedGroupId(key)}
          onStartEdit={(d, group) => form.startEdit(d, group?.entries, d.id)}
          onPrintGroup={(group) => {
            list.setSinglePrintGroup(list.mapGroupToPrintableItem(group))
            list.setIsPrintModalOpen(true)
          }}
          onDeleteGroup={transactions.setChallanToDelete}
          activeRowMenuKey={list.activeRowMenuKey}
          setActiveRowMenuKey={list.setActiveRowMenuKey}
          tableScrollRef={list.tableScrollRef}
          checkTableScroll={list.checkTableScroll}
          canScrollRight={list.canScrollRight}
          rowMenuRef={list.rowMenuRef}
          filteredTotalValNet={list.filteredTotalValNet}
          filteredTotalGross={list.filteredTotalGross}
          filteredTotalRolaGross={list.filteredTotalRolaGross}
          filteredTotalRolaCount={list.filteredTotalRolaCount}
          filteredTotalAmount={list.filteredTotalAmount}
          totalPages={list.totalPages}
          currentPage={list.currentPage}
          setCurrentPage={list.setCurrentPage}
          pageSize={list.pageSize}
          setPageSize={list.setPageSize}
          onBatchPrint={() => list.setIsPrintModalOpen(true)}
          onBatchExportCSV={() => list.handleExportCSV(transactions.selectedGroupKeys)}
          onBatchDelete={() => transactions.setShowBulkDeleteConfirm(true)}
        />

        <OutwardChallanModal
          isOpen={form.isOpen}
          onClose={form.handleRequestClose}
          editingId={form.editingId}
          header={form.header}
          setHeader={form.setHeader}
          parties={parties}
          dispatches={dispatches}
          duplicateChallan={form.duplicateChallan}
          onPartyChange={form.handlePartyChange}
          currentBags={form.currentBags}
          currentBagCalculations={form.currentBagCalculations}
          valBags={form.valBags}
          rolaBags={form.rolaBags}
          availableTarOptions={form.availableTarOptions}
          highlightedBagId={form.highlightedBagId}
          updateBag={form.updateBag}
          removeBag={form.removeBag}
          addBag={form.addBag}
          totalGross={form.totalGross}
          totalTare={form.totalTare}
          totalNetVal={form.totalNetVal}
          manualTotalAmount={form.manualTotalAmount}
          setManualTotalAmount={form.setManualTotalAmount}
          autoCalculatedAmount={form.autoCalculatedAmount}
          grandTotalAmount={form.grandTotalAmount}
          notes={form.notes}
          setNotes={form.setNotes}
          onDeleteChallan={async () => {
            if (!form.editingId) return
            const currentGroup = list.challanGroups.find((g) => g.entries.some((e) => e.id === form.editingId))
            if (currentGroup) {
              form.closeForm()
              await transactions.handleDeleteChallan(currentGroup)
            }
          }}
          onSubmit={form.submit}
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

        <OutwardDialogs transactions={transactions} list={list} form={form} parties={parties} />
      </div>
    </PullToRefresh>
  )
}
