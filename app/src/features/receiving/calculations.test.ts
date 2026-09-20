import { describe, it, expect } from 'vitest';
import { isBigRola, calcReceiptNetWeight } from './calculations';

describe('isBigRola', () => {
  it('should return false if rolaCount is 0', () => {
    expect(isBigRola(1, 0, 200)).toBe(false);
  });

  it('should subtract bungari weight if tare is >= bungari weight', () => {
    const tare = 0.5; // 500g

    const rolaCount = 2; // (500 - 70) = 430g / 2 = 215g per rola
    // 215g is exactly 15g above 200g. 215 > 200 + 15 is false (it's equal).
    expect(isBigRola(tare, rolaCount, 200)).toBe(false);
    
    // Make it 216g per rola -> 216 * 2 + 70 = 502g = 0.502kg
    expect(isBigRola(0.502, rolaCount, 200)).toBe(true); // 216 > 215
  });

  it('should not subtract bungari weight if tare is < bungari weight', () => {
    // Highly unlikely in real scenario but tests the exact logic
    const tare = 0.05; // 50g (less than 70g bungari)
    const rolaCount = 1; // 50g per rola
    expect(isBigRola(tare, rolaCount, 20)).toBe(true); // 50 > 20 + 15
  });
});

describe('calcReceiptNetWeight', () => {
  it('should calculate net weight correctly with default values', () => {
    // Gross: 10kg, 10 rolas (200g each = 2kg), 1 bori (100g = 0.1kg). Tare = 2.1kg
    // Net = 10 - 2.1 = 7.9kg
    expect(calcReceiptNetWeight(10, 10)).toBe(7.9);
  });

  it('should calculate net weight correctly with custom values', () => {
    // Gross: 10kg, 10 rolas (250g each = 2.5kg), 2 boris (50g each = 0.1kg). Tare = 2.6kg
    // Net = 10 - 2.6 = 7.4kg
    expect(calcReceiptNetWeight(10, 10, 250, 2, 50)).toBe(7.4);
  });

  it('should not return negative net weight', () => {
    // Gross: 1kg, 10 rolas (200g each = 2kg). Tare = 2.1kg
    // Net should be 0, not -1.1
    expect(calcReceiptNetWeight(1, 10)).toBe(0);
  });
});
