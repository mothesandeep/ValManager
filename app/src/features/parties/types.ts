export interface Party {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  default_rola_weight_g?: number | null
  default_bungari_weight_g?: number | null
  created_at: string
}

export interface PartyStats {
  rolaPending: number
  receivable: number
  received: number
  balance: number
  totalReceivedWeight: number
  unprocessedKasabWeight: number
  reconciledInputWeight: number
  reconciledOutputWeight: number
  totalDispatchWeight: number
  totalDispatchValue: number
  gapchaWeight: number
  gapchaSold: number
  remainingGapcha: number
}
