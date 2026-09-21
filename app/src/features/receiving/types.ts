export interface Receipt {
  id: string
  party_id: string | null
  date: string
  color: string | null
  gross_weight: number
  tare_weight: number
  net_weight: number
  challan_no: string | null
  bori_count?: number
  rola_count: number
  status?: string | null
  created_at: string
}

export interface ReceiptWithParty extends Receipt {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
