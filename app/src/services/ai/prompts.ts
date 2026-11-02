import { z } from 'zod';
import type { Party } from '@/features/parties/types';
import { getPartyAliases } from '@/features/parties/utils';

/**
 * Zod Schemas for structured AI extraction validation
 */
export const InwardBagZodSchema = z.object({
  bag_number: z.number().optional(),
  bag_no: z.number().optional(),
  gross_weight: z.number().optional(),
  gross: z.number().optional(),
  gross_kg: z.number().optional(),
  tare_weight: z.number().nullable().optional(),
  net_weight: z.number().nullable().optional(),
  bungari: z.number().nullable().optional(),
  rola: z.number().nullable().optional(),
  rola_count: z.number().nullable().optional(),
  color: z.string().nullable().optional(),
  quality: z.string().nullable().optional(),
  twist: z.enum(['S', 'Z']).nullable().optional(),
  twistType: z.enum(['S', 'Z']).nullable().optional(),
  spool_type: z.enum(['NORMAL', 'BIG']).nullable().optional(),
  rolaType: z.enum(['NORM', 'BIG']).nullable().optional(),
  sizeType: z.enum(['Norm', 'Big']).nullable().optional(),
  description: z.string().nullable().optional(),
});

export const InwardChallanZodSchema = z.object({
  party_name: z.string().nullable().optional(),
  partyName: z.string().nullable().optional(),
  challan_no: z.string().nullable().optional(),
  challanNo: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  gross_kg: z.number().nullable().optional(),
  tare_deduction_kg: z.number().nullable().optional(),
  net_kasab_kg: z.number().nullable().optional(),
  slipGrossTotal: z.number().nullable().optional(),
  slipTareTotal: z.number().nullable().optional(),
  slipNetTotal: z.number().nullable().optional(),
  rola_pcs: z.number().nullable().optional(),
  rola_type: z.enum(['NORMAL', 'BIG']).nullable().optional(),
  bags_count: z.number().nullable().optional(),
  bags: z.array(InwardBagZodSchema).optional(),
  notes: z.string().nullable().optional(),
});

export const OutwardBagZodSchema = z.object({
  bag_number: z.number().optional(),
  bag_no: z.number().optional(),
  gross: z.number().optional(),
  gross_weight: z.number().optional(),
  gross_kg: z.number().optional(),
  bungari: z.number().optional(),
  bungari_pcs: z.number().optional(),
  tar: z.string().optional(),
  tar_rate: z.string().optional(),
  twistType: z.enum(['S', 'Z', 'S+Z']).optional(),
  twist: z.enum(['S', 'Z', 'S+Z']).optional(),
  rate: z.number().optional(),
});

export const EmptyRolaBagZodSchema = z.object({
  bag_number: z.number().optional(),
  bag_no: z.number().optional(),
  gross: z.number(),
  gross_weight: z.number().optional(),
  gross_kg: z.number().optional(),
  weight_kg: z.number().optional(),
  weight: z.number().optional(),
  rola: z.number(),
  rola_count: z.number().optional(),
});

