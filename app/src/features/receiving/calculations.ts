import { BUNGARI_WEIGHT_KG } from '../../constants'

export const STANDARD_ROLA_WEIGHT_G = 200;
export const STANDARD_BORI_WEIGHT_G = 100;

export function isBigRola(tareWeightKg: number, rolaCount: number, partyDefaultRolaWeightG: number): boolean {
  if (rolaCount <= 0) return false;
  const t = Number(tareWeightKg) || 0;
  const twb = t >= BUNGARI_WEIGHT_KG ? t - BUNGARI_WEIGHT_KG : t;
  const prg = Math.round((twb * 1000) / rolaCount);
  return prg > partyDefaultRolaWeightG + 15;
}

export function calcReceiptNetWeight(
  grossKg: number,
  rolaCount: number,
  perRolaGrams: number = STANDARD_ROLA_WEIGHT_G,
  boriCount: number = 1,
  boriWeightG: number = STANDARD_BORI_WEIGHT_G
): number {
  const g = Number(grossKg) || 0;
  const r = Number(rolaCount) || 0;
  const b = Number(boriCount) || 0;
  const rolaTareG = r * (Number(perRolaGrams) || STANDARD_ROLA_WEIGHT_G);
  const boriTareG = b * (Number(boriWeightG) || STANDARD_BORI_WEIGHT_G);
  const tare = (rolaTareG + boriTareG) / 1000;
  return Math.max(0, g - tare);
}
