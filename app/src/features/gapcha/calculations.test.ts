import { describe, it, expect } from 'vitest';
import { calcBatchGapcha, calcRemainingGapcha, calcSaleAmount, computeOverallGapchaStats } from './calculations';
import type { Receipt } from '../receiving/types';
import type { Dispatch } from '../dispatch/types';
import type { GapchaSale, GapchaReconciliation } from './types';

describe('calcBatchGapcha', () => {
  it('should calculate gapcha correctly', () => {
    expect(calcBatchGapcha(10, 9)).toBe(1);
    expect(calcBatchGapcha(10, 8, 1)).toBe(1);
    expect(calcBatchGapcha(10, 11)).toBe(0); // Cannot be negative
  });
});

describe('calcRemainingGapcha', () => {
  it('should calculate remaining gapcha correctly', () => {
    expect(calcRemainingGapcha(10, 5)).toBe(5);
    expect(calcRemainingGapcha(10, 15)).toBe(0); // Cannot be negative
  });
});

describe('calcSaleAmount', () => {
  it('should calculate sale amount correctly', () => {
    expect(calcSaleAmount(10, 50)).toBe(500);
    expect(calcSaleAmount(0, 50)).toBeNull();
    expect(calcSaleAmount(10, 0)).toBeNull();
  });
});

describe('computeOverallGapchaStats', () => {
  it('should aggregate gapcha stats correctly', () => {
    const receipts: Receipt[] = [
      { id: '1', date: '2026-09-01', net_weight: 10, party_id: 'p1', gross_weight: 12, tare_weight: 2, rola_count: 10, challan_no: null, color: null, created_at: '' },
    ];
    const dispatches: Dispatch[] = [
      { id: '2', date: '2026-09-02', net_val_weight: 9, dispatch_type: 'Val', bungari_count: 10, bore_gross_weight: 10, party_id: 'p1', amount: null, rate_per_kg: null, created_at: '' },
    ];
    const sales: GapchaSale[] = [
      { id: '3', date: '2026-09-03', weight_kg: 0.5, amount: 50, rate_per_kg: 100, party_id: null, buyer_name: 'test', note: null, created_at: '' },
    ];
    const recons: GapchaReconciliation[] = [
      { id: '4', date: '2026-09-04', input_kasab_weight: 10, output_val_weight: 9, output_kali_weight: 0, reconciled_output: 9, gapcha_weight: 1, party_id: 'p1', note: null, created_at: '' },
    ];

    const stats = computeOverallGapchaStats(receipts, dispatches, sales, recons);

    expect(stats.totalReceivedNetWeight).toBe(10);
    expect(stats.totalReturnedNetWeight).toBe(9);
    expect(stats.unprocessedKasabWeight).toBe(1);
    expect(stats.reconciledInputWeight).toBe(10);
    expect(stats.reconciledOutputWeight).toBe(9);
    expect(stats.totalGapchaGenerated).toBe(1);
    expect(stats.totalGapchaSold).toBe(0.5);
    expect(stats.remainingGapchaWeight).toBe(0.5);
    expect(stats.totalGapchaRevenue).toBe(50);
  });
});
