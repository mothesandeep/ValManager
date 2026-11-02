import type { Receipt as ZodReceipt } from '@/lib/validation/schemas'

export type Receipt = ZodReceipt

export interface ReceiptWithParty extends Receipt {
  party: { name: string; default_rola_weight_g?: number | null } | null
}

export type InwardSortField = 'date' | 'challan_no' | 'party_name' | 'gross' | 'rola' | 'net' | 'bagsCount'
export type DateRangeOption = 'month' | 'last_month' | '7days' | 'custom' | 'all'
export type WeightFilterOption = 'all' | 'under10' | '10to25' | 'over25'

export interface InwardReceiptGroup {
  id: string
  challan_no: string
  party_name: string
  date: string
  gross: number
  tare: number
  net: number
  rola: number
  bagsCount: number
  receipts: ReceiptWithParty[]
  hasBig: boolean
  imageUrl?: string | null
}

export interface InwardReviewBag {
  id: string
  gross: string
  grossNum?: number
  rola: number
  rolaCount: string
  perRolaGrams: string
  color: string | null
  twist: 'S' | 'Z' | null
  twistType: 'S' | 'Z' | null
  spool_type?: 'NORMAL' | 'BIG' | null
  rolaType: 'NORM' | 'BIG'
  sizeType: 'Norm' | 'Big'
  tare: number
  net: number
}

export interface InwardFormData {
  challan_no: string
  date: string
  party_name: string
  party_id?: string
  bags?: Array<{
    id: string
    gross: number | string
    rola: number
    twist: 'S' | 'Z' | null
    rolaType: 'NORM' | 'BIG'
    tare: number
    net: number
  }>
  gross_kg: string
  tare_deduction_kg: string
  net_kasab_kg: number
  rola_pcs: string
  rola_type: 'NORMAL' | 'BIG'
  bags_count: string
  notes?: string
  image_preview?: string
  image_url?: string
  challan_image?: string
  image_data?: string
  compressed_blob?: Blob
}

export interface OutwardReviewBag {
  id: string
  bag_no?: number
  gross: string
  bungariCount: string
  rolaCount?: string
  tar: string
  twistType: 'S' | 'Z' | 'S+Z' | ''
  tareKg?: number
  netKg?: number
  rate?: number
  amount?: number
}

export interface OutwardFormData {
  dispatch_type: 'Val' | 'Rola'
  challan_no: string
  date: string
  party_name: string
  party_id?: string
  bags: OutwardReviewBag[]
  val_bags?: OutwardReviewBag[]
  rola_bags?: OutwardReviewBag[]
  total_gross_kg: number
  total_tare_kg: number
  total_net_val_kg: number
  grand_total_amount: number
  net_val_kg?: string
  rola_weight_kg?: string
  rola_returned_pcs?: string
  rate_per_kg?: string
  total_amount?: string
  notes?: string
  image_preview?: string
  image_url?: string
  challan_image?: string
  image_data?: string
  compressed_blob?: Blob
}

export type ChallanFormData = InwardFormData | OutwardFormData
