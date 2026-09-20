

export interface GapchaReconciliation {
  id: string
  party_id: string
  date: string
  input_kasab_weight: number
  output_val_weight: number
  output_kali_weight: number
  reconciled_output: number
  gapcha_weight: number
  note: string | null
  created_at: string
}

export interface GapchaReconciliationWithParty extends GapchaReconciliation {
  party: { name: string; default_rola_weight_g?: number | null } | null
}

export interface GapchaSale {
  id: string
  party_id: string | null
  buyer_name: string
  date: string
  weight_kg: number
  rate_per_kg: number | null
  amount: number | null
  note: string | null
  created_at: string
}

export interface GapchaSaleWithParty extends GapchaSale {
  party: { name: string; default_rola_weight_g?: number | null } | null
}

export interface OverallGapchaStats {
  totalReceivedNetWeight: number
  unprocessedKasabWeight: number
  reconciledInputWeight: number
  reconciledOutputWeight: number
  totalReturnedNetWeight: number
  totalGapchaGenerated: number
  totalGapchaSold: number
  remainingGapchaWeight: number
  totalGapchaRevenue: number
}
