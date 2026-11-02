import { BUNGARI_WEIGHT_KG } from '@/constants'

export const STANDARD_ROLA_WEIGHT_G = 200
export const STANDARD_BORI_WEIGHT_G = 100
export const STANDARD_BUNGARI_WEIGHT_G = 70

/**
 * Calculates net weight for raw yarn inward receipt after deducting tare for rola and bori.
 */
export function calcReceiptNetWeight(
  grossKg: number,
  rolaCount: number,
  perRolaGrams: number = STANDARD_ROLA_WEIGHT_G,
  boriCount: number = 1,
  boriWeightG: number = STANDARD_BORI_WEIGHT_G
): number {
  const g = Number(grossKg) || 0
  const r = Number(rolaCount) || 0
  const b = Number(boriCount) || 0
  const rolaTareG = r * (Number(perRolaGrams) || STANDARD_ROLA_WEIGHT_G)
  const boriTareG = b * (Number(boriWeightG) || STANDARD_BORI_WEIGHT_G)
  const tare = (rolaTareG + boriTareG) / 1000
  return Math.max(0, g - tare)
}

/**
 * Checks if tare per rola exceeds party default threshold.
 */
export function isBigRola(tareWeightKg: number, rolaCount: number, partyDefaultRolaWeightG: number): boolean {
  if (rolaCount <= 0) return false
  const t = Number(tareWeightKg) || 0
  const twb = t >= BUNGARI_WEIGHT_KG ? t - BUNGARI_WEIGHT_KG : t
  const prg = Math.round((twb * 1000) / rolaCount)
  return prg > partyDefaultRolaWeightG + 15
}

/**
 * Calculates net val weight for finished dispatch after deducting tare for bungari.
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
 * Checks if dispatch entry is empty rola or kali return
 */
export function isRolaEntry(d?: { dispatch_type?: string | null } | null): boolean {
  if (!d) return false
  return d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
}

/**
 * Calculates billing amount from net weight and rate per kg.
 */
export function calcBillingAmount(netWeightKg: number, ratePerKg: number): number {
  const w = Number(netWeightKg) || 0
  const r = Number(ratePerKg) || 0
  return Math.round(w * r)
}

export interface BagSettlementInput {
  grossKg: number
  bungariCount?: number
  bungariWeightG?: number
  rolaCount?: number
  tar?: number
  rate?: number
  twistType?: string
  tareKg?: number
  netKg?: number
  amount?: number
}

export interface BagSettlementOutput {
  grossKg: number
  bungariCount: number
  bungariWeightG: number
  rolaCount: number
  tar: number
  rate: number
  twistType: string
  tareKg: number
  netKg: number | null
  amount: number | null
}

/**
 * Distributes tare, net weights, and billing amounts across bags in an outward challan dispatch.
 * Guarantees that:
 * 1. Tare deductions only deduct bungari tare (no bori bag tare for finished Val).
 * 2. If explicit total_tare_kg or total_net_val_kg exist, individual bags match them exactly.
 * 3. If grandTotalAmount (or slip amount) is provided, it is distributed proportionally across bags
 *    so sum(bag.amount) === grandTotalAmount to the exact rupee without discrepancy.
 */
