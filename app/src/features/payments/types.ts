export interface Payment {
  id: string
  party_id: string | null
  date: string
  amount: number
  note: string | null
  created_at: string
}

export interface PaymentWithParty extends Payment {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