export const OutwardChallanZodSchema = z.object({
  party_name: z.string().nullable().optional(),
  partyName: z.string().nullable().optional(),
  challan_no: z.string().nullable().optional(),
  challanNo: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  dispatch_type: z.enum(['VAL_FINISHED', 'ROLA_EMPTY']).nullable().optional(),
  default_rate: z.number().nullable().optional(),
  default_tar: z.string().nullable().optional(),
  default_twist: z.enum(['S', 'Z', 'S+Z']).nullable().optional(),
  val_bags: z.array(OutwardBagZodSchema).optional(),
  bags: z.array(OutwardBagZodSchema).optional(),
  empty_rola_bags: z.array(EmptyRolaBagZodSchema).optional(),
  slipGrossTotal: z.number().nullable().optional(),
  slipTareTotal: z.number().nullable().optional(),
  slipNetTotal: z.number().nullable().optional(),
  slipAmount: z.number().nullable().optional(),
  tare_total_kg: z.number().nullable().optional(),
  net_total_kg: z.number().nullable().optional(),
  grand_total_amount: z.number().nullable().optional(),
  rola_weight_kg: z.number().nullable().optional(),
  rola_returned_pcs: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Native JSON Schemas passed to Gemini API config for structured response
 */
export const INWARD_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    party_name: { type: 'STRING', description: 'Transcribe the party/sender name (e.g., Vijay bhai, Ashok bhai)', nullable: true },
    partyName: { type: 'STRING', description: 'Same as party_name', nullable: true },
    challan_no: { type: 'STRING', description: 'Extracted challan or ch. no. (digits/string, e.g. 489)', nullable: true },
    challanNo: { type: 'STRING', description: 'Same as challan_no', nullable: true },
    date: { type: 'STRING', description: 'Extracted date formatted as DD/MM/YYYY or YYYY-MM-DD', nullable: true },
    gross_kg: { type: 'NUMBER', description: 'Total gross scale weight sum of all bags in kg (e.g. 118.890)', nullable: true },
    tare_deduction_kg: { type: 'NUMBER', description: 'Tare or deduction weight in kg (e.g. 50.020)', nullable: true },
    net_kasab_kg: { type: 'NUMBER', description: 'Net Kasab weight in kg (Gross - Deduction, e.g. 68.870)', nullable: true },
    slipGrossTotal: { type: 'NUMBER', description: 'Gross weight sum written at divider/summary row', nullable: true },
    slipTareTotal: { type: 'NUMBER', description: 'Tare deduction weight written at divider/summary row', nullable: true },
    slipNetTotal: { type: 'NUMBER', description: 'Net Kasab weight written at divider/summary row', nullable: true },
    rola_pcs: { type: 'INTEGER', description: 'Total count of rola pieces sum across all bags (e.g. 244)', nullable: true },
    rola_type: { type: 'STRING', enum: ['NORMAL', 'BIG'], nullable: true },
    bags_count: { type: 'INTEGER', description: 'Count of bags or parcels (e.g. 4)', nullable: true },
    bags: {
      type: 'ARRAY',
      description: 'List of individual raw kasab bags written above the summary/subtotal divider line. Each bag row has gross weight, rola count, twist (S or Z, or null), and color/quality (or null). Do NOT include the sum/subtotal row or deduction row.',
      items: {
        type: 'OBJECT',
        properties: {
          bag_number: { type: 'INTEGER', description: 'Bag number 1, 2, 3...' },
          bag_no: { type: 'INTEGER', description: 'Same as bag_number' },
          gross_weight: { type: 'NUMBER', description: 'Gross scale weight of this individual bag in kg (e.g. 27.230, or 38730 normalized to 38.730)' },
          gross: { type: 'NUMBER', description: 'Same as gross_weight' },
          gross_kg: { type: 'NUMBER', description: 'Same as gross_weight' },
          tare_weight: { type: 'NUMBER', description: 'Numeric tare weight if present', nullable: true },
          net_weight: { type: 'NUMBER', description: 'Numeric net weight/quantity', nullable: true },
          bungari: { type: 'INTEGER', description: 'Count of pieces or rolas', nullable: true },
          rola: { type: 'INTEGER', description: 'Rola piece count for this bag (e.g. 59, 60, 67, 58)', nullable: true },
          rola_count: { type: 'INTEGER', description: 'Same as rola', nullable: true },
          color: { type: 'STRING', description: 'Color or quality (e.g. M.gold, Gold, Silver). Strictly null if not explicitly handwritten on slip.', nullable: true },
          quality: { type: 'STRING', description: 'Quality or item type', nullable: true },
          twist: { type: 'STRING', enum: ['S', 'Z'], description: 'Twist direction strictly S or Z. Strictly null if not explicitly handwritten on slip.', nullable: true },
          twistType: { type: 'STRING', enum: ['S', 'Z'], nullable: true },
          spool_type: { type: 'STRING', enum: ['NORMAL', 'BIG'], description: 'Spool type: BIG if note like "મોટા" appears next to a line, otherwise NORMAL', nullable: true },
          rolaType: { type: 'STRING', enum: ['NORM', 'BIG'], description: 'Rola type NORM or BIG (BIG if મોટા note appears)', nullable: true },
          sizeType: { type: 'STRING', enum: ['Norm', 'Big'], nullable: true },
          description: { type: 'STRING', description: 'Line item description or item code', nullable: true },
        },
        required: ['bag_number', 'gross_weight'],
      },
    },
    notes: { type: 'STRING', nullable: true },
  },
  required: ['date', 'bags'],
};

