export interface ProductionOrder {
  id: string
  receipt_id: string | null
  cord_count: number | null
  twist_type: string | null
  waste: number
  status: string
  created_at: string
}

export interface ProductionWithReceipt extends ProductionOrder {
  receipt: {
    date: string
    net_weight: number
    color: string | null
    challan_no: string | null
    party: { name: string; default_rola_weight_g?: number | null } | null
  } | null
}
