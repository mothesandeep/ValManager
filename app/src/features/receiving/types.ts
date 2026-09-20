export interface Receipt {
  id: string
  party_id: string | null
  date: string
  color: string | null
  gross_weight: number
  tare_weight: number
  net_weight: number
  challan_no: string | null
  rola_count: number
  reconciliation_id?: string | null
  status?: string | null
  created_at: string
}

export interface ReceiptWithParty extends Receipt {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
