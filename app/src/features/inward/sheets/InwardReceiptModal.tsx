import React from 'react'
import { AlertCircle } from 'lucide-react'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import { InModalScanBanner } from '@/features/scanner/InModalScanWidgets'
import { PartyCombobox } from '@/components/common/PartyCombobox'
import { InwardBagEntriesList } from '@/features/inward/components/InwardBagEntriesList'
import { InwardSettlementSummary } from '@/features/inward/components/InwardSettlementSummary'
import { InwardModalFooter } from '@/features/inward/components/InwardModalFooter'
import type { Party } from '@/features/parties/types'
import type { ReceiptWithParty } from '@/features/inward/types/inward.types'
import type { BagItem, InwardFormHeader } from '@/features/inward/hooks/useInwardForm'
import type { AttachedChallanPhoto } from '@/features/scanner/useInModalChallanScan'

interface InwardReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  editingId: string | null
  header: InwardFormHeader
  setHeader: (header: InwardFormHeader) => void
  parties: Party[]
  receipts: ReceiptWithParty[]
  duplicateChallan: ReceiptWithParty | null
  onPartyChange: (partyId: string) => void
  bags: BagItem[]
  bagCalculations: Array<{ grossKg: number; rola: number; perRola: number; tareKg: number; netKg: number }>
  totalGrossWeight: number
  calculatedTotalTare: number
  finalTotalTare: number
  finalNetKasab: number
  totalRolaPcs: number
  tareOverride: string
  setTareOverride: (val: string) => void
  notes: string
  setNotes: (val: string) => void
  addBag: () => void
  removeBag: (id: string) => void
  updateBag: (id: string, field: keyof BagItem, val: string | null) => void
  onSubmit: () => Promise<void>
  onDeleteChallan: () => Promise<void>
  saving: boolean
  errorMsg: string | null
  setErrorMsg: (msg: string | null) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isScanning: boolean
  scanningStatus: string
  attachedReceiptPhoto: AttachedChallanPhoto | null
  triggerScan: () => void
  setIsPhotoLightboxOpen: (val: boolean) => void
  setAttachedReceiptPhoto: (p: AttachedChallanPhoto | null) => void
  clearAttachedPhoto: () => void
}

export function InwardReceiptModal({
  isOpen,
  onClose,
  editingId,
  header,
  setHeader,
  parties,
  duplicateChallan,
  onPartyChange,
  bags,
  bagCalculations,
  totalGrossWeight,
  finalTotalTare,
  finalNetKasab,
  totalRolaPcs,
  tareOverride,
  setTareOverride,
  notes,
  setNotes,
  addBag,
  removeBag,
  updateBag,
  onSubmit,
  onDeleteChallan,
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
}: InwardReceiptModalProps) {
  const party = parties.find((p) => p.id === header.partyId)

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      category="INWARD"
      title={editingId ? 'Edit Inward Receipt' : 'New Inward Receipt'}
      subtitle="Log raw kasab intake & compute tare deductions"
      maxWidth="sm:max-w-4xl lg:max-w-5xl"
      bodyClassName="p-4 sm:p-5 space-y-4"
      footer={
        <InwardModalFooter
          onClose={onClose}
          onSubmit={onSubmit}
          saving={saving}
          partyId={header.partyId}
          challanNo={header.challanNo}
          totalGrossWeight={totalGrossWeight}
          editingId={editingId}
          finalNetKasab={finalNetKasab}
          bagsCount={bags.length}
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
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-800 font-bold hover:underline cursor-pointer text-xs"
          >
            Clear
          </button>
        </div>
      )}

      {/* Challan Form Metadata */}
      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3">
        <div className="sm:col-span-6">
          <PartyCombobox
            id="inward-party-combobox"
            value={header.partyId}
            onChange={onPartyChange}
            parties={parties}
            label="Party Name"
            required
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
            Ch. No. <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 504"
            value={header.challanNo}
            onChange={(e) => setHeader({ ...header, challanNo: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm font-mono font-semibold"
          />
          {duplicateChallan && (
            <p className="text-[11px] text-amber-600 mt-1 font-medium">
              Ch. #{duplicateChallan.challan_no} already recorded for {duplicateChallan.party?.name}.
            </p>
          )}
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={header.date}
            onChange={(e) => setHeader({ ...header, date: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm font-mono font-semibold"
          />
        </div>
      </div>

      {/* Responsive 2-Column: Left Bags, Right Settlement */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-5 items-start">
        <InwardBagEntriesList
          bags={bags}
          bagCalculations={bagCalculations}
          removeBag={removeBag}
          updateBag={updateBag}
          addBag={addBag}
        />

        <InwardSettlementSummary
          totalGrossWeight={totalGrossWeight}
          finalTotalTare={finalTotalTare}
          finalNetKasab={finalNetKasab}
          totalRolaPcs={totalRolaPcs}
          tareOverride={tareOverride}
          setTareOverride={setTareOverride}
          notes={notes}
          setNotes={setNotes}
          editingId={editingId}
          challanNo={header.challanNo}
          party={party}
          saving={saving}
          onDeleteChallan={onDeleteChallan}
        />
      </div>
    </BottomSheetModal>
  )
}

export default InwardReceiptModal
