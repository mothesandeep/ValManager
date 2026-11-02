import React from 'react'
import { AlertCircle } from 'lucide-react'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import { InModalScanBanner } from '@/features/scanner/InModalScanWidgets'
import { OutwardChallanHeader } from '@/features/outward/components/OutwardChallanHeader'
import { DispatchEntriesList, type BagItem, type BagCalculation } from '@/features/outward/components/DispatchEntriesList'
import { OutwardSettlementSummary } from '@/features/outward/components/OutwardSettlementSummary'
import { OutwardModalFooter } from '@/features/outward/components/OutwardModalFooter'
import type { Party } from '@/features/parties/types'
import type { DispatchWithParty } from '@/features/outward/types'
import type { AttachedChallanPhoto } from '@/features/scanner/useInModalChallanScan'

export interface FormHeader {
  partyId: string
  date: string
  dispatchType: 'Val' | 'Rola'
  challanNo: string
}

interface OutwardChallanModalProps {
  isOpen: boolean
  onClose: () => void
  editingId: string | null
  header: FormHeader
  setHeader: (header: FormHeader) => void
  parties: Party[]
  dispatches: DispatchWithParty[]
  duplicateChallan: DispatchWithParty | null
  onPartyChange: (partyId: string) => void
  currentBags: BagItem[]
  currentBagCalculations: Array<BagCalculation & { rolaCount?: number }>
  valBags: BagItem[]
  rolaBags: BagItem[]
  availableTarOptions: number[]
  highlightedBagId: string | null
  updateBag: (idOrIndex: string | number, field: keyof BagItem, val: string) => void
  removeBag: (idOrIndex: string | number) => void
  addBag: () => void
  totalGross: number
  totalTare: number
  totalNetVal: number
  manualTotalAmount: string | null
  setManualTotalAmount: (val: string | null) => void
  autoCalculatedAmount: number
  grandTotalAmount: number
  notes: string
  setNotes: (val: string) => void
  onDeleteChallan: () => Promise<void>
  onSubmit: () => Promise<void>
  saving: boolean
  errorMsg: string | null
  setErrorMsg: (val: string | null) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isScanning: boolean
  scanningStatus: string
  attachedReceiptPhoto: AttachedChallanPhoto | null
  triggerScan: () => void
  setIsPhotoLightboxOpen: (val: boolean) => void
  setAttachedReceiptPhoto: (photo: AttachedChallanPhoto | null) => void
  clearAttachedPhoto: () => void
}

export function OutwardChallanModal({
  isOpen,
  onClose,
  editingId,
  header,
  setHeader,
  parties,
  dispatches,
  duplicateChallan,
  onPartyChange,
  currentBags,
  currentBagCalculations,
  valBags,
  rolaBags,
  availableTarOptions,
  highlightedBagId,
  updateBag,
  removeBag,
  addBag,
  totalGross,
  totalTare,
  totalNetVal,
  manualTotalAmount,
  setManualTotalAmount,
  autoCalculatedAmount,
  grandTotalAmount,
  notes,
  setNotes,
  onDeleteChallan,
  onSubmit,
  saving,
  errorMsg,
  setErrorMsg,
  fileInputRef,
  handleFileInputChange,
  isScanning,
  scanningStatus,
  attachedReceiptPhoto,
  triggerScan,
  setIsPhotoLightboxOpen,
  setAttachedReceiptPhoto,
  clearAttachedPhoto,
}: OutwardChallanModalProps) {
  const party = parties.find((p) => p.id === header.partyId)
  const validValBags = valBags.filter((b) => Number(b.gross) > 0)
  const validRolaBags = rolaBags.filter((b) => Number(b.gross) > 0 || Number(b.rolaCount) > 0)

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      category="OUTWARD"
      title={editingId ? 'Edit Outward Dispatch' : 'New Outward Dispatch'}
      subtitle="Generate delivery challan for finished val goods or empty rola returns"
      maxWidth="sm:max-w-4xl lg:max-w-5xl"
      bodyClassName="p-4 sm:p-5 space-y-4"
      footer={
        <OutwardModalFooter
          onClose={onClose}
          onSubmit={onSubmit}
          saving={saving}
          hasParty={Boolean(header.partyId)}
          hasChallanNo={Boolean(header.challanNo.trim())}
          hasValidBags={validValBags.length > 0 || validRolaBags.length > 0}
          editingId={editingId}
          dispatchType={header.dispatchType}
          totalNetVal={totalNetVal}
          totalGross={totalGross}
          currentBagsCount={currentBags.length}
          grandTotalAmount={grandTotalAmount}
        />
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <InModalScanBanner
        isScanning={isScanning}
        scanningStatus={scanningStatus}
        attachedPhoto={attachedReceiptPhoto}
        onScan={triggerScan}
        onViewPhoto={() => setIsPhotoLightboxOpen(true)}
        onRemovePhoto={() => {
          setAttachedReceiptPhoto(null)
          clearAttachedPhoto()
        }}
        isEditing={Boolean(editingId)}
      />

      {errorMsg && (
        <div className="rounded-xl p-3 text-xs font-semibold flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-800 font-bold hover:underline cursor-pointer text-xs">
            Clear
          </button>
        </div>
      )}

      <OutwardChallanHeader
        header={header}
        setHeader={setHeader}
        parties={parties}
        dispatches={dispatches}
        editingId={editingId}
        duplicateChallan={duplicateChallan}
        valBagsCount={valBags.length}
        rolaBagsCount={rolaBags.filter((b) => Number(b.gross) > 0 || Number(b.rolaCount) > 0).length || rolaBags.length}
        onPartyChange={onPartyChange}
      />

      <div className="lg:grid lg:grid-cols-12 lg:gap-5 items-start">
        <div className="lg:col-span-7 space-y-3">
          <DispatchEntriesList
            dispatchType={header.dispatchType}
            currentBagCalculations={currentBagCalculations}
            currentBags={currentBags}
            availableTarOptions={availableTarOptions}
            editingId={editingId}
            highlightedBagId={highlightedBagId}
            onUpdateBag={updateBag}
            onRemoveBag={removeBag}
            onAddBag={addBag}
          />
        </div>

        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-0 mt-3 lg:mt-0">
          <OutwardSettlementSummary
            dispatchType={header.dispatchType}
            currentBagsCount={currentBags.length}
            totalGross={totalGross}
            totalTare={totalTare}
            totalNetVal={totalNetVal}
            currentBagCalculations={currentBagCalculations}
            manualTotalAmount={manualTotalAmount}
            setManualTotalAmount={setManualTotalAmount}
            autoCalculatedAmount={autoCalculatedAmount}
            notes={notes}
            setNotes={setNotes}
            editingId={editingId}
            challanNo={header.challanNo}
            partyName={party?.name || ''}
            isSaving={saving}
            onDeleteChallan={onDeleteChallan}
          />
        </div>
      </div>
    </BottomSheetModal>
  )
}
export default OutwardChallanModal
