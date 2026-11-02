import ChallanScanReviewModal, {
  type ChallanFormData,
  type OutwardFormData,
  type OutwardReviewBag,
  type InwardReviewBag,
} from '@/features/inward/sheets/InwardScannerSheet'

export { mapEmptyRolaBags, type EmptyRolaBagItem } from '@/features/outward/sheets/NewDispatchModal'
export type { ChallanFormData, OutwardFormData, OutwardReviewBag, InwardReviewBag }

/**
 * AIChallanScanner component for scanning inward receipts and outward delivery challans.
 */
export const AIChallanScanner = ChallanScanReviewModal
export default AIChallanScanner

