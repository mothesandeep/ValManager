import type { Receipt, Dispatch, GapchaSale, GapchaReconciliation, OverallGapchaStats } from '../types'

// ── Standard constants ────────────────────────────────────────────────────────
export const STANDARD_BUNGARI_WEIGHT_G = 70
export const STANDARD_ROLA_WEIGHT_G = 200

/**
 * Net weight for raw Kasab receiving using fixed assumed tare weight per rola.
 * Formula: grossKg - (rolaCount * perRolaGrams / 1000)
 */
export function calcReceiptNetWeight(
  grossKg: number,
  rolaCount: number,
  perRolaGrams: number = STANDARD_ROLA_WEIGHT_G
): number {
  const g = Number(grossKg) || 0
  const r = Number(rolaCount) || 0
  const tare = (r * (Number(perRolaGrams) || STANDARD_ROLA_WEIGHT_G)) / 1000
  return Math.max(0, g - tare)
}

/**
 * Net material weight returned to party on dispatch.
 * - For Val: bore_gross_weight - (bungari_count * 0.070 kg)
 * - For Kali: gross weight
 */
export function calcDispatchNetWeight(
  boreGrossKg: number,
  bungariCount: number = 0,
  bungariWeightG: number = STANDARD_BUNGARI_WEIGHT_G,
  dispatchType: string = 'Val'
): number {
  const gross = Number(boreGrossKg) || 0
  if (dispatchType === 'Kali' || dispatchType === 'Rola') {
    return gross
  }
  const bCount = Number(bungariCount) || 0
  const tare = (bCount * (Number(bungariWeightG) || STANDARD_BUNGARI_WEIGHT_G)) / 1000
  return Math.max(0, gross - tare)
}

/**
 * Gapcha (Sellable Surplus Weight) generated for a reconciled batch:
 * Formula: Reconciled Input Kasab Net - Reconciled Output (Val Net + Kali Net)
 */
export function calcBatchGapcha(
  inputKasabNet: number,
  outputValNet: number,
  outputKaliNet: number = 0
): number {
  const input = Number(inputKasabNet) || 0
  const output = (Number(outputValNet) || 0) + (Number(outputKaliNet) || 0)
  return Math.round(Math.max(0, input - output) * 1000) / 1000
}

/**
 * Remaining available Gapcha stock after deducting Gapcha sales.
 * Formula: Gapcha Generated - Gapcha Sold
 */
export function calcRemainingGapcha(
  gapchaGenerated: number,
  gapchaSold: number
): number {
  const gen = Number(gapchaGenerated) || 0
  const sold = Number(gapchaSold) || 0
  return Math.round(Math.max(0, gen - sold) * 1000) / 1000
}

/**
 * Calculate amount for a Gapcha sale.
 */
export function calcSaleAmount(
  weightKg: number,
  ratePerKg: number | null | undefined
): number | null {
  const wt = Number(weightKg) || 0
  const rate = Number(ratePerKg)
  if (isNaN(rate) || rate <= 0 || wt <= 0) return null
  return Math.round(wt * rate * 100) / 100
}

/**
 * Calculate overall Gapcha summary across all parties and sales.
 * Unprocessed receiving stock (Outstanding = Received - Returned) is strictly NOT counted as Gapcha.
 * If selectedMonth is passed (e.g. "2026-09"), only records for that month are aggregated.
 */
export function computeOverallGapchaStats(
  receipts: Receipt[],
  dispatches: Dispatch[],
  gapchaSales: GapchaSale[],
  reconciliations: GapchaReconciliation[] = [],
  selectedMonth?: string | null
): OverallGapchaStats {
  const filterByMonth = <T extends { date?: string | null }>(items: T[]): T[] => {
    if (!selectedMonth || selectedMonth === 'all') return items
    return items.filter((item) => item.date && item.date.startsWith(selectedMonth))
  }

  const mReceipts = filterByMonth(receipts)
  const mDispatches = filterByMonth(dispatches)
  const mSales = filterByMonth(gapchaSales)
  const mRecons = filterByMonth(reconciliations)

  const totalReceivedNetWeight = mReceipts.reduce(
    (sum, r) => sum + (Number(r.net_weight) || 0),
    0
  )

  const totalReturnedNetWeight = mDispatches.reduce((sum, d) => {
    const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
    const wt = isRola
      ? Number(d.bore_gross_weight) || 0
      : Number(d.net_val_weight) || 0
    return sum + wt
  }, 0)

  // Reconciled inputs & outputs (if any batch reconciliations exist)
  const reconciledInputWeight = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.input_kasab_weight) || 0),
    0
  )

  const reconciledOutputWeight = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.reconciled_output) || 0),
    0
  )

  // Outstanding raw yarn currently in workshop (Received - Returned)
  const unprocessedKasabWeight = Math.max(
    0,
    totalReceivedNetWeight - totalReturnedNetWeight
  )

  // Legitimate Gapcha created from fixed tare differences or surplus entries
  const totalGapchaGenerated = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
    0
  )

  const totalGapchaSold = mSales.reduce(
    (sum, s) => sum + (Number(s.weight_kg) || 0),
    0
  )

  const remainingGapchaWeight = Math.max(
    0,
    totalGapchaGenerated - totalGapchaSold
  )

  const totalGapchaRevenue = mSales.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  )

  const round3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000

  return {
    totalReceivedNetWeight: round3(totalReceivedNetWeight),
    unprocessedKasabWeight: round3(unprocessedKasabWeight),
    reconciledInputWeight: round3(reconciledInputWeight),
    reconciledOutputWeight: round3(reconciledOutputWeight),
    totalReturnedNetWeight: round3(totalReturnedNetWeight),
    totalGapchaGenerated: round3(totalGapchaGenerated),
    totalGapchaSold: round3(totalGapchaSold),
    remainingGapchaWeight: round3(remainingGapchaWeight),
    totalGapchaRevenue: Math.round(totalGapchaRevenue * 100) / 100,
  }
}
