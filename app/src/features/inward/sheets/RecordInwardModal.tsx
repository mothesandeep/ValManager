import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'

export interface RecordInwardModalProps extends BottomSheetModalProps {}

export interface InwardValidationInput {
  challan_no?: string | null
  party_id?: string | null
  gross_weight?: number | null
  tare_weight?: number | null
  bags?: Array<{ grossKg?: number; tareKg?: number; gross?: number | string; rola?: number | string }>
}

export interface InwardValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates inward challan data integrity & safeguards:
 * - Ensures challan_no and party_id are present and non-empty.
 * - Ensures gross weight strictly exceeds tare deduction.
 * - Ensures individual bags do not have tare >= gross.
 */
export function validateInwardChallanRecord(input: InwardValidationInput): InwardValidationResult {
  const errors: string[] = []

  const chNo = (input.challan_no || '').trim()
  if (!chNo) {
    errors.push('Challan number is strictly required.')
  }

  const partyId = (input.party_id || '').trim()
  if (!partyId) {
    errors.push('Party is strictly required.')
  }

  const gross = Number(input.gross_weight) || 0
  const tare = Number(input.tare_weight) || 0

  if (gross <= 0 && (!input.bags || input.bags.length === 0)) {
    errors.push('Gross weight must be greater than 0 kg.')
  }

  if (gross > 0 && tare >= gross) {
    errors.push(`Gross weight (${gross.toFixed(3)} kg) must strictly exceed Tare deduction (${tare.toFixed(3)} kg).`)
  }

  if (input.bags && input.bags.length > 0) {
    input.bags.forEach((b, idx) => {
      const bGross = Number(b.grossKg ?? b.gross) || 0
      const bTare = Number(b.tareKg) || 0
      if (bGross > 0 && bTare >= bGross) {
        errors.push(`Bag #${idx + 1}: Tare deduction (${bTare.toFixed(3)} kg) cannot equal or exceed gross weight (${bGross.toFixed(3)} kg).`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if a challan number already exists for the given party.
 */
export function checkDuplicateInwardChallan<T extends { id: string; challan_no?: string | null; party_id?: string | null; date?: string; party?: { name?: string } | null }>(
  challanNo: string,
  partyId: string,
  existingReceipts: T[],
  currentEditingId?: string | null
): T | null {
  const cleanNo = challanNo.trim().toLowerCase()
  if (!cleanNo || !partyId) return null
  return existingReceipts.find(
    (r) =>
      r.id !== currentEditingId &&
      r.party_id === partyId &&
      (r.challan_no || '').trim().toLowerCase() === cleanNo
  ) || null
}

export interface BagDiffResult<T> {
  toUpdate: T[]
  toInsert: T[]
  deletedIds: string[]
}

/**
 * Reconciles original bag IDs against currently saved bags during an edit operation:
 * - Bags present in originalBagIds are marked for UPDATE.
 * - Bags not present in originalBagIds are marked for INSERT.
 * - Original bag IDs missing from current items are marked for DELETE.
 */
export function computeBagDiff<T extends { bagId: string }>(
  originalBagIds: string[],
  currentItems: T[]
): BagDiffResult<T> {
  const currentIdSet = new Set(currentItems.map((item) => item.bagId))
  const toUpdate = currentItems.filter((item) => originalBagIds.includes(item.bagId))
  const toInsert = currentItems.filter((item) => !originalBagIds.includes(item.bagId))
  const deletedIds = originalBagIds.filter((id) => !currentIdSet.has(id))

  return {
    toUpdate,
    toInsert,
    deletedIds,
  }
}

/**
 * RecordInwardModal is the bottom-sheet modal wrapper for recording or editing inward receipts.
 */
export const RecordInwardModal: React.FC<RecordInwardModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default RecordInwardModal