export const OUTWARD_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    party_name: { type: 'STRING', description: 'Transcribe the party/receiver name (e.g., Ashok bhai, Jay Mataji)', nullable: true },
    partyName: { type: 'STRING', description: 'Same as party_name', nullable: true },
    challan_no: { type: 'STRING', description: 'Extracted challan or ch. no. (digits/string)', nullable: true },
    challanNo: { type: 'STRING', description: 'Same as challan_no', nullable: true },
    date: { type: 'STRING', description: 'Extracted date formatted as DD/MM/YYYY or YYYY-MM-DD', nullable: true },
    dispatch_type: { type: 'STRING', enum: ['VAL_FINISHED', 'ROLA_EMPTY'], description: 'VAL_FINISHED for finished goods, ROLA_EMPTY for empty rola return', nullable: true },
    default_rate: { type: 'NUMBER', description: 'Job-work rate per kg (e.g. 20)', nullable: true },
    default_tar: { type: 'STRING', description: 'Default tar description (e.g. 10 Tar, 12 Tar)', nullable: true },
    default_twist: { type: 'STRING', enum: ['S', 'Z', 'S+Z'], nullable: true },
    val_bags: {
      type: 'ARRAY',
      description: 'List of finished val bags in the upper section of the challan. Each row with an individual bag gross weight must be a separate item.',
      items: {
        type: 'OBJECT',
        properties: {
          bag_number: { type: 'INTEGER', description: 'Bag number 1, 2, 3...' },
          bag_no: { type: 'INTEGER', description: 'Same as bag_number' },
          gross: { type: 'NUMBER', description: 'Gross scale weight of finished val bag in kg (e.g. 23.060)' },
          gross_weight: { type: 'NUMBER', description: 'Same as gross' },
          gross_kg: { type: 'NUMBER', description: 'Same as gross' },
          bungari: { type: 'INTEGER', description: 'Count of bungari tubes/pieces in this bag (e.g. 12)' },
          bungari_pcs: { type: 'INTEGER', description: 'Same as bungari' },
          tar: { type: 'STRING', description: 'Tar / cord count category (e.g. 10 Tar, 12 Tar)' },
          tar_rate: { type: 'STRING', description: 'Same as tar' },
          twistType: { type: 'STRING', enum: ['S', 'Z', 'S+Z'], description: 'Twist direction strictly S, Z, or S+Z' },
          twist: { type: 'STRING', enum: ['S', 'Z', 'S+Z'], description: 'Same as twistType' },
          rate: { type: 'NUMBER', description: 'Job-work rate per kg (e.g. 20)' },
        },
        required: ['gross'],
      },
    },
    bags: {
      type: 'ARRAY',
      description: 'List of individual bags. Each row with an individual bag gross weight must be a separate item. Do NOT include the sum/total row.',
      items: {
        type: 'OBJECT',
        properties: {
          bag_number: { type: 'INTEGER', description: 'Bag number 1, 2, 3...' },
          bag_no: { type: 'INTEGER', description: 'Same as bag_number' },
          gross_weight: { type: 'NUMBER', description: 'Numeric gross weight of this individual bag in kg' },
          gross: { type: 'NUMBER', description: 'Same as gross_weight' },
          gross_kg: { type: 'NUMBER', description: 'Same as gross_weight' },
          tare_weight: { type: 'NUMBER', description: 'Numeric tare weight if present' },
          net_weight: { type: 'NUMBER', description: 'Numeric net weight/quantity' },
          bungari: { type: 'INTEGER', description: 'Count of bungari tubes/pieces in this bag (e.g. 12)' },
          bungari_pcs: { type: 'INTEGER', description: 'Same as bungari' },
          description: { type: 'STRING', description: 'Line item description or item code (e.g. 10 C, 10 S, 22450)' },
          tar: { type: 'STRING', description: 'Tar / cord count category (e.g. 10 Tar, 12 Tar)' },
          tar_rate: { type: 'STRING', description: 'Same as tar' },
          twistType: { type: 'STRING', enum: ['S', 'Z', 'S+Z'], description: 'Twist direction strictly S, Z, or S+Z' },
          twist: { type: 'STRING', enum: ['S', 'Z', 'S+Z'], description: 'Same as twistType' },
          rate: { type: 'NUMBER', description: 'Job-work rate per kg (e.g. 20)' },
        },
        required: ['bag_number', 'gross_weight', 'bungari', 'tar', 'twist'],
      },
    },
    empty_rola_bags: {
      type: 'ARRAY',
      description:
        'CRITICAL: Secondary/return section at the bottom of the challan (typically rows 11-15 or below divider). Return empty array [] ONLY if bottom section has no entries. If there are handwritten weights (e.g. 19.280, 16.500) and counts (80, 72), each individual row MUST be extracted into this array with gross and rola.',
      items: {
        type: 'OBJECT',
        properties: {
          bag_number: { type: 'INTEGER', description: 'Bag/lot number 1, 2, 3...' },
          bag_no: { type: 'INTEGER', description: 'Same as bag_number' },
          gross: { type: 'NUMBER', description: 'Gross scale weight of empty rola in kg (e.g. 19.280, 16.500)' },
          gross_weight: { type: 'NUMBER', description: 'Same as gross' },
          gross_kg: { type: 'NUMBER', description: 'Same as gross' },
          weight_kg: { type: 'NUMBER', description: 'Same as gross' },
          weight: { type: 'NUMBER', description: 'Same as gross' },
          rola: { type: 'INTEGER', description: 'Number of empty rola pieces (e.g. 80, 72)' },
          rola_count: { type: 'INTEGER', description: 'Same as rola' },
        },
        required: ['gross', 'rola'],
      },
    },
    total_gross_weight: { type: 'NUMBER', description: 'Total gross scale weight sum of bags', nullable: true },
    total_amount: { type: 'NUMBER', description: 'Total bill amount payable in INR', nullable: true },
    settlement: {
      type: 'OBJECT',
      description: 'Calculations and settlement summary printed below the individual bags table (Total Gross, Tare, Net Val, Rate, Rupee Amount)',
      nullable: true,
      properties: {
        slipGross: { type: 'NUMBER', description: 'Total gross scale weight sum of bags (e.g. 42.100 or 64.400)', nullable: true },
        slipTare: { type: 'NUMBER', description: 'Tare weight deduction sum (e.g. 1.610 or 2.520)', nullable: true },
        slipNet: { type: 'NUMBER', description: 'Total net Val weight (Gross - Tare, e.g. 40.490 or 61.880)', nullable: true },
        slipRate: { type: 'NUMBER', description: 'Job-work rate per kg (e.g. 20)', nullable: true },
        slipAmount: { type: 'NUMBER', description: 'Final payable rupee amount (e.g. 809 or 1237)', nullable: true },
      },
    },
    slipGrossTotal: { type: 'NUMBER', description: 'Total gross scale weight sum written at bottom', nullable: true },
    slipTareTotal: { type: 'NUMBER', description: 'Total tare weight deducted sum written at bottom', nullable: true },
    slipNetTotal: { type: 'NUMBER', description: 'Total net finished Val weight sum written at bottom', nullable: true },
    slipAmount: { type: 'NUMBER', description: 'Total bill amount payable in INR written at bottom', nullable: true },
    tare_total_kg: { type: 'NUMBER', description: 'Total tare deduction weight in kg', nullable: true },
    net_total_kg: { type: 'NUMBER', description: 'Total net Val weight in kg', nullable: true },
    grand_total_amount: { type: 'NUMBER', description: 'Total amount payable in INR', nullable: true },
    rola_weight_kg: { type: 'NUMBER', description: 'Empty Rola return weight in kg', nullable: true },
    rola_returned_pcs: { type: 'INTEGER', description: 'Number of empty Rola pieces returned', nullable: true },
    notes: { type: 'STRING', nullable: true },
  },
  required: ['date', 'empty_rola_bags'],
};

