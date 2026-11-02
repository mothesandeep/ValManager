import type { Dispatch as ZodDispatch } from '@/lib/validation/schemas'

export type Dispatch = ZodDispatch


export interface DispatchWithParty extends Dispatch {
  party: { name: string; default_rola_weight_g?: number | null } | null
}

export type DispatchSortField = 'date' | 'challanNo' | 'partyName' | 'totalValNet' | 'totalRolaGross' | 'totalRolaCount' | 'totalAmount'
export type DispatchWeightFilter = 'all' | 'under10' | '10to25' | 'over25'
export type DispatchDateRange = 'month' | 'last_month' | '7days' | 'custom' | 'all'

export interface ChallanGroup {
  key: string
  challanNo: string | null
  date: string
  partyId: string
  partyName: string
  entries: DispatchWithParty[]
  totalGross: number
  totalNet: number
  totalValNet: number
  totalRolaGross: number
  totalRolaCount: number
  totalAmount: number
  hasVal: boolean
  hasRola: boolean
  imageUrl: string | null
}
