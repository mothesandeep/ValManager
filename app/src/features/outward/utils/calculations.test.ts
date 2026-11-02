import { describe, it, expect } from 'vitest'
import { calcDispatchNetWeight, distributeDispatchSettlement } from './calculations'

describe('calcDispatchNetWeight', () => {
  it('should calculate net weight for Val with default bungari weight', () => {
    // 10kg gross, 10 bungaris (70g each = 0.7kg) -> Net = 9.3kg
    expect(calcDispatchNetWeight(10, 10)).toBe(9.3)
  })

  it('should calculate net weight for Val with custom bungari weight', () => {
    // 10kg gross, 10 bungaris (50g each = 0.5kg) -> Net = 9.5kg
    expect(calcDispatchNetWeight(10, 10, 50)).toBe(9.5)
  })

  it('should not subtract tare for Kali', () => {
    // 10kg gross, 10 bungaris -> Net = 10kg
    expect(calcDispatchNetWeight(10, 10, 70, 'Kali')).toBe(10)
  })

  it('should not subtract tare for Rola', () => {
    // 10kg gross, 10 bungaris -> Net = 10kg
    expect(calcDispatchNetWeight(10, 10, 70, 'Rola')).toBe(10)
  })

  it('should not return negative weight', () => {
    expect(calcDispatchNetWeight(0.5, 10)).toBe(0)
  })
})

describe('distributeDispatchSettlement', () => {
  it('correctly calculates multi-bag Val challan without extra bori bag tare', () => {
    // Challan #42 scenario:
    // Bag 1: 22.450 kg gross, 12 bungari @ 70g = 0.840 kg tare -> Net 21.610 kg
    // Bag 2: 19.650 kg gross, 11 bungari @ 70g = 0.770 kg tare -> Net 18.880 kg
    // Total tare = 1.610 kg, Total Net = 40.490 kg
    const result = distributeDispatchSettlement({
      dispatchType: 'Val',
      defaultBungariWeightG: 70,
      bags: [
        { grossKg: 22.450, bungariCount: 12, tar: 10, rate: 20 },
        { grossKg: 19.650, bungariCount: 11, tar: 10, rate: 20 },
      ],
      totalTareKg: 1.610,
      totalNetValKg: 40.490,
      grandTotalAmount: 810,
    })

    expect(result).toHaveLength(2)
    expect(result[0].tareKg).toBe(0.840)
    expect(result[0].netKg).toBe(21.610)
    expect(result[0].amount).toBe(432)

    expect(result[1].tareKg).toBe(0.770)
    expect(result[1].netKg).toBe(18.880)
    expect(result[1].amount).toBe(378)

    // Sum checks
    const totalTare = result.reduce((s, b) => s + b.tareKg, 0)
    const totalNet = result.reduce((s, b) => s + (b.netKg || 0), 0)
    const totalAmt = result.reduce((s, b) => s + (b.amount || 0), 0)

    expect(Math.round(totalTare * 1000) / 1000).toBe(1.610)
    expect(Math.round(totalNet * 1000) / 1000).toBe(40.490)
    expect(totalAmt).toBe(810)
  })

  it('proportionally distributes slip total amount (₹809) matching exact rupee', () => {
    // When user selects "Use Slip [₹809]" instead of calculated ₹810
    const result = distributeDispatchSettlement({
      dispatchType: 'Val',
      defaultBungariWeightG: 70,
      bags: [
        { grossKg: 22.450, bungariCount: 12, tar: 10, rate: 20 },
        { grossKg: 19.650, bungariCount: 11, tar: 10, rate: 20 },
      ],
      totalTareKg: 1.610,
      totalNetValKg: 40.490,
      grandTotalAmount: 809,
    })

    expect(result[0].amount).toBe(432)
    expect(result[1].amount).toBe(377)

    const totalAmt = result.reduce((s, b) => s + (b.amount || 0), 0)
    expect(totalAmt).toBe(809)
  })

  it('preserves verified bag-level tareKg and netKg if already provided', () => {
    const result = distributeDispatchSettlement({
      dispatchType: 'Val',
      bags: [
        { grossKg: 22.450, bungariCount: 12, tareKg: 0.840, netKg: 21.610, rate: 20 },
        { grossKg: 19.650, bungariCount: 11, tareKg: 0.770, netKg: 18.880, rate: 20 },
      ],
      grandTotalAmount: 809,
    })

    expect(result[0].netKg).toBe(21.610)
    expect(result[1].netKg).toBe(18.880)
    expect(result[0].amount! + result[1].amount!).toBe(809)
  })

  it('reconciles gross - tare = net invariant when totalNetValKg distributes a difference', () => {
    const result = distributeDispatchSettlement({
      dispatchType: 'Val',
      bags: [
        { grossKg: 20.0, bungariCount: 10, tareKg: 0.7, netKg: 19.3, rate: 25 },
        { grossKg: 20.0, bungariCount: 10, tareKg: 0.7, netKg: 19.3, rate: 25 },
      ],
      totalNetValKg: 38.5, // 38.6 - 38.5 = -0.1kg difference on last bag
    })

    expect(result[1].netKg).toBe(19.2)
    expect(result[1].tareKg).toBe(0.8)
    // Invariant check: gross - tare = net
    for (const bag of result) {
      expect(Math.round((bag.grossKg - bag.tareKg) * 1000) / 1000).toBe(bag.netKg)
    }
  })
})