export function buildPartyPromptSection(knownParties?: Party[]): string {
  if (!knownParties || knownParties.length === 0) return '';
  const partyListStr = knownParties
    .map((p) => {
      const aliases = getPartyAliases(p);
      return aliases.length > 0
        ? `  - "${p.name}" (Recognized Aliases: ${aliases.join(', ')})`
        : `  - "${p.name}"`;
    })
    .join('\n');

  return `\n\n4. Registered Parties & Alias Mapping:
The following parties are officially registered in our directory:
${partyListStr}
- CRITICAL: Match the handwritten sender/receiver party name on the slip against these registered parties.
- If the slip mentions an alias, nickname, or short form (such as "Vijay Bhai", "Vijaybhai", or "Vijay"), ALWAYS map and return the registered canonical party name (e.g. "Vijay Navadiya") in the "partyName" / "party_name" field.`;
}

export function getInwardSystemInstruction(partyPromptSection: string): string {
  return `You are an expert OCR parser for Indian textile delivery challans and job-work receipts for "ValManager (Jari Kasab & Val Portal)".
You analyze handwritten delivery slips for RAW MATERIAL RECEIVING (Kasab / Inward yarn challans from suppliers like Vijay bhai, Ashok bhai, etc. in Surat/Gujarat/India).

CRITICAL PARSING & MULTI-BAG EXTRACTION RULES FOR INWARD CHALLANS:

1. STRUCTURE OF RAW KASAB / INWARD CHALLANS:
   - Header:
     * Party name: Extract from "To M/s." or header line (e.g. "Vijay bhai", "Ashok bhai"). Match against registered parties below.
     * Challan No: Extract from "Ch. No." or "No." (e.g. "489", "42").
     * Date: Extract from "Date:", "Ta.", "તારીખ", "Dt:" (e.g. "29/10/2026", "29-10-26" -> format strictly as ISO "YYYY-MM-DD", e.g. "2026-10-29").
   - Individual Bags Table (ABOVE the horizontal divider line):
     * Each row listed ABOVE the summary/subtotal horizontal divider line represents ONE INDIVIDUAL BAG OF KASAB YARN.
     * For every handwritten bag row preceding the divider line, create an individual object in the "bags" array.
     * Do NOT combine multiple bag rows into a single bag!
     * Extract for each bag:
       - "bag_number": 1, 2, 3, 4...
       - "gross_weight": Gross scale weight of this individual bag in kg (e.g. 27.230, 28.500, 31.800, 31.360). Normalize raw weights: if written in grams without decimal point (e.g. 38730 or 27230), convert to kg (38.730, 27.230).
       - "rola": Count of plastic/paper rola tubes inside this bag (e.g. 59, 60, 67, 58). This is often in the Quantity / Nag column or written next to twist like "59 S", "59-S", "60 S", "58 Z".
       - "twist": Twist direction strictly "S" or "Z" (e.g. "59 S" -> twist: "S"; "58 Z" -> twist: "Z"; "C" or "S" -> "S", "Z" -> "Z"). If twist (S/Z) is not explicitly handwritten on the challan slip, return null. Do not default or guess.
       - "color": Quality or color description (e.g. "M.gold", "Gold", "Silver", "Copper"). If color is not explicitly handwritten on the challan slip, return null. Do not default or guess.
       - "spool_type": If a Gujarati note like "મોટા" appears next to a line, detect spool_type as "BIG"; otherwise "NORMAL".
       - "rolaType": "NORM" or "BIG" (detect as "BIG" if Gujarati note like "મોટા" appears).
   - Calculation & Summary Section (AT and BELOW the horizontal divider line):
     * The lines at and below the divider line are CALCULATED SUMMARY VALUES, NOT BAGS!
     * DO NOT treat the subtotal row, deduction row, or net row as items in the "bags" array!
     * "gross_kg" / "slipGrossTotal": The sum of all individual bag gross weights (e.g. 27.230 + 28.500 + 31.800 + 31.360 = 118.890 kg).
     * "rola_pcs": The sum of rola counts across all bags (e.g. 59 + 60 + 67 + 58 = 244 pcs).
     * "tare_deduction_kg" / "slipTareTotal": The deduction/tare weight written with a minus sign or labeled "Less", "Deduction", "Tare", or "બાદ" (e.g. -50.020 kg).
     * "net_kasab_kg" / "slipNetTotal": The net raw Kasab weight (Gross minus deduction, e.g. 118.890 - 50.020 = 68.870 kg or 68.470 kg as written on slip).
     * "bags_count": The total number of individual bags (e.g. 4).

2. HANDWRITTEN NUMBER NORMALIZATION:
   - Recognize Indian handwriting conventions (Gujarati/Hindi/English numbers).
   - Check totals: Sum of bag weights should match the subtotal written before the deduction line.

3. STRICT FIELD TYPES:
   - All weights must be numbers in kilograms (kg) with up to 3 decimal places.
   - All counts (rola_pcs, bags_count) must be positive integers.${partyPromptSection}`;
}

