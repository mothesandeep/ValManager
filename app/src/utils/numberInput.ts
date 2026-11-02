/**
 * Cleans string input for numeric fields:
 * - Allows only numbers and at most a single decimal point.
 * - Strips redundant leading zeros (e.g., '005' -> '5', '07.2' -> '7.2') while preserving '0.' and '0'.
 */
export function sanitizeNumericInput(raw: string, allowDecimals = true): string {
  if (!raw) return ''

  // Replace invalid characters
  let clean = allowDecimals
    ? raw.replace(/[^0-9.]/g, '')
    : raw.replace(/[^0-9]/g, '')

  // Ensure only first decimal point is kept
  if (allowDecimals && clean.includes('.')) {
    const parts = clean.split('.')
    clean = parts[0] + '.' + parts.slice(1).join('')
  }

  // Remove leading zeros like '005' -> '5', '00' -> '0', but keep '0.' or '0'
  if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
    clean = clean.replace(/^0+/, '')
    if (clean === '' || clean.startsWith('.')) {
      clean = '0' + clean
    }
  }

  return clean
}

/**
 * Sanitizes integer inputs (e.g., rola counts, bungari counts).
 */
export function sanitizeIntegerInput(raw: string): string {
  return sanitizeNumericInput(raw, false)
}

/**
 * Parses numeric string safely without NaN or negative values.
 */
export function parseNumericInput(raw: string): number {
  if (!raw) return 0
  const n = parseFloat(raw)
  return isNaN(n) || n < 0 ? 0 : n
}

/**
 * Safely parses weights entered in grams or kg.
 * If user inputs an absolute integer > 500, it automatically scales from grams to kg.
 */
export function parseWeightInput(raw: string): number {
  const n = parseNumericInput(raw)
  if (n > 500) {
    return Number((n / 1000).toFixed(3))
  }
  return Number(n.toFixed(3))
}

/**
 * Formats weight to 3 decimal places (kg).
 */
export function formatKgDisplay(val: number | string): string {
  const n = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(n)) return '0.000'
  return n.toFixed(3)
}

/**
 * Formats currency to 2 decimal places (₹).
 */
export function formatCurrencyDisplay(val: number | string): string {
  const n = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}

/**
 * Pure line-item calculation: Net Weight × Rate = Amount
 */
export function calculateLineTotal(netWeightKg: number, ratePerKg: number): number {
  if (netWeightKg <= 0 || ratePerKg <= 0) return 0
  return Math.round(netWeightKg * ratePerKg * 100) / 100
}

/**
 * Converts Indian currency numbers to words (e.g. 15000 -> "Fifteen Thousand Rupees Only")
 */
export function numberToWordsINR(num: number): string {
  if (!num || num <= 0) return 'Zero Rupees Only'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const numToWords = (n: number): string => {
    let str = ''
    if (n >= 10000000) {
      str += numToWords(Math.floor(n / 10000000)) + ' Crore '
      n %= 10000000
    }
    if (n >= 100000) {
      str += numToWords(Math.floor(n / 100000)) + ' Lakh '
      n %= 100000
    }
    if (n >= 1000) {
      str += numToWords(Math.floor(n / 1000)) + ' Thousand '
      n %= 1000
    }
    if (n >= 100) {
      str += numToWords(Math.floor(n / 100)) + ' Hundred '
      n %= 100
    }
    if (n > 0) {
      if (n < 20) str += ones[n]
      else str += tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    }
    return str.trim()
  }

  const intPart = Math.floor(num)
  const paise = Math.round((num - intPart) * 100)

  let words = numToWords(intPart) + ' Rupees'
  if (paise > 0) {
    words += ' and ' + numToWords(paise) + ' Paise'
  }
  return words + ' Only'
}
