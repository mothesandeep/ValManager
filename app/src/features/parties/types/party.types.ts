import type { Party as ZodParty } from '@/lib/validation/schemas'

export type Party = ZodParty


export interface PartyStats {
  rolaPending: number
  receivable: number
  received: number
  balance: number
  totalReceivedWeight: number
  unprocessedKasabWeight: number
  totalDispatchWeight: number
  totalDispatchValue: number
}