export function getInwardUserPrompt(): string {
  return `Parse this raw Kasab receiving delivery slip image into JSON strictly matching the provided schema.
Extract:
1. "party_name": Supplier/Party name from header.
2. "challan_no": Delivery slip number.
3. "date": Date in YYYY-MM-DD.
4. "bags": Array of individual bags listed in the upper section before the total line. Each item MUST have "bag_number", "gross_weight", "rola", "twist", and "color".
5. "gross_kg": Subtotal gross weight (sum of all bags).
6. "tare_deduction_kg": Tare deduction weight subtracted.
7. "net_kasab_kg": Net weight after deduction.
8. "rola_pcs": Total rola pieces.
9. "bags_count": Number of bags.

EXAMPLE OUTPUT FORMAT:
{
  "party_name": "Vijay bhai",
  "challan_no": "489",
  "date": "2026-10-29",
  "bags": [
    { "bag_number": 1, "gross_weight": 27.230, "rola": 59, "twist": "S", "color": "M.gold", "spool_type": "NORMAL" },
    { "bag_number": 2, "gross_weight": 28.500, "rola": 60, "twist": "S", "color": "M.gold", "spool_type": "NORMAL" },
    { "bag_number": 3, "gross_weight": 31.800, "rola": 67, "twist": "S", "color": "M.gold", "spool_type": "NORMAL" },
    { "bag_number": 4, "gross_weight": 31.360, "rola": 58, "twist": "S", "color": "M.gold", "spool_type": "NORMAL" }
  ],
  "gross_kg": 118.890,
  "tare_deduction_kg": 50.020,
  "net_kasab_kg": 68.870,
  "rola_pcs": 244,
  "bags_count": 4
}`;
}

