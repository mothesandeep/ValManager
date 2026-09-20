import type { Receipt } from '../receiving/types';
import type { Dispatch } from '../dispatch/types';
import type { GapchaSale, GapchaReconciliation, OverallGapchaStats } from './types';

export function calcBatchGapcha(
  inputKasabNet: number,
  outputValNet: number,
  outputKaliNet: number = 0
): number {
  const input = Number(inputKasabNet) || 0;
  const output = (Number(outputValNet) || 0) + (Number(outputKaliNet) || 0);
  return Math.round(Math.max(0, input - output) * 1000) / 1000;
}

export function calcRemainingGapcha(
  gapchaGenerated: number,
  gapchaSold: number
): number {
  const gen = Number(gapchaGenerated) || 0;
  const sold = Number(gapchaSold) || 0;
  return Math.round(Math.max(0, gen - sold) * 1000) / 1000;
}

export function calcSaleAmount(
  weightKg: number,
  ratePerKg: number | null | undefined
): number | null {
  const wt = Number(weightKg) || 0;
  const rate = Number(ratePerKg);
  if (isNaN(rate) || rate <= 0 || wt <= 0) return null;
  return Math.round(wt * rate * 100) / 100;
}

export function computeOverallGapchaStats(
  receipts: Receipt[],
  dispatches: Dispatch[],
  gapchaSales: GapchaSale[],
  reconciliations: GapchaReconciliation[] = [],
  selectedMonth?: string | null
): OverallGapchaStats {
  const filterByMonth = <T extends { date?: string | null }>(items: T[]): T[] => {
    if (!selectedMonth || selectedMonth === 'all') return items;
    return items.filter((item) => item.date && item.date.startsWith(selectedMonth));
  };

  const mReceipts = filterByMonth(receipts);
  const mDispatches = filterByMonth(dispatches);
  const mSales = filterByMonth(gapchaSales);
  const mRecons = filterByMonth(reconciliations);

  const totalReceivedNetWeight = mReceipts.reduce(
    (sum, r) => sum + (Number(r.net_weight) || 0),
    0
  );

  const totalReturnedNetWeight = mDispatches.reduce((sum, d) => {
    const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola';
    const wt = isRola
      ? Number(d.bore_gross_weight) || 0
      : Number(d.net_val_weight) || 0;
    return sum + wt;
  }, 0);

  const reconciledInputWeight = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.input_kasab_weight) || 0),
    0
  );

  const reconciledOutputWeight = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.reconciled_output) || 0),
    0
  );

  const unprocessedKasabWeight = Math.max(
    0,
    totalReceivedNetWeight - totalReturnedNetWeight
  );

  const totalGapchaGenerated = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
    0
  );

  const totalGapchaSold = mSales.reduce(
    (sum, s) => sum + (Number(s.weight_kg) || 0),
    0
  );

  const remainingGapchaWeight = Math.max(
    0,
    totalGapchaGenerated - totalGapchaSold
  );

  const totalGapchaRevenue = mSales.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  );

  const round3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

  return {
    totalReceivedNetWeight: round3(totalReceivedNetWeight),
    unprocessedKasabWeight: round3(unprocessedKasabWeight),
    reconciledInputWeight: round3(reconciledInputWeight),
    reconciledOutputWeight: round3(reconciledOutputWeight),
    totalReturnedNetWeight: round3(totalReturnedNetWeight),
    totalGapchaGenerated: round3(totalGapchaGenerated),
    totalGapchaSold: round3(totalGapchaSold),
    remainingGapchaWeight: round3(remainingGapchaWeight),
    totalGapchaRevenue: Math.round(totalGapchaRevenue * 100) / 100,
  };
}
