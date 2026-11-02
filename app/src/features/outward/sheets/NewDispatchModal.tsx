import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'
import { sanitizeQualityTarLabel } from '@/services/aiScanner'

export interface NewDispatchModalProps extends BottomSheetModalProps {}

export interface EmptyRolaBagItem {
  gross: number
  rola: number
}

export interface OutwardValidationInput {
  challan_no?: string | null
  party_id?: string | null
  val_bags?: Array<{ gross?: number | string; tareKg?: number; grossKg?: number }>
  rola_bags?: Array<{ gross?: number | string; rolaCount?: number | string; grossKg?: number; rola?: number | string }>
}

export interface OutwardValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates outward dispatch challan data integrity & safeguards:
 * - Ensures challan_no and party_id are present and non-empty.
 * - Allows saving if either Val bags > 0 OR Empty rola bags > 0 (supports pure empty rola returns).
 * - Ensures individual Val bags do not have tare >= gross.
 */
export function validateOutwardChallanRecord(input: OutwardValidationInput): OutwardValidationResult {
  const errors: string[] = []

  const chNo = (input.challan_no || '').trim()
  if (!chNo) {
    errors.push('Challan number is strictly required.')
  }

  const partyId = (input.party_id || '').trim()
  if (!partyId) {
    errors.push('Party is strictly required.')
  }

  const valCount = (input.val_bags || []).filter((b) => (Number(b.grossKg ?? b.gross) || 0) > 0).length
  const rolaCount = (input.rola_bags || []).filter(
    (b) => (Number(b.grossKg ?? b.gross) || 0) > 0 || (Number(b.rolaCount ?? b.rola) || 0) > 0
  ).length

  if (valCount === 0 && rolaCount === 0) {
    errors.push('At least one Val bag or Empty Rola entry is required.')
  }

  if (input.val_bags && input.val_bags.length > 0) {
    input.val_bags.forEach((b, idx) => {
      const gross = Number(b.grossKg ?? b.gross) || 0
      const tare = Number(b.tareKg) || 0
      if (gross > 0 && tare >= gross) {
        errors.push(`Val Bag #${idx + 1}: Tare deduction (${tare.toFixed(3)} kg) cannot equal or exceed gross weight (${gross.toFixed(3)} kg).`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if a dispatch challan number already exists for the given party.
 */
export function checkDuplicateOutwardChallan<T extends { id: string; challan_no?: string | null; party_id?: string | null; date?: string; party?: { name?: string } | null }>(
  challanNo: string,
  partyId: string,
  existingDispatches: T[],
  currentEditingId?: string | null
): T | null {
  const cleanNo = challanNo.trim().toLowerCase()
  if (!cleanNo || !partyId) return null
  return existingDispatches.find(
    (d) =>
      d.id !== currentEditingId &&
      d.party_id === partyId &&
      (d.challan_no || '').trim().toLowerCase() === cleanNo
  ) || null
}

/**
 * Maps parsed empty rola bags from AI Challan Scanner response.
 * Returns mapped empty rola items or empty array if none present.
 */
export function mapEmptyRolaBags(data: {
  empty_rola_bags?: Array<{
    gross?: number | string
    gross_kg?: number | string
    weight_kg?: number | string
    weight?: number | string
    rola?: number | string
    rola_count?: number | string
    quantity?: number | string
    pcs?: number | string
    is_total?: boolean
    description?: string
  }>
}): EmptyRolaBagItem[] {
  if (data?.empty_rola_bags && data.empty_rola_bags.length > 0) {
    const list = data.empty_rola_bags
      .filter((r) => !r.is_total && !String(r.description || '').toLowerCase().includes('total'))
      .map((r) => ({
        gross: Number(r.gross ?? r.gross_kg ?? r.weight_kg ?? r.weight) || 0,
        rola: Number(r.rola ?? r.rola_count ?? r.quantity ?? r.pcs) || 0,
      }))
      .filter((r) => r.gross > 0 || r.rola > 0)

    if (list.length > 1) {
      const last = list[list.length - 1]
      const prevGross = list.slice(0, -1).reduce((s, x) => s + x.gross, 0)
      const prevRola = list.slice(0, -1).reduce((s, x) => s + x.rola, 0)
      if (
        (Math.abs(last.gross - prevGross) < 0.05 && prevGross > 0) ||
        (last.rola === prevRola && prevRola > 0)
      ) {
        return list.slice(0, -1)
      }
    }
    return list
  }
  return []
}

export { sanitizeQualityTarLabel }
export { computeBagDiff, type BagDiffResult } from '@/features/inward/sheets/RecordInwardModal'

/**
 * NewDispatchModal is the bottom-sheet modal wrapper for recording or editing outward dispatch.
 */
export const NewDispatchModal: React.FC<NewDispatchModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default NewDispatchModal
