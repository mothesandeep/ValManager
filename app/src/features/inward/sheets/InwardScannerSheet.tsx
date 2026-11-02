import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import { ActionConfirmSheet } from '@/components/feedback/ActionConfirmSheet'
import { ScannerPreview } from '@/features/inward/components/ScannerPreview'
import { ChallanHeader } from '@/features/inward/components/ChallanHeader'
import { ItemizedBagTable } from '@/features/inward/components/ItemizedBagTable'
import { ScannerActionFooter } from '@/features/inward/components/scanner/ScannerActionFooter'
import { useScannerReviewForm } from '@/features/inward/hooks/useScannerReviewForm'
import type { Party } from '@/features/parties/types'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import type {
  InwardReviewBag,
  InwardFormData,
  OutwardReviewBag,
  OutwardFormData,
  ChallanFormData,
} from '@/features/inward/types/inward.types'

export type {
  InwardReviewBag,
  InwardFormData,
  OutwardReviewBag,
  OutwardFormData,
  ChallanFormData,
}

interface ChallanScanReviewModalProps {
  type: 'INWARD' | 'OUTWARD'
  isOpen: boolean
  onClose: () => void
  onConfirmSave: (data: ChallanFormData) => Promise<void>
  parties?: Party[]
}

export default function ChallanScanReviewModal(props: ChallanScanReviewModalProps) {
  const form = useScannerReviewForm(props)

  return (
    <BottomSheetModal
      isOpen={props.isOpen}
      onClose={form.handleRequestClose}
      category="INWARD"
      title={props.type === 'INWARD' ? 'Scan & Review Inward Slip' : 'Scan & Review Outward Challan'}
      subtitle="AI-assisted challan transcription with interactive document pan & zoom"
      maxWidth="sm:max-w-4xl lg:max-w-6xl"
      bodyClassName="p-0 flex flex-col h-[85vh] max-h-[85vh] overflow-hidden"
    >
      <input
        ref={form.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void form.handleFileSelected(file)
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-28 lg:pb-0 no-scrollbar lg:grid lg:grid-cols-12 lg:overflow-hidden lg:p-0 bg-white dark:bg-slate-900">
        <div className="lg:col-span-6 h-72 sm:h-80 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-950">
          <ScannerPreview
            capturedPhoto={form.capturedPhoto}
            isPdfFile={form.isPdfFile}
            scale={form.scale}
            isDragging={form.isDragging}
            position={form.position}
            setContainerRef={form.setContainerRef}
            handleSyntheticWheel={form.handleSyntheticWheel}
            handleMouseDown={form.handleMouseDown}
            handleTouchStart={form.handleTouchStart}
            handleTouchMove={form.handleTouchMove}
            handleTouchEnd={form.handleTouchEnd}
            handleResetZoom={form.handleResetZoom}
            handleZoomIn={form.handleZoomIn}
            handleZoomOut={form.handleZoomOut}
            onOpenFileBrowser={form.handleOpenFileBrowser}
            onCaptureCamera={form.handleSnapPhoto}
            isFileDragging={form.isFileDragging}
            isCapturing={form.isProcessingPhoto}
            isProcessingPhoto={form.isProcessingPhoto}
            isScanning={form.isScanning}
          />
        </div>

        <div className="lg:col-span-6 flex flex-col bg-white dark:bg-slate-900 min-h-0 lg:h-full lg:overflow-y-auto no-scrollbar p-0 pt-3 lg:p-4 pb-28 lg:pb-8 space-y-3.5">
          <form onSubmit={form.handleSave} className="w-full space-y-3.5">
            {form.isRestoredFromDraft && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                <Sparkles size={14} className="text-amber-600" />
                <span>Restored from auto-saved draft</span>
              </div>
            )}

            {form.scanSuccessMsg && !form.isScanning && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{form.scanSuccessMsg}</span>
              </div>
            )}

            {form.scanError && !form.isScanning && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs">
                <AlertCircle size={14} className="text-rose-600" />
                <span>{form.scanError}</span>
              </div>
            )}

            <ChallanHeader
              type={props.type}
              outwardDispatchType={form.outwardDispatchType}
              setOutwardDispatchType={form.setOutwardDispatchType}
              valBagsCount={form.outwardValBags.length}
              rolaBagsCount={form.outwardRolaBags.length}
              parties={form.parties}
              partySearch={form.partySearch}
              setPartySearch={form.setPartySearch}
              selectedPartyId={form.selectedPartyId}
              setSelectedPartyId={form.setSelectedPartyId}
              setSelectedPartyName={form.setSelectedPartyName}
              showPartyDropdown={form.showPartyDropdown}
              setShowPartyDropdown={form.setShowPartyDropdown}
              filteredParties={form.filteredParties}
              handlePartySelect={form.handlePartySelect}
              challanNo={form.challanNo}
              setChallanNo={form.setChallanNo}
              challanInputRef={form.challanInputRef}
              date={form.date}
              setDate={form.setDate}
              scanError={form.scanError}
              setScanError={form.setScanError}
              duplicateChallanInfo={form.duplicateChallanInfo}
            />

            {props.type === 'INWARD' && (
              <ItemizedBagTable
                inwardBagCalculations={form.inwardBagCalculations}
                inwardBagsCount={form.inwardBags.length}
                inwardTotals={form.inwardTotals}
                tareOverride={form.tareOverride}
                setTareOverride={form.setTareOverride}
                onUpdateBag={form.updateInwardBag}
                onRemoveBag={form.removeInwardBag}
                onAddBag={form.addInwardBag}
                onSizeTypeChange={form.handleInwardBagSizeTypeChange}
              />
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="Additional specifications or notes..."
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          </form>
        </div>
      </div>

      <ScannerActionFooter
        onClose={form.handleRequestClose}
        onSave={() => void form.handleSave()}
        isSaving={form.isSaving}
        isSaveDisabled={!form.challanNo.trim() || !form.selectedPartyId}
        saveLabel={`Save ${props.type === 'INWARD' ? 'Inward' : 'Outward'}`}
      />

      <ActionConfirmSheet
        isOpen={form.showDiscardConfirm}
        onClose={() => form.setShowDiscardConfirm(false)}
        title="Discard Scanned Slip?"
        description="You have unsaved scanned data. Closing will discard your progress."
        destructiveLabel="Discard"
        cancelLabel="Continue Review"
        onConfirmDestructive={() => {
          form.setShowDiscardConfirm(false)
          props.onClose()
        }}
      />
    </BottomSheetModal>
  )
}
