import { ActionSheet } from '@/components/feedback/ActionSheet'
import { ChallanDetailsModal } from '@/components/preview'
import ChallanScanReviewModal from '@/features/inward/sheets/InwardScannerSheet'
import ChallanPhotoLightbox from '@/components/common/FullscreenImageViewer'
import ChallanPrintModal from '@/features/outward/sheets/ChallanPrintModal'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import { fmtKg, fmtDate } from '@/utils/format'
import type { Party } from '@/features/parties/types'
import type { useOutwardTransactions } from '../hooks/useOutwardTransactions'
import type { useOutwardFiltersAndList } from '../hooks/useOutwardFiltersAndList'
import type { useOutwardForm } from '../hooks/useOutwardForm'

interface OutwardDialogsProps {
  transactions: ReturnType<typeof useOutwardTransactions>
  list: ReturnType<typeof useOutwardFiltersAndList>
  form: ReturnType<typeof useOutwardForm>
  parties: Party[]
}

export function OutwardDialogs({ transactions, list, form, parties }: OutwardDialogsProps) {
  const selectedGroup = list.challanGroups.find((g) => g.key === transactions.selectedGroupId)
  const activeReceiptImage = list.modalChallanImage || selectedGroup?.imageUrl || null

  return (
    <>
      {selectedGroup && (
        <ChallanDetailsModal
          isOpen={Boolean(transactions.selectedGroupId)}
          onClose={() => {
            transactions.setSelectedGroupId(null)
            clearModalHash()
          }}
          group={selectedGroup}
          activeReceiptImage={activeReceiptImage}
          onPrint={() => {
            list.setSinglePrintGroup(list.mapGroupToPrintableItem(selectedGroup))
            list.setIsPrintModalOpen(true)
          }}
          onEditChallan={() => {
            transactions.setSelectedGroupId(null)
            if (selectedGroup.entries[0]) form.startEdit(selectedGroup.entries[0], selectedGroup.entries)
          }}
          onDeleteChallan={() => transactions.setChallanToDelete(selectedGroup)}
          onPreviewImage={() => {
            if (activeReceiptImage) {
              list.setModalChallanImage(activeReceiptImage)
              list.setIsLightboxOpen(true)
            }
          }}
          onEditBag={(item) => {
            transactions.setSelectedGroupId(null)
            form.startEdit(item, selectedGroup.entries, item.id)
          }}
          onDeleteBag={(item) => transactions.setBagToDelete(item)}
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
            ? `Are you sure you want to delete this bag${transactions.bagToDelete.net_val_weight !== null ? ` of ${fmtKg(transactions.bagToDelete.net_val_weight)}` : ''}?`
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
        isOpen={Boolean(transactions.challanToDelete)}
        onClose={() => {
          transactions.setChallanToDelete(null)
          clearModalHash()
        }}
        title={`Delete Challan #${String(transactions.challanToDelete?.challanNo || '—').replace(/^#/, '')}?`}
        description={
          transactions.challanToDelete
            ? `This will remove the entire challan (${transactions.challanToDelete.entries.length} bags, ${fmtKg(transactions.challanToDelete.totalValNet)}).`
            : undefined
        }
        destructiveLabel="Delete Entire Challan"
        cancelLabel="Cancel"
        onConfirmDestructive={async () => {
          if (!transactions.challanToDelete) return
          const target = transactions.challanToDelete
          transactions.setChallanToDelete(null)
          clearModalHash()
          await transactions.handleDeleteChallan(target)
        }}
      />

      <ActionSheet
        isOpen={transactions.showBulkDeleteConfirm}
        onClose={() => {
          transactions.setShowBulkDeleteConfirm(false)
          clearModalHash()
        }}
        title={`Delete ${transactions.selectedGroupKeys.size} Selected Challans?`}
        description={`Permanently remove the ${transactions.selectedGroupKeys.size} selected challans and all bags.`}
        destructiveLabel={`Delete ${transactions.selectedGroupKeys.size} Challans`}
        cancelLabel="Cancel"
        onConfirmDestructive={() =>
          transactions.handleBulkDeleteChallans(
            list.sortedChallanGroups.filter((g) => transactions.selectedGroupKeys.has(g.key))
          )
        }
      />

      <ActionSheet
        isOpen={form.showDiscardConfirm}
        onClose={() => form.setShowDiscardConfirm(false)}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes to this challan. Closing now will discard them."
        destructiveLabel="Discard Changes"
        cancelLabel="Keep Editing"
        onConfirmDestructive={() => {
          form.setShowDiscardConfirm(false)
          form.closeForm()
        }}
      />

      <ChallanScanReviewModal
        type="OUTWARD"
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
        title={
          transactions.selectedGroupId
            ? (() => {
                const g = list.challanGroups.find((item) => item.key === transactions.selectedGroupId)
                return g?.partyName ? `${g.partyName} - Ch. #${g.challanNo || '—'}` : 'Challan Photo'
              })()
            : 'Challan Photo'
        }
        subtitle={
          transactions.selectedGroupId
            ? (() => {
                const g = list.challanGroups.find((item) => item.key === transactions.selectedGroupId)
                return g ? `Dispatch • ${fmtDate(g.date)} • ${g.entries.length} bags` : undefined
              })()
            : undefined
        }
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
        title={list.singlePrintGroup ? 'Outward Delivery Challan' : 'Outward Dispatch Register'}
        type="outward"
        items={
          list.singlePrintGroup
            ? [list.singlePrintGroup]
            : list.sortedChallanGroups
                .filter((g) => transactions.selectedGroupKeys.size === 0 || transactions.selectedGroupKeys.has(g.key))
                .map(list.mapGroupToPrintableItem)
        }
        allMonthItems={list.challanGroups.map(list.mapGroupToPrintableItem)}
        defaultView={list.singlePrintGroup ? 'challan' : list.printModalInitialView}
        billingPeriod={list.formattedMonth}
        selectedPartyName={
          list.selectedPartyId ? parties.find((p) => p.id === list.selectedPartyId)?.name : undefined
        }
        parties={parties}
      />
    </>
  )
}

