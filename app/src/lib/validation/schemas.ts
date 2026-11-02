import { z } from 'zod'

/**
 * Extracts flattened, field-keyed error messages from a ZodError.
 * e.g. { "partyId": "Please select a party", "bags.0.gross": "Gross weight must be > 0" }
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!result[key]) {
      result[key] = issue.message
    }
  }
  return result
}

// ── Inward Receipts Validation ────────────────────────────────────────────────

export const InwardBagItemSchema = z
  .object({
    id: z.string(),
    gross: z.string().trim().refine((val) => {
      const n = parseFloat(val)
      return !isNaN(n) && n > 0
    }, 'Gross weight must be greater than 0 kg'),
    rolaCount: z.string().trim().refine((val) => {
      if (!val) return true
      const n = parseInt(val, 10)
      return !isNaN(n) && n >= 0 && Number.isInteger(Number(val))
    }, 'Rola count must be a non-negative whole number'),
    perRolaGrams: z.string().trim().refine((val) => {
      const n = parseFloat(val)
      return !isNaN(n) && n > 0
    }, 'Per rola grams must be greater than 0'),
    color: z.string().nullable().optional(),
    twistType: z.enum(['S', 'Z']).nullable().optional(),
    twist: z.enum(['S', 'Z']).nullable().optional(),
    sizeType: z.enum(['Norm', 'Big']).default('Norm'),
  })
  .refine((data) => {
    let grossKg = parseFloat(data.gross) || 0
    if (grossKg > 500) grossKg = grossKg / 1000
    const rola = parseInt(data.rolaCount || '0', 10) || 0
    const perRola = parseFloat(data.perRolaGrams) || 200
    const boriKg = 0.1
    const tareKg = ((rola * perRola) / 1000) + (grossKg > 0 ? boriKg : 0)
    return grossKg > tareKg
  }, {
    message: 'Calculated tare exceeds gross weight',
    path: ['gross'],
  })

export const InwardReceiptFormSchema = z.object({
  partyId: z.string().trim().min(1, 'Please select a valid party'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  challanNo: z.string().trim().optional(),
  bags: z.array(InwardBagItemSchema).min(1, 'At least one bag is required'),
})

// ── Outward Dispatch Validation ──────────────────────────────────────────────

export const OutwardValBagItemSchema = z
  .object({
    id: z.string(),
    gross: z.string().trim().refine((val) => {
      const n = parseFloat(val)
      return !isNaN(n) && n > 0
    }, 'Gross weight must be greater than 0 kg'),
    bungariCount: z.string().trim().refine((val) => {
      if (!val) return true
      const n = parseInt(val, 10)
      return !isNaN(n) && n >= 0 && Number.isInteger(Number(val))
    }, 'Bungari count must be a non-negative whole number'),
    tar: z.string().trim().min(1, 'Select or enter tar count'),
    twistType: z.enum(['S', 'Z', 'S+Z']).default('S'),
  })
  .refine((data) => {
    let grossKg = parseFloat(data.gross) || 0
    if (grossKg > 500) grossKg = grossKg / 1000
    const bungari = parseInt(data.bungariCount || '0', 10) || 0
    const tareKg = (bungari * 70) / 1000
    return grossKg > tareKg
  }, {
    message: 'Tare exceeds gross weight',
    path: ['gross'],
  })

export const OutwardRolaBagItemSchema = z.object({
  id: z.string(),
  gross: z.string().trim().refine((val) => {
    if (!val) return true
    const n = parseFloat(val)
    return !isNaN(n) && n >= 0
  }, 'Gross weight cannot be negative'),
  rolaCount: z.string().trim().refine((val) => {
    if (!val) return true
    const n = parseInt(val, 10)
    return !isNaN(n) && n >= 0 && Number.isInteger(Number(val))
  }, 'Rola count must be a non-negative whole number'),
}).refine((data) => {
  const g = parseFloat(data.gross || '0') || 0
  const r = parseInt(data.rolaCount || '0', 10) || 0
  return g > 0 || r > 0
}, {
  message: 'Enter weight or rola count',
  path: ['gross'],
})

export const OutwardDispatchFormSchema = z.object({
  partyId: z.string().trim().min(1, 'Please select a party'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  dispatchType: z.enum(['Val', 'Rola']),
  challanNo: z.string().trim().optional(),
})

// ── Billing & Payments Validation ────────────────────────────────────────────

export const PaymentFormSchema = z.object({
  partyId: z.string().trim().min(1, 'Please select a party'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  amount: z.string().trim().refine((val) => {
    const n = parseFloat(val)
    return !isNaN(n) && n > 0
  }, 'Payment amount must be greater than ₹0'),
  mode: z.enum(['Cash', 'UPI / Online', 'Cheque']),
  reference: z.string().trim().optional(),
})

// ── Operating Expenses Validation ────────────────────────────────────────────

export const ExpenseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) is required'),
  category: z.string().trim().min(1, 'Please select an expense category'),
  amount: z.string().trim().refine((val) => {
    const n = parseFloat(val)
    return !isNaN(n) && n > 0
  }, 'Expense amount must be greater than ₹0'),
  note: z.string().trim().optional(),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer']),
})

// ── Party Master Validation ──────────────────────────────────────────────────

export const PartyFormSchema = z.object({
  name: z.string().trim().min(2, 'Party name must be at least 2 characters'),
  phone: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => {
      if (!val) return true
      const clean = val.replace(/\D/g, '')
      return clean.length === 10
    }, 'Phone must be a valid 10-digit mobile number'),
  address: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  default_rola_weight_g: z.union([
    z.number().int().min(0, 'Weight cannot be negative'),
    z.string().refine((v) => !v || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0), 'Must be a non-negative number'),
    z.null(),
  ]).optional(),
  default_bungari_weight_g: z.union([
    z.number().int().min(0, 'Weight cannot be negative'),
    z.string().refine((v) => !v || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0), 'Must be a non-negative number'),
    z.null(),
  ]).optional(),
})

// ── Inferred Form Types ───────────────────────────────────────────────────────

export type InwardBagItem = z.infer<typeof InwardBagItemSchema>
export type InwardReceiptFormData = z.infer<typeof InwardReceiptFormSchema>
export type OutwardValBagItem = z.infer<typeof OutwardValBagItemSchema>
export type OutwardRolaBagItem = z.infer<typeof OutwardRolaBagItemSchema>
export type OutwardDispatchFormData = z.infer<typeof OutwardDispatchFormSchema>
export type PaymentFormData = z.infer<typeof PaymentFormSchema>
export type ExpenseFormData = z.infer<typeof ExpenseFormSchema>
export type PartyFormData = z.infer<typeof PartyFormSchema>

// ── Domain Entity Schemas (Single Source of Truth) ───────────────────────────

export const PartySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  aliases: z.array(z.string()).nullable().optional(),
  default_rola_weight_g: z.number().nullable().optional(),
  default_bungari_weight_g: z.number().nullable().optional(),
  created_at: z.string(),
})
export type Party = z.infer<typeof PartySchema>

export const ReceiptSchema = z.object({
  id: z.string(),
  party_id: z.string().nullable(),
  date: z.string(),
  color: z.string().nullable().optional(),
  gross_weight: z.number(),
  tare_weight: z.number(),
  net_weight: z.number(),
  challan_no: z.string().nullable().optional(),
  bori_count: z.number().optional(),
  rola_count: z.number(),
  status: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  challan_image: z.string().nullable().optional(),
  image_data: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
})
export type Receipt = z.infer<typeof ReceiptSchema>

export const DispatchSchema = z.object({
  id: z.string(),
  party_id: z.string().nullable(),
  date: z.string(),
  dispatch_type: z.string().nullable().optional(),
  challan_no: z.string().nullable().optional(),
  cord_count: z.number().nullable().optional(),
  twist_type: z.string().nullable().optional(),
  bungari_count: z.number(),
  bungari_weight_g: z.number().nullable().optional(),
  bore_gross_weight: z.number(),
  net_val_weight: z.number().nullable().optional(),
  rate_per_kg: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  bori_count: z.number().optional(),
  rola_count: z.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
  challan_image: z.string().nullable().optional(),
  image_data: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
})
export type Dispatch = z.infer<typeof DispatchSchema>

export const PaymentSchema = z.object({
  id: z.string(),
  party_id: z.string().nullable(),
  date: z.string(),
  amount: z.number(),
  note: z.string().nullable().optional(),
  created_at: z.string(),
})
export type Payment = z.infer<typeof PaymentSchema>

export const ExpenseSchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.string(),
  amount: z.number(),
  note: z.string().nullable().optional(),
  created_at: z.string(),
})
export type Expense = z.infer<typeof ExpenseSchema>

export const SyncOperationSchema = z.object({
  id: z.number().optional(),
  table: z.string(),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  record_id: z.string(),
  payload: z.unknown(),
  created_at: z.string(),
  status: z.enum(['pending', 'failed']).optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  failed_at: z.string().optional(),
  retries: z.number().optional(),
})
export type SyncOperation = z.infer<typeof SyncOperationSchema>

