export const COLOR_TYPES = ['Clear', 'M.gold', 'Gold', 'Silver', 'Pelmet', 'Water', 'Antique'] as const
export const KASAB_COLORS = COLOR_TYPES
export type KasabColor = (typeof COLOR_TYPES)[number]
