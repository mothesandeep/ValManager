import {
  Wrench,
  Truck,
  Package,
  Building2,
  Users,
  Zap,
  Layers,
} from 'lucide-react'

export const EXPENSE_CATEGORIES = [
  'Labor',
  'Maintenance',
  'Transport',
  'Utilities',
  'Consumables',
  'Rent',
  'Other',
] as const

export const EXPENSE_MODAL_CATEGORIES = EXPENSE_CATEGORIES

export function standardizeCategory(category: string, note?: string | null): string {
  const text = `${category || ''} ${note || ''}`.toLowerCase()

  // 1. Labor
  if (
    text.includes('labor') ||
    text.includes('labour') ||
    text.includes('majuri') ||
    text.includes('wage') ||
    text.includes('salary') ||
    text.includes('helper') ||
    text.includes('worker') ||
    text.includes('karigar') ||
    text.includes('operator') ||
    text.includes('overtime')
  ) {
    return 'Labor'
  }

  // 2. Repairs & Maintenance
  if (
    text.includes('repair') ||
    text.includes('maintenance') ||
    text.includes('puncher') ||
    text.includes('puncture') ||
    text.includes('tyre') ||
    text.includes('tire') ||
    text.includes('patch') ||
    text.includes('patta') ||
    text.includes('motor') ||
    text.includes('belt') ||
    text.includes('spare') ||
    text.includes('service')
  ) {
    return 'Maintenance'
  }

  // 3. Transport & Fuel
  if (
    text.includes('transport') ||
    text.includes('fuel') ||
    text.includes('petrol') ||
    text.includes('diesel') ||
    text.includes('hawa') ||
    text.includes('ola') ||
    text.includes('tempo') ||
    text.includes('freight') ||
    text.includes('travel') ||
    text.includes('delivery') ||
    text.includes('auto')
  ) {
    return 'Transport'
  }

  // 4. Utilities
  if (
    text.includes('utilit') ||
    text.includes('electric') ||
    text.includes('power') ||
    text.includes('light') ||
    text.includes('water') ||
    text.includes('bill') ||
    text.includes('internet') ||
    text.includes('wifi') ||
    text.includes('phone')
  ) {
    return 'Utilities'
  }

  // 5. Consumables & Supplies
  if (
    text.includes('consumable') ||
    text.includes('oil') ||
    text.includes('marker') ||
    text.includes('refill') ||
    text.includes('challan') ||
    text.includes('book') ||
    text.includes('bugari') ||
    text.includes('bungari') ||
    text.includes('bori') ||
    text.includes('bag') ||
    text.includes('stationery') ||
    text.includes('plastic') ||
    text.includes('blade') ||
    text.includes('tape') ||
    text.includes('supplies')
  ) {
    return 'Consumables'
  }

  // 6. Rent
  if (text.includes('rent')) {
    return 'Rent'
  }

  if (category && (EXPENSE_CATEGORIES as readonly string[]).includes(category as typeof EXPENSE_CATEGORIES[number])) {
    return category
  }

  return 'Other'
}

export function getCategoryBadge(head: string) {
  switch (head) {
    case 'Maintenance':
      return {
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60',
        dotClass: 'bg-amber-500',
        Icon: Wrench,
      }
    case 'Transport':
      return {
        badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60',
        dotClass: 'bg-sky-500',
        Icon: Truck,
      }
    case 'Consumables':
      return {
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60',
        dotClass: 'bg-emerald-500',
        Icon: Package,
      }
    case 'Rent':
      return {
        badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60',
        dotClass: 'bg-blue-500',
        Icon: Building2,
      }
    case 'Labor':
      return {
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60',
        dotClass: 'bg-slate-500',
        Icon: Users,
      }
    case 'Utilities':
      return {
        badgeClass: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200/60 dark:border-yellow-800/60',
        dotClass: 'bg-yellow-500',
        Icon: Zap,
      }
    default:
      return {
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60',
        dotClass: 'bg-slate-400',
        Icon: Layers,
      }
  }
}

export function cleanEmojiAndMode(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s*\((UPI|Cash|Bank Transfer)\)\s*/gi, '')
    .trim()
}
