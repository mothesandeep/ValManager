export interface Dispatch {
  id: string
  party_id: string | null
  date: string
  dispatch_type?: 'Val' | 'Rola' | 'Kali' | string | null
  challan_no?: string | null
  cord_count?: number | null
  twist_type?: 'S' | 'Z' | string | null
  bungari_count: number
  bungari_weight_g?: number | null
  bore_gross_weight: number
  net_val_weight: number | null
  rate_per_kg: number | null
  amount: number | null
  rola_count?: number | null
  reconciliation_id?: string | null
  created_at: string
}

export interface DispatchWithParty extends Dispatch {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
