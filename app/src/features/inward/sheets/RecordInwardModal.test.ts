import { describe, it, expect } from 'vitest'
import {
  validateInwardChallanRecord,
  checkDuplicateInwardChallan,
  computeBagDiff,
} from './RecordInwardModal'

describe('RecordInwardModal validation guards & edit/delete reconciler', () => {
  describe('Entering Data (validateInwardChallanRecord)', () => {
    it('passes for valid inward data where gross strictly exceeds tare', () => {
      const res = validateInwardChallanRecord({
        challan_no: '101',
        party_id: 'party-1',
        gross_weight: 50.0,
        tare_weight: 4.5,
        bags: [
          { grossKg: 25.0, tareKg: 2.25 },
          { grossKg: 25.0, tareKg: 2.25 },
        ],
      })
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('fails when challan_no is empty or whitespace', () => {
      const res = validateInwardChallanRecord({
        challan_no: '   ',
        party_id: 'party-1',
        gross_weight: 50.0,
        tare_weight: 4.5,
      })
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('Challan number is strictly required.')
    })

    it('fails when party_id is missing', () => {
      const res = validateInwardChallanRecord({
        challan_no: '101',
        party_id: '',
        gross_weight: 50.0,
        tare_weight: 4.5,
      })
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('Party is strictly required.')
    })

    it('guards against negative net values: Gross must strictly exceed Tare', () => {
      const res = validateInwardChallanRecord({
        challan_no: '101',
        party_id: 'party-1',
        gross_weight: 4.0,
        tare_weight: 5.5,
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('strictly exceed'))).toBe(true)
    })

    it('guards against tare equal to gross weight (0 net)', () => {
      const res = validateInwardChallanRecord({
        challan_no: '101',
        party_id: 'party-1',
        gross_weight: 5.0,
        tare_weight: 5.0,
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('strictly exceed'))).toBe(true)
    })

    it('guards against individual bag tare exceeding gross', () => {
      const res = validateInwardChallanRecord({
        challan_no: '101',
        party_id: 'party-1',
        gross_weight: 50.0,
        tare_weight: 10.0,
        bags: [
          { grossKg: 20.0, tareKg: 25.0 },
        ],
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('Bag #1'))).toBe(true)
    })

    it('handles null and undefined input gracefully', () => {
      const res = validateInwardChallanRecord({})
      expect(res.isValid).toBe(false)
      expect(res.errors).toContain('Challan number is strictly required.')
      expect(res.errors).toContain('Party is strictly required.')
    })
  })

  describe('Duplicate Checking (checkDuplicateInwardChallan)', () => {
    const existingReceipts = [
      { id: 'rec-1', challan_no: '504', party_id: 'p-1', date: '2026-10-20' },
      { id: 'rec-2', challan_no: '505', party_id: 'p-2', date: '2026-10-21' },
    ]

    it('detects duplicate challan number for the same party', () => {
      const match = checkDuplicateInwardChallan('504', 'p-1', existingReceipts)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('rec-1')
    })

    it('does not trigger duplicate for different party', () => {
      const match = checkDuplicateInwardChallan('504', 'p-2', existingReceipts)
      expect(match).toBeNull()
    })

    it('ignores current editing record when editing', () => {
      const match = checkDuplicateInwardChallan('504', 'p-1', existingReceipts, 'rec-1')
      expect(match).toBeNull()
    })

    it('handles whitespace in challan numbers', () => {
      const match = checkDuplicateInwardChallan('  504  ', 'p-1', existingReceipts)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('rec-1')
    })
  })

  describe('Editing & Deleting Bag Reconciler (computeBagDiff)', () => {
    it('returns all items for update when no bags are added or deleted', () => {
      const originalBagIds = ['bag-1', 'bag-2']
      const currentItems = [
        { bagId: 'bag-1', gross: 20.5 },
        { bagId: 'bag-2', gross: 21.0 },
      ]

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate).toHaveLength(2)
      expect(diff.toInsert).toHaveLength(0)
      expect(diff.deletedIds).toHaveLength(0)
    })

    it('identifies deleted bag when user removes bag-2 during edit', () => {
      const originalBagIds = ['bag-1', 'bag-2', 'bag-3']
      const currentItems = [
        { bagId: 'bag-1', gross: 20.5 },
        { bagId: 'bag-3', gross: 22.0 },
      ]

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate.map((b) => b.bagId)).toEqual(['bag-1', 'bag-3'])
      expect(diff.toInsert).toHaveLength(0)
      expect(diff.deletedIds).toEqual(['bag-2'])
    })

    it('identifies newly added bag during edit', () => {
      const originalBagIds = ['bag-1']
      const currentItems = [
        { bagId: 'bag-1', gross: 20.5 },
        { bagId: 'temp-new-bag', gross: 25.0 },
      ]

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate.map((b) => b.bagId)).toEqual(['bag-1'])
      expect(diff.toInsert.map((b) => b.bagId)).toEqual(['temp-new-bag'])
      expect(diff.deletedIds).toHaveLength(0)
    })

    it('identifies simultaneous bag deletion and bag addition during edit', () => {
      const originalBagIds = ['bag-1', 'bag-2']
      const currentItems = [
        { bagId: 'bag-2', gross: 21.0 },
        { bagId: 'bag-new-3', gross: 24.5 },
      ]

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate.map((b) => b.bagId)).toEqual(['bag-2'])
      expect(diff.toInsert.map((b) => b.bagId)).toEqual(['bag-new-3'])
      expect(diff.deletedIds).toEqual(['bag-1'])
    })

    it('handles brand new entry where originalBagIds is empty', () => {
      const originalBagIds: string[] = []
      const currentItems = [
        { bagId: 'b-1', gross: 20.0 },
        { bagId: 'b-2', gross: 22.0 },
      ]

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate).toHaveLength(0)
      expect(diff.toInsert).toHaveLength(2)
      expect(diff.deletedIds).toHaveLength(0)
    })

    it('handles user deleting all bags', () => {
      const originalBagIds = ['bag-1', 'bag-2']
      const currentItems: Array<{ bagId: string; gross: number }> = []

      const diff = computeBagDiff(originalBagIds, currentItems)
      expect(diff.toUpdate).toHaveLength(0)
      expect(diff.toInsert).toHaveLength(0)
      expect(diff.deletedIds).toEqual(['bag-1', 'bag-2'])
    })
  })
})