export function getOutwardSystemInstruction(partyPromptSection: string): string {
  return `You are an expert OCR parser for Indian textile delivery challans and job-work receipts for "ValManager (Jari Kasab & Val Portal)".
You analyze handwritten delivery slips for FINISHED GOODS OUTWARD (Val dispatches and empty rola returns to parties like Ashok bhai, Vijay bhai, etc. in Surat/Gujarat/India).

CRITICAL PARSING & MULTI-SECTION EXTRACTION RULES FOR OUTWARD CHALLANS:

1. DUAL-SECTION STRUCTURE OF OUTWARD CHALLANS:
   - SECTION 1: FINISHED VAL GOODS (Upper table, rows 1-10):
     * Each row with an individual bag weight represents a finished Val bag.
     * Extract into "val_bags" (or "bags") array.
     * Each bag has:
       - "bag_number": 1, 2, 3...
       - "gross": Gross scale weight of this bag in kg (e.g. 23.060, 20.330, 23.110, 23.780). If written without decimal (e.g. 23060), convert to kg (23.060).
       - "bungari": Count of bungari tubes/cones inside this bag (e.g. 12, 11).
       - "tar": Tar category (e.g. "10 Tar", "12 Tar").
       - "twist": Twist direction ("S" or "Z"). If written "C", treat as "S".
       - "rate": Job-work rate per kg (e.g. 20).
   - SECTION 2: EMPTY ROLA RETURNS (CRITICAL - Lower table, rows 11-15 or below subtotal divider):
     * Indian textile slips frequently record EMPTY ROLA TUBES returned by the job-worker at the bottom of the slip.
     * If there are rows at the bottom with weights and piece counts (e.g. "19.280 - 80", "16.500 - 72"), these MUST be extracted into the "empty_rola_bags" array!
     * Extract for each empty rola row:
       - "bag_number": 1, 2...
       - "gross": Weight in kg (e.g. 19.280, 16.500).
       - "rola": Piece count (e.g. 80, 72).
     * If the bottom section has NO entries, return empty_rola_bags as [].
   - SECTION 3: CALCULATION & SETTLEMENT SUMMARY (Rows at/near the subtotal line):
     * "slipGross" / "slipGrossTotal": Sum of finished val bag gross weights (e.g. 90.280).
     * "slipTare" / "slipTareTotal": Tare deduction for bungari tubes (e.g. 3.290 kg).
     * "slipNet" / "slipNetTotal": Net Val weight (Gross - Tare, e.g. 86.990 kg).
     * "slipRate": Rate per kg (e.g. 20).
     * "slipAmount" / "grand_total_amount": Final amount in INR (Net * Rate, e.g. 1740).
     * Store these summary values in the "settlement" object.${partyPromptSection}`;
}