export function distributeDispatchSettlement(options: {
  dispatchType: 'Val' | 'Rola' | string
  bags: BagSettlementInput[]
  defaultBungariWeightG?: number
  totalTareKg?: number
  totalNetValKg?: number
  grandTotalAmount?: number | null
}): BagSettlementOutput[] {
  const isVal = options.dispatchType === 'Val'
  const fallbackBungariWeight = options.defaultBungariWeightG ?? STANDARD_BUNGARI_WEIGHT_G

  const bagCalculations = options.bags.map((b) => {
    let grossKg = Number(b.grossKg) || 0
    if (grossKg > 500) grossKg = grossKg / 1000

    const bungariCount = Number(b.bungariCount) || 0
    const bungariWeightG = Number(b.bungariWeightG) > 0 ? Number(b.bungariWeightG) : fallbackBungariWeight
    const rolaCount = Number(b.rolaCount) || 0
    const tar = Number(b.tar) || 10
    const rate = Number(b.rate) || 0
    const twistType = b.twistType || 'S'

    // Finished Val dispatch only deducts bungari tare (no bori sack tare)
    const tareKg = b.tareKg !== undefined
      ? b.tareKg
      : isVal
        ? (bungariCount * bungariWeightG) / 1000
        : 0

    const netKg = b.netKg !== undefined
      ? b.netKg
      : isVal
        ? Math.max(0, Math.round((grossKg - tareKg) * 1000) / 1000)
        : null

    const unadjustedAmount = isVal && netKg !== null
      ? (b.amount !== undefined && b.amount > 0 ? b.amount : netKg * rate)
      : null

    return {
      grossKg,
      bungariCount,
      bungariWeightG,
      rolaCount,
      tar,
      rate,
      twistType,
      tareKg,
      netKg,
      unadjustedAmount,
    }
  })

  // 1. Consistent Bag-Level Tare Distribution
  if (isVal && options.totalTareKg !== undefined && options.totalTareKg > 0) {
    const sumCalculatedTare = bagCalculations.reduce((acc, c) => acc + c.tareKg, 0)
    const tareDiff = Math.round((options.totalTareKg - sumCalculatedTare) * 1000) / 1000
    if (tareDiff !== 0 && bagCalculations.length > 0) {
      const lastBag = bagCalculations[bagCalculations.length - 1]
      lastBag.tareKg = Math.max(0, Math.round((lastBag.tareKg + tareDiff) * 1000) / 1000)
      if (lastBag.netKg !== null) {
        lastBag.netKg = Math.max(0, Math.round((lastBag.grossKg - lastBag.tareKg) * 1000) / 1000)
      }
    }
  }

  // 2. Consistent Bag-Level Net Weight Distribution
  if (isVal && options.totalNetValKg !== undefined && options.totalNetValKg > 0) {
    const sumCalculatedNet = bagCalculations.reduce((acc, c) => acc + (c.netKg || 0), 0)
    const netDiff = Math.round((options.totalNetValKg - sumCalculatedNet) * 1000) / 1000
    if (netDiff !== 0 && bagCalculations.length > 0) {
      const lastBag = bagCalculations[bagCalculations.length - 1]
      if (lastBag.netKg !== null) {
        lastBag.netKg = Math.max(0, Math.round((lastBag.netKg + netDiff) * 1000) / 1000)
        // Reconcile tareKg so that grossKg - tareKg = netKg strictly holds true
        lastBag.tareKg = Math.max(0, Math.round((lastBag.grossKg - lastBag.netKg) * 1000) / 1000)
      }
    }
  }

  // 3. Proportionally distribute Grand Total Amount across bags
  const targetGrandTotal = options.grandTotalAmount != null && options.grandTotalAmount > 0
    ? Math.round(options.grandTotalAmount)
    : null

  const finalAmounts: (number | null)[] = bagCalculations.map((c) => {
    if (!isVal || c.netKg === null) return null
    return c.unadjustedAmount !== null ? Math.round(c.unadjustedAmount) : 0
  })

  if (targetGrandTotal !== null && isVal && bagCalculations.length > 0) {
    const sumUnadjusted = bagCalculations.reduce((acc, c) => acc + (c.unadjustedAmount || 0), 0)
    if (sumUnadjusted > 0) {
      let runningSum = 0
      for (let i = 0; i < bagCalculations.length; i++) {
        if (i === bagCalculations.length - 1) {
          finalAmounts[i] = Math.max(0, targetGrandTotal - runningSum)
        } else {
          const proportion = (bagCalculations[i].unadjustedAmount || 0) / sumUnadjusted
          const allocated = Math.round(targetGrandTotal * proportion)
          finalAmounts[i] = allocated
          runningSum += allocated
        }
      }
    } else {
      const share = Math.floor(targetGrandTotal / bagCalculations.length)
      let runningSum = 0
      for (let i = 0; i < bagCalculations.length; i++) {
        if (i === bagCalculations.length - 1) {
          finalAmounts[i] = Math.max(0, targetGrandTotal - runningSum)
        } else {
          finalAmounts[i] = share
          runningSum += share
        }
      }
    }
  }

  return bagCalculations.map((c, i) => ({
    grossKg: c.grossKg,
    bungariCount: c.bungariCount,
    bungariWeightG: c.bungariWeightG,
    rolaCount: c.rolaCount,
    tar: c.tar,
    rate: c.rate,
    twistType: c.twistType,
    tareKg: c.tareKg,
    netKg: c.netKg,
    amount: finalAmounts[i],
  }))
}
