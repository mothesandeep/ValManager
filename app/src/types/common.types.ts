export type ID = string

export interface BaseEntity {
  id: ID
  created_at: string
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface MonthPeriod {
  month: number
  year: number
  isAllTime?: boolean
}

export interface SummaryStat {
  label: string
  value: string | number
  unit?: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}
