import { z } from 'zod'

export interface InwardBagInput {
  id: string
  gross: string
  rolaCount?: string
  perRolaGrams?: string
  rolaType?: 'NORM' | 'BIG' | 'NORMAL'
  sizeType?: 'Norm' | 'Big'
  twist?: 'S' | 'Z' | null
  twistType?: 'S' | 'Z' | null
  color?: string | null
}

export interface InwardBagCalculationResult {
  grossKg: number
  tareKg: number
  netKasabKg: number
  rolaCount: number
  perRolaGrams: number
  boriTareKg: number
  rolaTareKg: number
  isValid: boolean
}

export interface InwardChallanTotals {
  totalGrossKg: number
  totalTareKg: number
  totalNetKasabKg: number
  totalRolaCount: number
  bagCount: number
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const InwardBagZodSchema = z
  .object({
    id: z.string().min(1, 'Bag ID is required'),
    gross: z.string().trim().refine((val) => {
      const n = parseFloat(val)
      return !isNaN(n) && n > 0
    }, 'Gross weight must be greater than 0 kg'),
    rolaCount: z.string().trim().optional().refine((val) => {
      if (!val) return true
      const n = parseInt(val, 10)
      return !isNaN(n) && n >= 0 && Number.isInteger(Number(val))
    }, 'Rola count must be a non-negative whole number'),
    perRolaGrams: z.string().trim().optional().refine((val) => {
      if (!val) return true
      const n = parseFloat(val)
      return !isNaN(n) && n > 0
    }, 'Per rola grams must be greater than 0'),
    color: z.string().nullable().optional(),
    twist: z.enum(['S', 'Z']).nullable().optional(),
    twistType: z.enum(['S', 'Z']).nullable().optional(),
    sizeType: z.enum(['Norm', 'Big']).optional().default('Norm'),
    rolaType: z.enum(['NORM', 'BIG', 'NORMAL']).optional().default('NORM'),
  })
  .refine(
    (data) => {
      let grossKg = parseFloat(data.gross) || 0
      if (grossKg > 500) grossKg = grossKg / 1000
      const rola = parseInt(data.rolaCount || '0', 10) || 0
      const perRola = parseFloat(data.perRolaGrams || '200') || 200
      const boriKg = 0.1
      const tareKg = (rola * perRola) / 1000 + (grossKg > 0 ? boriKg : 0)
      return grossKg > tareKg
    },
    {
      message: 'Calculated tare exceeds gross weight',
      path: ['gross'],
    }
  )

export const InwardChallanZodSchema = z.object({
  partyId: z.string().trim().min(1, 'Please select a valid party'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  challanNo: z.string().trim().optional(),
  bags: z.array(InwardBagZodSchema).min(1, 'At least one bag is required'),
})

// ── Pure Calculation Functions ──────────────────────────────────────────────

/**
 * Calculates tare, net weight, and rola deduction for a single inward bag
 */
export function calculateInwardBag(
  bag: InwardBagInput,
  defaultPerRolaGrams = 200,
  boriWeightKg = 0.1
): InwardBagCalculationResult {
  let grossKg = parseFloat(bag.gross) || 0
  if (grossKg > 500) {
    grossKg = grossKg / 1000
  }

  const rolaCount = parseInt(bag.rolaCount || '0', 10) || 0
  const perRolaGrams = parseFloat(bag.perRolaGrams || String(defaultPerRolaGrams)) || defaultPerRolaGrams

  const rolaTareKg = (rolaCount * perRolaGrams) / 1000
  const boriTareKg = grossKg > 0 ? boriWeightKg : 0
  const tareKg = Math.round((rolaTareKg + boriTareKg) * 1000) / 1000
  const netKasabKg = Math.max(0, Math.round((grossKg - tareKg) * 1000) / 1000)

  return {
    grossKg,
    tareKg,
    netKasabKg,
    rolaCount,
    perRolaGrams,
    boriTareKg,
    rolaTareKg,
    isValid: grossKg > 0 && grossKg > tareKg,
  }
}

/**
 * Calculates aggregate totals across all inward bags
 */
export function calculateInwardChallanTotals(
  bags: InwardBagInput[],
  defaultPerRolaGrams = 200,
  boriWeightKg = 0.1
): InwardChallanTotals {
  let totalGrossKg = 0
  let totalTareKg = 0
  let totalNetKasabKg = 0
  let totalRolaCount = 0
  let bagCount = 0

  for (const bag of bags) {
    const calc = calculateInwardBag(bag, defaultPerRolaGrams, boriWeightKg)
    if (calc.grossKg > 0) {
      totalGrossKg += calc.grossKg
      totalTareKg += calc.tareKg
      totalNetKasabKg += calc.netKasabKg
      totalRolaCount += calc.rolaCount
      bagCount += 1
    }
  }

  return {
    totalGrossKg: Math.round(totalGrossKg * 1000) / 1000,
    totalTareKg: Math.round(totalTareKg * 1000) / 1000,
    totalNetKasabKg: Math.round(totalNetKasabKg * 1000) / 1000,
    totalRolaCount,
    bagCount,
  }
}

/**
 * Validates a single bag using Zod
 */
export function validateInwardBag(bag: InwardBagInput): { success: boolean; error?: string } {
  const result = InwardBagZodSchema.safeParse(bag)
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || 'Invalid bag data',
    }
  }
  return { success: true }
}

/**
 * Validates an entire inward challan using Zod
 */
export function validateInwardChallan(data: {
  partyId: string
  date: string
  challanNo?: string
  bags: InwardBagInput[]
}): { success: boolean; errors: string[] } {
  const result = InwardChallanZodSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((i) => i.message),
    }
  }
  return { success: true, errors: [] }
}

