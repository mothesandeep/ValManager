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
  if (kg === null || kg === undefined || kg === '') return '';
  const val = typeof kg === 'string' ? parseFloat(kg) : kg;
  if (isNaN(val)) return '';
  return String(Math.round(val * 1000));
}

export function gramsToKg(grams: number | string | null | undefined): number {
  if (grams === null || grams === undefined || grams === '') return 0;
  const val = typeof grams === 'string' ? parseFloat(grams) : grams;
  if (isNaN(val) || val < 0) return 0;
  return val / 1000;
}
