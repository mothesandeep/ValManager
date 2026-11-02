/**
 * Deep Link and Shared Content Utilities for Android & PWA
 * Handles kasabval:// and valmanager:// URL schemes, App Links, and native shared text
 */

export type DetectedIntent = 'PAYMENT' | 'INWARD' | 'OUTWARD' | 'EXPENSE' | 'PARTY' | 'GENERAL'

export interface ParsedShareContent {
  rawText: string
  intent: DetectedIntent
  suggestedAmount?: number
  suggestedPartyName?: string
  suggestedReference?: string
}

/**
 * Parses incoming deep link URLs (e.g. kasabval://receiving?action=new, valmanager://payments)
 * and maps them to internal React Router SPA pathnames.
 */
export function parseDeepLinkUrl(urlString: string): string | null {
  try {
    let normalized = urlString.trim()
    if (!normalized) return null

    const validSchemes = ['kasabval:', 'valmanager:', 'https:', 'http:']
    const hasKnownScheme = validSchemes.some((s) => normalized.toLowerCase().startsWith(s))

    if (!hasKnownScheme && !normalized.startsWith('/')) {
      return null
    }

    // Normalize custom schemes to a valid URL object
    if (normalized.startsWith('kasabval://') || normalized.startsWith('valmanager://')) {
      normalized = normalized.replace(/^(kasabval|valmanager):\/\/?/, 'https://valmanager.app/')
    }

    const parsed = new URL(normalized)
    const cleanPath = parsed.pathname.toLowerCase().replace(/^\/+|\/+$/g, '')

    let targetPath = '/'
    if (cleanPath === 'receiving' || cleanPath === 'inward') {
      targetPath = '/receiving'
    } else if (cleanPath === 'dispatch' || cleanPath === 'outward') {
      targetPath = '/dispatch'
    } else if (cleanPath === 'payments' || cleanPath === 'billing') {
      targetPath = '/payments'
    } else if (cleanPath === 'parties') {
      targetPath = '/parties'
    } else if (cleanPath === 'expenses') {
      targetPath = '/expenses'
    } else if (cleanPath === 'reports') {
      targetPath = '/reports'
    } else if (cleanPath === 'settings') {
      targetPath = '/settings'
    } else if (!cleanPath || cleanPath === 'dashboard') {
      targetPath = '/'
    } else {
      targetPath = `/${cleanPath}`
    }

    const search = parsed.search || ''
    return `${targetPath}${search}`
  } catch (err) {
    console.warn('[parseDeepLinkUrl] Failed to parse URL:', urlString, err)
    return null
  }
}

/**
 * Analyzes arbitrary text shared from other Android apps (WhatsApp, SMS, Notes)
 * and detects likely accounting/job-work intent and extractable fields.
 */
export function detectSharedTextIntent(text: string): ParsedShareContent {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()

  // 1. Extract possible amounts: ₹ 15,000 or Rs. 15000 or 15000/- or 15000.00
  let suggestedAmount: number | undefined
  const amountMatch = trimmed.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:\/-)?/i)
  if (amountMatch && amountMatch[1]) {
    const cleanNumStr = amountMatch[1].replace(/,/g, '')
    const parsedNum = parseFloat(cleanNumStr)
    if (!isNaN(parsedNum) && parsedNum > 0) {
      suggestedAmount = parsedNum
    }
  }

  // 2. Intent detection heuristics
  const isPayment =
    lower.includes('paid') ||
    lower.includes('payment') ||
    lower.includes('received') ||
    lower.includes('paisa') ||
    lower.includes('jama') ||
    lower.includes('upi') ||
    lower.includes('gpay') ||
    lower.includes('phonepe') ||
    lower.includes('paytm') ||
    lower.includes('neft') ||
    lower.includes('rtgs') ||
    lower.includes('imps') ||
    lower.includes('transfer') ||
    lower.includes('cheque') ||
    lower.includes('chq')

  const isExpense =
    lower.includes('expense') ||
    lower.includes('kharch') ||
    lower.includes('chai') ||
    lower.includes('tea') ||
    lower.includes('diesel') ||
    lower.includes('petrol') ||
    lower.includes('rickshaw') ||
    lower.includes('tempo') ||
    lower.includes('light bill') ||
    lower.includes('bill payment') ||
    lower.includes('salary') ||
    lower.includes('snack')

  const isInward =
    lower.includes('inward') ||
    lower.includes('aavak') ||
    lower.includes('raw yarn') ||
    lower.includes('spool') ||
    lower.includes('rola') ||
    lower.includes('tare')

  const isOutward =
    lower.includes('outward') ||
    lower.includes('dispatch') ||
    lower.includes('javak') ||
    lower.includes('bungari') ||
    lower.includes('val delivery') ||
    lower.includes('delivery')

  const isParty =
    lower.includes('party') ||
    lower.includes('gstin') ||
    lower.includes('phone') ||
    lower.includes('mobile') ||
    lower.includes('khata')

  let intent: DetectedIntent = 'GENERAL'
  if (isPayment) intent = 'PAYMENT'
  else if (isExpense) intent = 'EXPENSE'
  else if (isInward) intent = 'INWARD'
  else if (isOutward) intent = 'OUTWARD'
  else if (isParty) intent = 'PARTY'

  return {
    rawText: trimmed,
    intent,
    suggestedAmount,
    suggestedReference: trimmed.slice(0, 120),
  }
}
