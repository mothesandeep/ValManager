import { describe, it, expect } from 'vitest'
import {
  validateOutwardChallanRecord,
  checkDuplicateOutwardChallan,
  mapEmptyRolaBags,
  sanitizeQualityTarLabel,
  computeBagDiff,
} from './NewDispatchModal'
import { distributeDispatchSettlement } from '../utils/calculations'

describe('NewDispatchModal validation guards & helpers', () => {
  describe('validateOutwardChallanRecord', () => {
    it('passes for standard finished Val dispatch', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: 'party-1',
        val_bags: [{ gross: 23.06, tareKg: 0.84 }],
      })
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('passes for pure empty rola returns (0 val bags, > 0 empty rola bags)', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '74',
        party_id: 'party-1',
        val_bags: [],
        rola_bags: [{ gross: 19.28, rolaCount: 80 }],
      })
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('passes for mixed outward challans with both Val bags and Empty Rola return bags', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: 'party-1',
        val_bags: [
          { gross: 23.06, tareKg: 0.84 },
          { gross: 20.33, tareKg: 0.77 },
        ],
        rola_bags: [
          { gross: 19.28, rolaCount: 80 },
          { gross: 16.50, rolaCount: 72 },
        ],
      })
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('fails when challan_no is empty or whitespace', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '',
        party_id: 'party-1',
        val_bags: [{ gross: 23.06 }],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('Challan number is strictly required.')
    })

    it('fails when party_id is missing', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: '',
        val_bags: [{ gross: 23.06 }],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('Party is strictly required.')
    })

    it('fails when neither Val bags nor Empty rola bags have input', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: 'party-1',
        val_bags: [],
        rola_bags: [],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('At least one Val bag or Empty Rola entry is required.')
    })

    it('guards against tare exceeding gross in Val bags', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: 'party-1',
        val_bags: [{ gross: 1.5, tareKg: 2.0 }],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('Val Bag #1'))).toBe(true)
    })

    it('guards against tare exactly equal to gross (0 net)', () => {
      const res = validateOutwardChallanRecord({
        challan_no: '73',
        party_id: 'party-1',
        val_bags: [{ gross: 2.5, tareKg: 2.5 }],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('cannot equal or exceed'))).toBe(true)
    })
  })

  describe('checkDuplicateOutwardChallan', () => {
    const existingDispatches = [
      { id: 'disp-1', challan_no: '62', party_id: 'p-1', date: '2026-10-23' },
      { id: 'disp-2', challan_no: '63', party_id: 'p-2', date: '2026-10-23' },
    ]

    it('detects duplicate challan number for the same party', () => {
      const match = checkDuplicateOutwardChallan('62', 'p-1', existingDispatches)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('disp-1')
    })

    it('does not flag duplicate if challan belongs to another party', () => {
      const match = checkDuplicateOutwardChallan('62', 'p-2', existingDispatches)
      expect(match).toBeNull()
    })

    it('ignores the record currently being edited', () => {
      const match = checkDuplicateOutwardChallan('62', 'p-1', existingDispatches, 'disp-1')
      expect(match).toBeNull()
    })
  })

  describe('quality label sanitization', () => {
    it('sanitizes duplicate "Tar Tar" format strings into single Tar', () => {
      expect(sanitizeQualityTarLabel('12 Tar Tar')).toBe('12 Tar')
      expect(sanitizeQualityTarLabel('10 Tar')).toBe('10 Tar')
      expect(sanitizeQualityTarLabel('12')).toBe('12 Tar')
    })
  })

  describe('mapEmptyRolaBags', () => {
    it('extracts rola lots and filters subtotal sum', () => {
      const res = mapEmptyRolaBags({
        empty_rola_bags: [
          { gross: 19.28, rola: 80 },
          { gross: 16.5, rola: 72 },
          { gross: 35.78, rola: 152 },
        ],
      })
      expect(res).toHaveLength(2)
      expect(res[0]).toEqual({ gross: 19.28, rola: 80 })
      expect(res[1]).toEqual({ gross: 16.5, rola: 72 })
    })

    it('handles single row without subtotal correctly', () => {
      const res = mapEmptyRolaBags({
        empty_rola_bags: [
          { gross: 19.28, rola: 80 },
        ],
      })
      expect(res).toHaveLength(1)
      expect(res[0]).toEqual({ gross: 19.28, rola: 80 })
    })
  })

  describe('Editing & Reconciling Mixed Dispatches', () => {
    it('correctly separates and reconciles Val and Rola bags during edit', () => {
      const originalBagIds = ['val-1', 'val-2', 'rola-1', 'rola-2']
      // User deletes rola-2 and edits weights of val-1, val-2, rola-1
      const currentPayloads = [
        { bagId: 'val-1', type: 'Val', gross: 23.5 },
        { bagId: 'val-2', type: 'Val', gross: 20.0 },
        { bagId: 'rola-1', type: 'Rola', gross: 19.0 },
      ]

      const diff = computeBagDiff(originalBagIds, currentPayloads)
      expect(diff.toUpdate.map((b) => b.bagId)).toEqual(['val-1', 'val-2', 'rola-1'])
      expect(diff.toInsert).toHaveLength(0)
      expect(diff.deletedIds).toEqual(['rola-2'])
    })

    it('redistributes manual billing settlement when a bag is deleted during edit', () => {
      // 3 initial bags with net 20kg each, total amount 3000 (1000 each)
      // When bag 3 is deleted, the remaining 2 bags split the 3000 (1500 each)
      const remainingBags = [
        { grossKg: 20.84, bungariCount: 12, bungariWeightG: 70, tar: 10, rate: 20, twistType: 'S' as const, tareKg: 0.84, netKg: 20.0 },
        { grossKg: 20.84, bungariCount: 12, bungariWeightG: 70, tar: 10, rate: 20, twistType: 'S' as const, tareKg: 0.84, netKg: 20.0 },
      ]

      const distributed = distributeDispatchSettlement({
        dispatchType: 'Val',
        bags: remainingBags,
        grandTotalAmount: 3000,
      })

      expect(distributed).toHaveLength(2)
      expect(distributed[0].amount).toBe(1500)
      expect(distributed[1].amount).toBe(1500)
      const sum = distributed.reduce((s, b) => s + (b.amount || 0), 0)
      expect(sum).toBe(3000)
    })
  })
})