export function getOutwardUserPrompt(): string {
  return `Parse this finished Val delivery challan image into JSON strictly matching the provided schema.

EXAMPLE OUTPUT FORMAT:
{
  "party_name": "Ashok bhai",
  "challan_no": "1042",
  "date": "2026-10-30",
  "dispatch_type": "VAL_FINISHED",
  "val_bags": [
    { "gross": 23.060, "bungari": 12, "tar": "12 Tar", "twist": "S", "rate": 20 },
    { "gross": 20.330, "bungari": 11, "tar": "10 Tar", "twist": "S", "rate": 20 },
    { "gross": 23.110, "bungari": 12, "tar": "12 Tar", "twist": "S", "rate": 20 },
    { "gross": 23.780, "bungari": 12, "tar": "12 Tar", "twist": "S", "rate": 20 }
  ],
  "empty_rola_bags": [
    { "gross": 19.280, "rola": 80 },
    { "gross": 16.500, "rola": 72 }
  ],
  "total_gross_weight": 90.280,
  "total_amount": 1740,
  "settlement": {
    "slipGross": 90.280,
    "slipTare": 3.290,
    "slipNet": 86.990,
    "slipRate": 20,
    "slipAmount": 1740
  }
}

RULES:
1. Extract the Party Name / Customer Name from "To M/s." or header into "party_name".
2. Extract the Challan Number from "Ch. No." into "challan_no".
3. Extract the Date into "date" (formatted as YYYY-MM-DD).
4. Each row in the upper table representing an individual finished bag must be an entry in "val_bags" (or "bags"):
   - "bag_number": 1, 2, 3...
   - "gross": Gross scale weight in kg (convert grams like 23060 to kg 23.060).
   - "bungari": Count of bungari tubes/cones/pcs (e.g., 12, 11).
   - "tar": Tar category (e.g. "10 Tar", "12 Tar").
   - "twist": Twist direction "S" or "Z" ("C" or "S" -> "S", "Z" -> "Z").
   - "rate": Job-work rate per kg (e.g. 20).
5. The rows with subtractions, totals, or calculations at the divider line are summary settlement calculations, NOT bags.
6. The bottom rows (rows 11-15 or below subtotal) with weights and rola piece counts are empty rola returns. Extract them into "empty_rola_bags":
   - "gross": scale weight in kg (e.g. 19.280)
   - "rola": rola count in pcs (e.g. 80)`;
}

