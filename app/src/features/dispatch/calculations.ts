export const STANDARD_BUNGARI_WEIGHT_G = 70;

export function calcDispatchNetWeight(
  boreGrossKg: number,
  bungariCount: number = 0,
  bungariWeightG: number = STANDARD_BUNGARI_WEIGHT_G,
  dispatchType: string = 'Val'
): number {
  const gross = Number(boreGrossKg) || 0;
  if (dispatchType === 'Kali' || dispatchType === 'Rola') {
    return gross;
  }
  const bCount = Number(bungariCount) || 0;
  const tare = (bCount * (Number(bungariWeightG) || STANDARD_BUNGARI_WEIGHT_G)) / 1000;
  return Math.max(0, gross - tare);
}
