import { describe, it, expect } from 'vitest';
import { calcDispatchNetWeight } from './calculations';

describe('calcDispatchNetWeight', () => {
  it('should calculate net weight for Val with default bungari weight', () => {
    // 10kg gross, 10 bungaris (70g each = 0.7kg) -> Net = 9.3kg
    expect(calcDispatchNetWeight(10, 10)).toBe(9.3);
  });

  it('should calculate net weight for Val with custom bungari weight', () => {
    // 10kg gross, 10 bungaris (50g each = 0.5kg) -> Net = 9.5kg
    expect(calcDispatchNetWeight(10, 10, 50)).toBe(9.5);
  });

  it('should not subtract tare for Kali', () => {
    // 10kg gross, 10 bungaris -> Net = 10kg
    expect(calcDispatchNetWeight(10, 10, 70, 'Kali')).toBe(10);
  });

  it('should not subtract tare for Rola', () => {
    // 10kg gross, 10 bungaris -> Net = 10kg
    expect(calcDispatchNetWeight(10, 10, 70, 'Rola')).toBe(10);
  });

  it('should not return negative weight', () => {
    expect(calcDispatchNetWeight(0.5, 10)).toBe(0);
  });
});
