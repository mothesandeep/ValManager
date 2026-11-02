import { fmtDate } from './date'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function fmtMoney(n: number | null | undefined): string {
  const val = Number(n) || 0
  return currencyFormatter.format(val)
}

export function fmtKg(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

export function kgToGrams(kg: number | string | null | undefined): string {
  if (kg === null || kg === undefined || kg === '') return ''
  const val = typeof kg === 'string' ? parseFloat(kg) : kg
  if (isNaN(val)) return ''
  return String(Math.round(val * 1000))
}

export function gramsToKg(grams: number | string | null | undefined): number {
  if (grams === null || grams === undefined || grams === '') return 0
  const val = typeof grams === 'string' ? parseFloat(grams) : grams
  if (isNaN(val) || val < 0) return 0
  return val / 1000
}

/**
 * Robust error message extractor that safely parses Error objects,
 * Supabase/PostgREST error dictionaries, DOMExceptions, and strings.
 * Guarantees a readable string is returned instead of "[object Object]".
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err.trim() || fallback
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim()
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error.trim()
    if (typeof obj.error_description === 'string' && obj.error_description.trim()) return obj.error_description.trim()
    if (typeof obj.details === 'string' && obj.details.trim()) return obj.details.trim()
    if (typeof obj.hint === 'string' && obj.hint.trim()) return `${obj.message || fallback} (${obj.hint})`
    try {
      const json = JSON.stringify(err)
      if (json && json !== '{}') return json
    } catch {
      // ignore serialization failures
    }
  }
  return String(err)
}

export { fmtDate, fmtDate as formatDate }
