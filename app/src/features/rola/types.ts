export interface RolaReturn {
  id: string
  party_id: string | null
  date: string
  rola_count: number
  created_at: string
}

export interface RolaReturnWithParty extends RolaReturn {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
