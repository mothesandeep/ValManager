import { ActionSheet } from '@/components/feedback/ActionSheet'
import { ChallanDetailsModal } from '@/components/preview'
import ChallanScanReviewModal from '@/features/inward/sheets/InwardScannerSheet'
import ChallanPhotoLightbox from '@/components/common/FullscreenImageViewer'
import ChallanPrintModal from '@/features/outward/sheets/ChallanPrintModal'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import { fmtKg, fmtDate } from '@/utils/format'
import type { Party } from '@/features/parties/types'
import type { useInwardTransactions } from '../hooks/useInwardTransactions'
import type { useInwardFiltersAndList } from '../hooks/useInwardFiltersAndList'
import type { useInwardForm } from '../hooks/useInwardForm'
import type { ChallanGroup } from '@/features/outward/types'

interface InwardDialogsProps {
  transactions: ReturnType<typeof useInwardTransactions>
  list: ReturnType<typeof useInwardFiltersAndList>
  form: ReturnType<typeof useInwardForm>
  parties: Party[]
}

export function InwardDialogs({ transactions, list, form, parties }: InwardDialogsProps) {
  const selectedGroup = list.groupedReceipts.find((g) => g.id === transactions.selectedGroupId)
  const activeReceiptImage = list.modalChallanImage || selectedGroup?.imageUrl || null

  const adaptedSelectedGroup: ChallanGroup | null = selectedGroup
    ? ({
        key: selectedGroup.id,
        challanNo: selectedGroup.challan_no,
        partyName: selectedGroup.party_name,
        partyId: parties.find((p) => p.name === selectedGroup.party_name)?.id || '',
        date: selectedGroup.date,
        totalGross: selectedGroup.gross,
        totalNet: selectedGroup.net,
        totalValNet: selectedGroup.net,
        totalRolaGross: selectedGroup.tare,
        totalRolaCount: selectedGroup.rola,
        totalAmount: 0,
        hasVal: true,
        hasRola: false,
        imageUrl: selectedGroup.imageUrl || null,
        entries: selectedGroup.receipts.map((r) => ({
          id: r.id,
          created_at: (r as any).created_at || r.date,
          party_id: r.party_id,
          date: r.date,
          dispatch_type: 'Val' as const,
          challan_no: r.challan_no,
          bore_gross_weight: Number(r.gross_weight) || 0,
          net_val_weight: Number(r.net_weight) || 0,
          cord_count: 10,
          twist_type: ((r as any).twist_type as 'S' | 'Z' | 'S+Z' | null) || null,
          bungari_count: 0,
          amount: 0,
          rola_count: r.rola_count,
          notes: r.notes,
          party: r.party ? { name: r.party.name } : null,
        })),
      } as unknown as ChallanGroup)
    : null

  return (
    <>
      {adaptedSelectedGroup && (
        <ChallanDetailsModal
          isOpen={Boolean(transactions.selectedGroupId)}
          onClose={() => {
            transactions.setSelectedGroupId(null)
            clearModalHash()
          }}
          group={adaptedSelectedGroup}
          activeReceiptImage={activeReceiptImage}
          onPrint={() => {
            if (selectedGroup) {
              list.setSinglePrintGroup(list.mapGroupToPrintableItem(selectedGroup))
              list.setIsPrintModalOpen(true)
            }
          }}
          onEditChallan={() => {
            transactions.setSelectedGroupId(null)
            if (selectedGroup?.receipts[0]) form.startEdit(selectedGroup.receipts[0], selectedGroup.receipts)
          }}
          onDeleteChallan={() => {
            if (selectedGroup) transactions.setReceiptToDelete(selectedGroup)
          }}
          onPreviewImage={() => {
            if (activeReceiptImage) {
              list.setModalChallanImage(activeReceiptImage)
              list.setIsLightboxOpen(true)
            }
          }}
          onEditBag={(item) => {
            transactions.setSelectedGroupId(null)
            const r = selectedGroup?.receipts.find((rec) => rec.id === item.id)
            if (r) form.startEdit(r, selectedGroup?.receipts, r.id)
          }}
          onDeleteBag={(item) => {
            const r = selectedGroup?.receipts.find((rec) => rec.id === item.id)
            if (r) transactions.setBagToDelete(r)
          }}
        />
      )}

      <ActionSheet
        isOpen={Boolean(transactions.bagToDelete)}
        onClose={() => {
          transactions.setBagToDelete(null)
          clearModalHash()
        }}
        title="Delete Bag Entry"
        description={
          transactions.bagToDelete
            ? `Delete bag of ${fmtKg(transactions.bagToDelete.gross_weight)} gross weight?`
            : undefined
        }
        destructiveLabel="Delete Bag"
        cancelLabel="Cancel"
        onConfirmDestructive={async () => {
          if (!transactions.bagToDelete) return
          const item = transactions.bagToDelete
          transactions.setBagToDelete(null)
          clearModalHash()
          await transactions.handleDeleteBag(item)
        }}
      />

      <ActionSheet
        isOpen={Boolean(transactions.receiptToDelete)}
        onClose={() => {
          transactions.setReceiptToDelete(null)
          clearModalHash()
        }}
        title={`Delete Challan #${String(transactions.receiptToDelete?.challan_no || '—').replace(/^#/, '')}?`}
        description={
          transactions.receiptToDelete
            ? `Remove entire challan (${transactions.receiptToDelete.receipts.length} bags, ${fmtKg(transactions.receiptToDelete.net)} net kasab).`
            : undefined
        }
        destructiveLabel="Delete Entire Challan"
        cancelLabel="Cancel"
        onConfirmDestructive={async () => {
          if (!transactions.receiptToDelete) return
          const target = transactions.receiptToDelete
          transactions.setReceiptToDelete(null)
          clearModalHash()
          await transactions.handleDeleteReceipt(target)
        }}
      />

      <ActionSheet
        isOpen={transactions.showBulkDeleteConfirm}
        onClose={() => {
          transactions.setShowBulkDeleteConfirm(false)
          clearModalHash()
        }}
        title={`Delete ${transactions.selectedGroupKeys.size} Selected Challans?`}
        description={`Permanently remove the ${transactions.selectedGroupKeys.size} selected challans.`}
        destructiveLabel={`Delete ${transactions.selectedGroupKeys.size} Challans`}
        cancelLabel="Cancel"
        onConfirmDestructive={() =>
          transactions.handleBulkDeleteReceipts(
            list.sortedReceiptGroups.filter((g) => transactions.selectedGroupKeys.has(g.id))
          )
        }
      />

      <ActionSheet
        isOpen={form.showDiscardConfirm}
        onClose={() => form.setShowDiscardConfirm(false)}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes. Closing will discard them."
        destructiveLabel="Discard Changes"
        cancelLabel="Keep Editing"
        onConfirmDestructive={() => {
          form.setShowDiscardConfirm(false)
          form.closeForm()
        }}
      />

      <ChallanScanReviewModal
        type="INWARD"
        isOpen={form.isScanModalOpen}
        onClose={() => {
          form.setIsScanModalOpen(false)
          clearModalHash()
        }}
        onConfirmSave={form.handleScanConfirmSave}
        parties={parties}
      />

      <ChallanPhotoLightbox
        isOpen={list.isLightboxOpen && !!list.modalChallanImage}
        imageUrl={list.modalChallanImage}
        title={selectedGroup?.party_name ? `${selectedGroup.party_name} - Ch. #${selectedGroup.challan_no || '—'}` : 'Challan Photo'}
        subtitle={selectedGroup ? `Inward • ${fmtDate(selectedGroup.date)} • ${selectedGroup.bagsCount} bags` : undefined}
        onClose={() => {
          list.setIsLightboxOpen(false)
          clearModalHash()
        }}
      />

      {form.isPhotoLightboxOpen && form.attachedReceiptPhoto && (
        <ChallanPhotoLightbox
          isOpen={form.isPhotoLightboxOpen}
          imageUrl={form.attachedReceiptPhoto.previewUrl}
          title={`Challan #${form.header.challanNo || '—'}`}
          subtitle={form.header.date ? `Date: ${fmtDate(form.header.date)}` : 'Attached Challan Slip'}
          onClose={() => form.setIsPhotoLightboxOpen(false)}
        />
      )}

      <ChallanPrintModal
        isOpen={list.isPrintModalOpen}
        onClose={() => {
          list.setIsPrintModalOpen(false)
          list.setSinglePrintGroup(null)
          clearModalHash()
        }}
        title={list.singlePrintGroup ? 'Inward Goods Receipt' : 'Inward Receipts Register'}
        type="inward"
        items={
          list.singlePrintGroup
            ? [list.singlePrintGroup]
            : list.sortedReceiptGroups
                .filter((g) => transactions.selectedGroupKeys.size === 0 || transactions.selectedGroupKeys.has(g.id))
                .map(list.mapGroupToPrintableItem)
        }
        allMonthItems={list.groupedReceipts.map(list.mapGroupToPrintableItem)}
        defaultView={list.singlePrintGroup ? 'challan' : 'register'}
        billingPeriod={list.formattedMonth}
        selectedPartyName={list.selectedPartyId ? parties.find((p) => p.id === list.selectedPartyId)?.name : undefined}
        parties={parties}
      />
    </>
  )
}
export default InwardDialogs
