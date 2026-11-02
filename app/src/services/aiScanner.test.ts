import { describe, it, expect } from 'vitest';
import {
  parseChallanDate,
  parseTarAndTwist,
  sanitizeQualityTarLabel,
  normalizeExtractedData,
  INWARD_JSON_SCHEMA,
  OUTWARD_JSON_SCHEMA,
  DEFAULT_GEMINI_CANDIDATE_MODELS,
} from './aiScanner';
import { mapEmptyRolaBags } from '@/features/outward/sheets/NewDispatchModal';

describe('aiScanner parser and schemas', () => {
  describe('parseChallanDate', () => {
    it('parses D-M-YY format accurately into YYYY-MM-DD', () => {
      expect(parseChallanDate('2-10-26')).toBe('2026-10-02');
      expect(parseChallanDate('02/10/2026')).toBe('2026-10-02');
      expect(parseChallanDate('28-9-26')).toBe('2026-09-28');
      expect(parseChallanDate('15.04.26')).toBe('2026-04-15');
    });

    it('returns null for empty or invalid dates', () => {
      expect(parseChallanDate('')).toBeNull();
      expect(parseChallanDate(null)).toBeNull();
      expect(parseChallanDate('invalid-date')).toBeNull();
    });
  });

  describe('parseTarAndTwist', () => {
    it('extracts "10 Z" -> "10 Tar", "Z"', () => {
      const res = parseTarAndTwist('10 Z', '10', 'Z');
      expect(res.tar).toBe('10 Tar');
      expect(res.twist).toBe('Z');
    });

    it('extracts "12 Z" -> "12 Tar", "Z"', () => {
      const res = parseTarAndTwist('12 Z', '12', 'Z');
      expect(res.tar).toBe('12 Tar');
      expect(res.twist).toBe('Z');
    });

    it('extracts "12 S" -> "12 Tar", "S"', () => {
      const res = parseTarAndTwist('12 S', '12', 'S');
      expect(res.tar).toBe('12 Tar');
      expect(res.twist).toBe('S');
    });

    it('extracts "10 S+Z" -> "10 Tar", "S+Z"', () => {
      const res = parseTarAndTwist('10 S+Z', '10', 'S+Z');
      expect(res.tar).toBe('10 Tar');
      expect(res.twist).toBe('S+Z');
    });
  });

  describe('sanitizeQualityTarLabel', () => {
    it('sanitizes duplicate string formatting like "12 Tar Tar" into "12 Tar"', () => {
      expect(sanitizeQualityTarLabel('12 Tar Tar')).toBe('12 Tar');
      expect(sanitizeQualityTarLabel('12 Tar')).toBe('12 Tar');
      expect(sanitizeQualityTarLabel('12')).toBe('12 Tar');
      expect(sanitizeQualityTarLabel('10 Tar Tar Tar')).toBe('10 Tar');
      expect(sanitizeQualityTarLabel(null)).toBe('10 Tar');
      expect(sanitizeQualityTarLabel(undefined)).toBe('10 Tar');
      expect(sanitizeQualityTarLabel('')).toBe('10 Tar');
    });
  });

  describe('INWARD_JSON_SCHEMA', () => {
    it('contains bags array with gross, rola, twist, and rolaType properties', () => {
      const props = INWARD_JSON_SCHEMA.properties;
      expect(props.bags).toBeDefined();
      expect(props.bags.type).toBe('ARRAY');
      const bagProps = props.bags.items.properties;
      expect(bagProps.gross).toBeDefined();
      expect(bagProps.rola).toBeDefined();
      expect(bagProps.twist).toBeDefined();
      expect(bagProps.rolaType).toBeDefined();
      expect(bagProps.color).toBeDefined();
    });
  });

  describe('OUTWARD_JSON_SCHEMA', () => {
    it('contains bags array, val_bags array, empty_rola_bags array, and settlement object in schema properties', () => {
      const props = OUTWARD_JSON_SCHEMA.properties;
      expect(props.party_name).toBeDefined();
      expect(props.challan_no).toBeDefined();
      expect(props.date).toBeDefined();
      expect(props.val_bags).toBeDefined();
      expect(props.val_bags.type).toBe('ARRAY');
      expect(props.empty_rola_bags).toBeDefined();
      expect(props.empty_rola_bags.type).toBe('ARRAY');
      const emptyRolaProps = props.empty_rola_bags.items.properties;
      expect(emptyRolaProps.gross).toBeDefined();
      expect(emptyRolaProps.rola).toBeDefined();
      expect(OUTWARD_JSON_SCHEMA.required).toContain('date');
      expect(OUTWARD_JSON_SCHEMA.required).toContain('empty_rola_bags');

      expect(props.bags).toBeDefined();
      expect(props.bags.type).toBe('ARRAY');
      const bagProps = props.bags.items.properties;
      expect(bagProps.bag_number).toBeDefined();
      expect(bagProps.gross_weight).toBeDefined();
      expect(bagProps.tare_weight).toBeDefined();
      expect(bagProps.net_weight).toBeDefined();
      expect(bagProps.bungari).toBeDefined();
      expect(bagProps.description).toBeDefined();
      expect(props.settlement).toBeDefined();
      expect(props.settlement.type).toBe('OBJECT');
      expect(props.settlement.properties.slipGross).toBeDefined();
      expect(props.settlement.properties.slipTare).toBeDefined();
      expect(props.settlement.properties.slipNet).toBeDefined();
      expect(props.settlement.properties.slipRate).toBeDefined();
      expect(props.settlement.properties.slipAmount).toBeDefined();
    });
  });

  describe('normalizeExtractedData with handwritten challan data', () => {
    it('correctly maps party_name, challan_no, date, and bags array', () => {
      const rawAiResponse = {
        party_name: 'Ashok bhai',
        challan_no: '42',
        date: '7-10-24',
        bags: [
          {
            bag_number: 1,
            gross_weight: 22450,
            tare_weight: 840,
            net_weight: 21610,
            bungari: 12,
            description: '10 C',
          },
          {
            bag_number: 2,
            gross_weight: 19650,
            tare_weight: 770,
            net_weight: 18880,
            bungari: 11,
            description: '10 S',
          },
        ],
        settlement: {
          slipGross: 42.1,
          slipTare: 1.61,
          slipNet: 40.49,
          slipRate: 20,
          slipAmount: 809,
        },
      };

      const result = normalizeExtractedData(rawAiResponse, 'OUTWARD');
      expect(result.party_name).toBe('Ashok bhai');
      expect(result.challan_no).toBe('42');
      expect(result.date).toBe('2024-10-07');
      expect(result.bags).toBeDefined();
      expect(result.bags).toHaveLength(2);

      const bag1 = result.bags![0] as any;
      expect(bag1.gross).toBe(22.45);
      expect(bag1.bungari).toBe(12);
      expect(bag1.tar).toBe('10 Tar');
      expect(bag1.twist).toBe('S');

      const bag2 = result.bags![1] as any;
      expect(bag2.gross).toBe(19.65);
      expect(bag2.bungari).toBe(11);
      expect(bag2.tar).toBe('10 Tar');
      expect(bag2.twist).toBe('S');
    });

    it('filters out total summary rows mistakenly included in bags array', () => {
      const rawWithSummaryRow = {
        party_name: 'Ashok bhai',
        challan_no: '42',
        date: '2026-10-07',
        bags: [
          { bag_number: 1, gross_weight: 22.45, bungari: 12, tar: '10 Tar', twist: 'S' },
          { bag_number: 2, gross_weight: 19.65, bungari: 11, tar: '10 Tar', twist: 'S' },
          { bag_number: 3, gross_weight: 42.10, bungari: 23, description: 'Total 42100' }, // Sum of row 1 + row 2
        ],
        total_gross_weight: 42.10,
        settlement: {
          slipGross: 42.1,
          slipTare: 1.61,
          slipNet: 40.49,
          slipRate: 20,
          slipAmount: 809,
        },
      };

      const result = normalizeExtractedData(rawWithSummaryRow, 'OUTWARD');
      expect(result.bags).toHaveLength(2);
      expect((result.bags![0] as any).gross).toBe(22.45);
      expect((result.bags![1] as any).gross).toBe(19.65);
    });

    it('deduces bungari count from tare weight if bungari is missing or 0', () => {
      const rawMissingBungari = {
        date: '2026-10-07',
        bags: [
          { bag_number: 1, gross_weight: 22.45, bungari: 0, tare_weight: 0.84, tar: '10 Tar', twist: 'S' },
        ],
      };

      const result = normalizeExtractedData(rawMissingBungari, 'OUTWARD');
      expect(result.bags).toHaveLength(1);
      // 0.840 kg / 0.070 kg = 12 bungari
      expect((result.bags![0] as any).bungari).toBe(12);
    });

    it('correctly normalizes INWARD multi-bag challan data and filters subtotal/deduction rows', () => {
      const rawInwardData = {
        challan_no: '489',
        date: '29/10/2026',
        party_name: 'Vijay bhai (Ishwar Nagar)',
        gross_kg: 118.890,
        tare_deduction_kg: 50.020,
        net_kasab_kg: 68.870,
        rola_pcs: 244,
        bags_count: 4,
        bags: [
          { bag_number: 1, gross_weight: 27.230, rola: 59, twist: 'S', color: 'M.gold' },
          { bag_number: 2, gross_weight: 28.500, rola: 60, twist: 'S', color: 'M.gold' },
          { bag_number: 3, gross_weight: 31.800, rola: 67, twist: 'S', color: 'M.gold' },
          { bag_number: 4, gross_weight: 31.360, rola: 58, twist: 'Z', color: 'M.gold' },
          // Mistakenly included summary total row
          { bag_number: 5, gross_weight: 118.890, rola: 244, description: 'Sum Total 118.890' },
          // Mistakenly included tare deduction row
          { bag_number: 6, gross_weight: 50.020, description: 'Less 50.020' },
        ],
      };

      const result = normalizeExtractedData(rawInwardData, 'INWARD');
      expect(result.challan_no).toBe('489');
      expect(result.date).toBe('2026-10-29');
      expect(result.party_name).toBe('Vijay bhai (Ishwar Nagar)');
      expect(result.bags).toBeDefined();
      expect(result.bags).toHaveLength(4);

      const bags = result.bags as any[];
      expect(bags[0].gross).toBe(27.23);
      expect(bags[0].rola).toBe(59);
      expect(bags[0].twist).toBe('S');
      expect(bags[0].color).toBe('M.gold');

      expect(bags[1].gross).toBe(28.5);
      expect(bags[1].rola).toBe(60);
      expect(bags[1].twist).toBe('S');

      expect(bags[2].gross).toBe(31.8);
      expect(bags[2].rola).toBe(67);
      expect(bags[2].twist).toBe('S');

      expect(bags[3].gross).toBe(31.36);
      expect(bags[3].rola).toBe(58);
      expect(bags[3].twist).toBe('Z');

      expect(result.inward_data?.gross_kg).toBe(118.89);
      expect(result.inward_data?.tare_deduction_kg).toBe(50.02);
      expect(result.inward_data?.net_kasab_kg).toBe(68.87);
      expect(result.inward_data?.rola_pcs).toBe(244);
      expect(result.inward_data?.bags_count).toBe(4);
    });

    it('extracts rola count and twist from compound string like "59-S" or "58 Z"', () => {
      const rawWithCompoundRola = {
        challan_no: '489',
        date: '2026-10-29',
        party_name: 'Vijay bhai',
        bags: [
          { bag_number: 1, gross_weight: 27.23, rola: '59-S', color: 'M.gold' },
          { bag_number: 2, gross_weight: 31.36, rola: '58 Z', color: 'M.gold' },
        ],
      };

      const result = normalizeExtractedData(rawWithCompoundRola, 'INWARD');
      expect(result.bags).toHaveLength(2);
      const bags = result.bags as any[];
      expect(bags[0].rola).toBe(59);
      expect(bags[0].twist).toBe('S');
      expect(bags[1].rola).toBe(58);
      expect(bags[1].twist).toBe('Z');
    });

    it('handles partial challan slip: returns twist: null and color: null when not handwritten', () => {
      const partialChallanRaw = {
        challan_no: '102',
        date: '2026-10-30',
        party_name: 'Dinesh bhai',
        bags: [
          { bag_number: 1, gross_weight: 25.40, rola: 50 },
          { bag_number: 2, gross_weight: 26.10, rola: 52, twist: null, color: null },
        ],
      };

      const result = normalizeExtractedData(partialChallanRaw, 'INWARD');
      expect(result.bags).toHaveLength(2);
      const bags = result.bags as any[];
      expect(bags[0].twist).toBeNull();
      expect(bags[0].color).toBeNull();
      expect(bags[1].twist).toBeNull();
      expect(bags[1].color).toBeNull();
    });

    it('normalizes 5-digit raw weights (e.g. 38730 -> 38.730)', () => {
      const rawWithIntegerWeights = {
        challan_no: '55',
        date: '2026-10-31',
        party_name: 'Ketan bhai',
        gross_kg: 77460,
        tare_deduction_kg: 10400,
        net_kasab_kg: 67060,
        bags: [
          { bag_number: 1, gross_weight: 38730, rola: 80 },
          { bag_number: 2, gross: 38730, rola: 80 },
        ],
      };

      const result = normalizeExtractedData(rawWithIntegerWeights, 'INWARD');
      expect(result.inward_data?.gross_kg).toBe(77.46);
      expect(result.inward_data?.tare_deduction_kg).toBe(10.4);
      expect(result.inward_data?.net_kasab_kg).toBe(67.06);

      expect(result.bags).toHaveLength(2);
      const bags = result.bags as any[];
      expect(bags[0].gross).toBe(38.73);
      expect(bags[1].gross).toBe(38.73);
    });

    it('detects spool_type as BIG when Gujarati note "મોટા" appears next to a line', () => {
      const rawWithGujaratiMota = {
        challan_no: '99',
        date: '2026-10-31',
        party_name: 'Suresh bhai',
        bags: [
          { bag_number: 1, gross_weight: 35.50, rola: 70, description: 'મોટા રોલા' },
          { bag_number: 2, gross_weight: 30.20, rola: 60, quality: 'Silver મોટા' },
          { bag_number: 3, gross_weight: 28.00, rola: 55, color: 'Clear' },
        ],
      };

      const result = normalizeExtractedData(rawWithGujaratiMota, 'INWARD');
      expect(result.bags).toHaveLength(3);
      const bags = result.bags as any[];
      expect(bags[0].spool_type).toBe('BIG');
      expect(bags[0].rolaType).toBe('BIG');
      expect(bags[0].sizeType).toBe('Big');

      expect(bags[1].spool_type).toBe('BIG');
      expect(bags[1].rolaType).toBe('BIG');
      expect(bags[1].sizeType).toBe('Big');

      expect(bags[2].spool_type).toBe('NORMAL');
      expect(bags[2].rolaType).toBe('NORM');
      expect(bags[2].sizeType).toBe('Norm');
      expect(bags[2].color).toBe('Clear');
    });

    it('correctly extracts Outward Delivery Challan #73 finished val bags and lower empty rola returns', () => {
      const challan73RawAiResponse = {
        party_name: 'Ashok bhai',
        challan_no: '73',
        date: '2026-10-07',
        val_bags: [
          { gross: 23.060, bungari: 12, tar: '12 Tar', twist: 'S', rate: 20 },
          { gross: 20.330, bungari: 11, tar: '10 Tar', twist: 'S', rate: 20 },
          { gross: 23.110, bungari: 12, tar: '12 Tar', twist: 'S', rate: 20 },
          { gross: 23.780, bungari: 12, tar: '12 Tar', twist: 'S', rate: 20 },
        ],
        empty_rola_bags: [
          { gross: 19.280, rola: 80 },
          { gross: 16.500, rola: 72 },
        ],
      };

      const result = normalizeExtractedData(challan73RawAiResponse, 'OUTWARD');
      expect(result.party_name).toBe('Ashok bhai');
      expect(result.challan_no).toBe('73');
      expect(result.date).toBe('2026-10-07');

      // Finished Val bags
      expect(result.outward_data?.val_bags).toHaveLength(4);
      expect(result.outward_data?.bags).toHaveLength(4);
      expect((result.outward_data?.val_bags?.[0] as any).gross).toBe(23.06);
      expect((result.outward_data?.val_bags?.[0] as any).bungari).toBe(12);
      expect((result.outward_data?.val_bags?.[1] as any).gross).toBe(20.33);
      expect((result.outward_data?.val_bags?.[2] as any).gross).toBe(23.11);
      expect((result.outward_data?.val_bags?.[3] as any).gross).toBe(23.78);

      // Empty Rola returns
      expect(result.outward_data?.empty_rola_bags).toBeDefined();
      expect(result.outward_data?.empty_rola_bags).toHaveLength(2);
      expect(result.empty_rola_bags).toHaveLength(2);

      const lot1 = result.outward_data?.empty_rola_bags?.[0];
      expect(lot1?.gross).toBe(19.28);
      expect(lot1?.rola).toBe(80);

      const lot2 = result.outward_data?.empty_rola_bags?.[1];
      expect(lot2?.gross).toBe(16.5);
      expect(lot2?.rola).toBe(72);

      // Total empty rola summary calculations
      expect(result.outward_data?.rola_weight_kg).toBe(35.78);
      expect(result.outward_data?.rola_returned_pcs).toBe(152);

      // Modal state population handler
      const mappedEmptyRola = mapEmptyRolaBags(challan73RawAiResponse);
      expect(mappedEmptyRola).toHaveLength(2);
      expect(mappedEmptyRola[0]).toEqual({ gross: 19.28, rola: 80 });
      expect(mappedEmptyRola[1]).toEqual({ gross: 16.5, rola: 72 });
    });

    it('correctly filters subtotal row and supports weight_kg in empty rola bags', () => {
      const challanWithSubtotal = {
        party_name: 'Harish Sheladiya',
        challan_no: '73',
        date: '2026-10-29',
        empty_rola_bags: [
          { weight_kg: 19.280, rola: 80 },
          { weight_kg: 16.500, rola: 72 },
          { weight_kg: 35.780, rola: 152, is_total: true, description: 'Total 152' },
        ],
      };

      const result = normalizeExtractedData(challanWithSubtotal, 'OUTWARD');
      expect(result.empty_rola_bags).toHaveLength(2);
      expect(result.empty_rola_bags?.[0]?.gross).toBe(19.28);
      expect(result.empty_rola_bags?.[0]?.rola).toBe(80);
      expect(result.empty_rola_bags?.[1]?.gross).toBe(16.5);
      expect(result.empty_rola_bags?.[1]?.rola).toBe(72);

      const mapped = mapEmptyRolaBags(challanWithSubtotal);
      expect(mapped).toHaveLength(2);
      expect(mapped[0]).toEqual({ gross: 19.28, rola: 80 });
      expect(mapped[1]).toEqual({ gross: 16.5, rola: 72 });
    });
  });

  describe('DEFAULT_GEMINI_CANDIDATE_MODELS', () => {
    it('prioritizes gemini-3.5-flash-lite as the primary candidate model', () => {
      expect(DEFAULT_GEMINI_CANDIDATE_MODELS[0]).toBe('gemini-3.5-flash-lite');
    });

    it('strictly does not contain deprecated gemini-2.5 models', () => {
      expect(DEFAULT_GEMINI_CANDIDATE_MODELS).not.toContain('gemini-2.5-flash');
      expect(DEFAULT_GEMINI_CANDIDATE_MODELS).not.toContain('gemini-2.5-flash-lite');
    });
  });
});
