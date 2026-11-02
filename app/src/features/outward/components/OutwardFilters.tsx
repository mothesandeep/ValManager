import { OutwardFilterToolbar } from './OutwardFilterToolbar'
import type { Party } from '@/features/parties/types'
import type { DispatchWeightFilter, DispatchDateRange } from '@/features/outward/types'

export interface OutwardFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedPartyId: string | null
  partyFilterButtonLabel: string
  parties: Party[]
  onSelectParty: (id: string | null) => void
  partyDispatchCounts: Record<string, number>
  totalBaseCount: number
  recordsCount: number
  hasActiveFilters: boolean
  onResetFilters: () => void
  weightFilter: DispatchWeightFilter
  weightFilterLabel: string
  onSelectWeightFilter: (w: DispatchWeightFilter) => void
  dateRangeFilter: DispatchDateRange
  dateFilterLabel: string
  onSelectDateRangeFilter: (r: DispatchDateRange) => void
  formattedMonth: string
  customStartDate: string
  customEndDate: string
  onChangeCustomStartDate: (d: string) => void
  onChangeCustomEndDate: (d: string) => void
  selectedGroupKeysCount: number
  onOpenPrintModal?: (view: 'register' | 'statement' | 'challan') => void
  onExportCSV: () => void
}

export function OutwardFilters(props: OutwardFiltersProps) {
  return <OutwardFilterToolbar {...props} />
}
