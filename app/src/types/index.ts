// ── Database row types — mirror Supabase schema exactly ──────────────────────

export interface Party {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

// Party augmented with stats computed from other tables
export interface PartyStats {
  rolaPending: number         // SUM(receipts.rola_count) − SUM(rola_returns.rola_count)
  receivable: number          // SUM(dispatches.amount)
  received: number            // SUM(payments.amount)
  balance: number             // receivable − received
  totalDispatchWeight: number // SUM(dispatches.net_val_weight)
  totalDispatchValue: number  // SUM(dispatches.amount)
}

export interface Receipt {
  id: string
  party_id: string | null
  date: string
  color: string | null
  gross_weight: number
  tare_weight: number
  net_weight: number     // generated always: gross_weight − tare_weight (read-only, never in INSERT/UPDATE)
  challan_no: string | null
  rola_count: number
  created_at: string
}

// Receipt joined with the party's name for display
export interface ReceiptWithParty extends Receipt {
  party: { name: string } | null
}

export interface ProductionOrder {
  id: string
  receipt_id: string | null
  cord_count: number | null
  twist_type: string | null   // 'S' | 'Z'
  waste: number
  status: string              // 'Pending' | 'In Progress' | 'Done'
  created_at: string
}

// Production order joined with its receipt + that receipt's party name
export interface ProductionWithReceipt extends ProductionOrder {
  receipt: {
    date: string
    net_weight: number
    color: string | null
    challan_no: string | null
    party: { name: string } | null
  } | null
}

export interface Dispatch {
  id: string
  party_id: string | null
  date: string
  dispatch_type?: 'Val' | 'Kali' | string | null
  challan_no?: string | null
  bungari_count: number
  bungari_weight_g?: number | null
  bore_gross_weight: number
  net_val_weight: number | null
  rate_per_kg: number | null
  amount: number | null
  rola_count?: number | null
  created_at: string
}

// Dispatch joined with the party's name
export interface DispatchWithParty extends Dispatch {
  party: { name: string } | null
}

export interface RolaReturn {
  id: string
  party_id: string | null
  date: string
  rola_count: number
  created_at: string
}

export interface RolaReturnWithParty extends RolaReturn {
  party: { name: string } | null
}

export interface Payment {
  id: string
  party_id: string | null
  date: string
  amount: number
  note: string | null
  created_at: string
}

export interface PaymentWithParty extends Payment {
  party: { name: string } | null
}

export interface Expense {
  id: string
  date: string
  category: string
  amount: number
  note: string | null
  created_at: string
}

export interface SyncFailure {
  id: string
  table_name: string | null
  record_id: string | null
  error: string | null
  attempted_at: string
}

// ── Shared constants ──────────────────────────────────────────────────────────

export const COLOR_TYPES = ['Gold', 'Silver', 'Pelmet', 'Water', 'Antique'] as const
export const KASAB_COLORS = COLOR_TYPES

export const CORD_TYPES = [4, 8, 10, 12, 14, 18] as const
export const CORD_COUNTS = CORD_TYPES

export const EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Electricity Bill',
  'Transport',
  'Ola Charging',
  'Bike Fuel',
  'Bike Repair',
  'Machine Oil',
  'Motor/Belt Repair',
  'Marker',
  'Marker Refill',
  'Other',
] as const

export const PRODUCTION_STATUSES = ['Pending', 'In Progress', 'Done'] as const

export const BUNGARI_WEIGHT_KG = 0.07

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a date string (YYYY-MM-DD) to "08 Sep 2026" */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Format a number as Indian currency: ₹1,23,456 */
export function fmtMoney(n: number | null | undefined): string {
  return `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** Format weight with 3 decimal places: 23.535 kg */
export function fmtKg(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

/** Convert kg to whole-number grams string for form inputs (e.g. 23.535 -> "23535") */
export function kgToGrams(kg: number | string | null | undefined): string {
  if (kg === null || kg === undefined || kg === '') return ''
  const val = typeof kg === 'string' ? parseFloat(kg) : kg
  if (isNaN(val)) return ''
  return String(Math.round(val * 1000))
}

/** Convert whole-number grams to kg number (e.g. 23535 -> 23.535) */
export function gramsToKg(grams: number | string | null | undefined): number {
  if (grams === null || grams === undefined || grams === '') return 0
  const val = typeof grams === 'string' ? parseFloat(grams) : grams
  if (isNaN(val) || val < 0) return 0
  return val / 1000
}

/** Check if date is in current month */
export function isThisMonth(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

/** Today as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const today = todayStr
