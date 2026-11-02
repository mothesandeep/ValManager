export interface InwardBagExtraction {
  bag_no?: number;
  gross?: number;
  gross_kg?: number;
  gross_weight?: number;
  rola?: number;
  rola_count?: number;
  color?: string | null;
  twist?: 'S' | 'Z' | null;
  twistType?: 'S' | 'Z' | null;
  spool_type?: 'NORMAL' | 'BIG' | null;
  rolaType?: 'NORM' | 'BIG';
  sizeType?: 'Norm' | 'Big';
}

export interface InwardChallanData {
  gross_kg: number | null;
  tare_deduction_kg: number | null;
  net_kasab_kg: number | null;
  slipGrossTotal?: number | null;
  slipTareTotal?: number | null;
  slipNetTotal?: number | null;
  rola_pcs: number | null;
  rola_type: 'NORMAL' | 'BIG' | null;
  bags_count: number | null;
  bags?: InwardBagExtraction[];
}

export interface OutwardBagExtraction {
  bag_no?: number;
  bag_number?: number;
  gross?: number;
  gross_kg: number;
  gross_weight?: number;
  tare_weight?: number;
  net_weight?: number;
  bungari?: number;
  bungari_pcs: number;
  tar?: string;
  tar_rate: string;
  twist: 'S' | 'Z' | 'S+Z';
  twistType: 'S' | 'Z' | 'S+Z';
  rate?: number;
  description?: string;
}

export interface EmptyRolaBagExtraction {
  bag_no?: number;
  bag_number?: number;
  gross: number;
  gross_kg?: number;
  gross_weight?: number;
  weight_kg?: number;
  rola: number;
  rola_count?: number;
  is_total?: boolean;
}

export interface OutwardSettlement {
  slipGross?: number | null;
  slipTare?: number | null;
  slipNet?: number | null;
  slipRate?: number | null;
  slipAmount?: number | null;
}

export interface OutwardChallanData {
  dispatch_type?: 'VAL_FINISHED' | 'ROLA_EMPTY';
  party_name?: string | null;
  partyName?: string | null;
  challan_no?: string | null;
  challanNo?: string | null;
  date?: string | null;
  default_rate?: number | null;
  default_tar?: string | null;
  default_twist?: 'S' | 'Z' | 'S+Z' | null;
  val_bags?: OutwardBagExtraction[];
  bags?: OutwardBagExtraction[];
  empty_rola_bags?: EmptyRolaBagExtraction[];
  settlement?: OutwardSettlement | null;
  slipGrossTotal?: number | null;
  slipTareTotal?: number | null;
  slipNetTotal?: number | null;
  slipAmount?: number | null;
  tare_total_kg?: number | null;
  net_total_kg?: number | null;
  grand_total_amount?: number | null;
  net_val_kg?: number | null;
  rola_weight_kg?: number | null;
  rola_returned_pcs?: number | null;
  rate_per_kg?: number | null;
  total_amount?: number | null;
}

export interface ExtractedChallanData {
  challan_no: string | null;
  challanNo?: string | null;
  date: string | null;
  party_name: string | null;
  partyName?: string | null;
  inward_data?: InwardChallanData;
  outward_data?: OutwardChallanData;
  raw_text?: string;
  raw_notes?: string | null;
  confidence?: number;
  notes?: string | null;
  gross_weight?: number | null;
  tare_weight?: number | null;
  net_weight?: number | null;
  rola_pcs?: number | null;
  bungari_pcs?: number | null;
  rate?: number | null;
  total_amount?: number | null;
  bags?: any[];
  val_bags?: OutwardBagExtraction[];
  empty_rola_bags?: EmptyRolaBagExtraction[];
  dispatch_type?: 'VAL_FINISHED' | 'ROLA_EMPTY';
  default_tar?: string | null;
  default_twist?: 'S' | 'Z' | 'S+Z' | null;
}

export interface ScanEdgeFunctionResponse {
  data?: Record<string, unknown>;
  error?: string;
  details?: string;
}
