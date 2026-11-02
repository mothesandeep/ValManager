import { describe, it, expect } from 'vitest'
import {
  checkCanDeleteParty,
  checkDuplicatePartyName,
} from './utils'
import { PartyFormSchema, formatZodErrors } from '@/lib/validation/schemas'

describe('Party Directory - Entering, Editing & Deleting Edge Cases', () => {
  const mockParties = [
    { id: 'p-1', name: 'Ashokbhai Pansuriya', phone: '9825100001', default_rola_weight_g: 200, default_bungari_weight_g: 70 },
    { id: 'p-2', name: 'Harish Sheladia', phone: '9825100002', default_rola_weight_g: 205, default_bungari_weight_g: 70 },
    { id: 'p-3', name: 'Vijay Navadiya', phone: '9825100003', default_rola_weight_g: 200, default_bungari_weight_g: 75 },
  ]

  describe('Entering Data (Party Registration)', () => {
    it('passes validation for clean party with 10-digit mobile', () => {
      const res = PartyFormSchema.safeParse({
        name: 'Ketan Patel',
        phone: '9825123456',
        address: 'Katargam, Surat',
        default_rola_weight_g: 200,
        default_bungari_weight_g: 70,
      })
      expect(res.success).toBe(true)
    })

    it('rejects empty or whitespace-only party name', () => {
      const res = PartyFormSchema.safeParse({
        name: '   ',
        phone: '9825123456',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        const errs = formatZodErrors(res.error)
        expect(errs.name).toBeDefined()
      }
    })

    it('rejects invalid phone numbers (less than 10 digits or alphabetic)', () => {
      const resShort = PartyFormSchema.safeParse({
        name: 'Valid Name',
        phone: '98251',
      })
      expect(resShort.success).toBe(false)

      const resAlpha = PartyFormSchema.safeParse({
        name: 'Valid Name',
        phone: 'abcdefghij',
      })
      expect(resAlpha.success).toBe(false)
    })

    it('allows registering a party without phone or address (optional)', () => {
      const res = PartyFormSchema.safeParse({
        name: 'Dharmesh Bhai',
        phone: null,
        address: null,
      })
      expect(res.success).toBe(true)
    })

    it('detects duplicate party names (case-insensitive and trimmed)', () => {
      expect(checkDuplicatePartyName('Ashokbhai Pansuriya', mockParties)).toBe(true)
      expect(checkDuplicatePartyName('  ashokbhai pansuriya  ', mockParties)).toBe(true)
      expect(checkDuplicatePartyName('ASHOKBHAI PANSURIYA', mockParties)).toBe(true)
      expect(checkDuplicatePartyName('New Party', mockParties)).toBe(false)
    })
  })

  describe('Editing Data (Party Updates)', () => {
    it('allows a party to keep its own name when editing', () => {
      // Editing p-1 and keeping name 'Ashokbhai Pansuriya'
      const isDuplicate = checkDuplicatePartyName('Ashokbhai Pansuriya', mockParties, 'p-1')
      expect(isDuplicate).toBe(false)
    })

    it('prevents renaming a party to another existing party name', () => {
      // Renaming p-2 to 'Ashokbhai Pansuriya' (p-1's name)
      const isDuplicate = checkDuplicatePartyName('Ashokbhai Pansuriya', mockParties, 'p-2')
      expect(isDuplicate).toBe(true)
    })

    it('handles negative or invalid default tare weights during edit', () => {
      const resNegRola = PartyFormSchema.safeParse({
        name: 'Harish Sheladia',
        default_rola_weight_g: -20,
      })
      expect(resNegRola.success).toBe(false)

      const resNegBungari = PartyFormSchema.safeParse({
        name: 'Harish Sheladia',
        default_bungari_weight_g: -50,
      })
      expect(resNegBungari.success).toBe(false)
    })
  })

  describe('Deleting Data (Party Deletion Safeguards)', () => {
    const receipts = [{ id: 'rec-1', party_id: 'p-1' }]
    const dispatches = [{ id: 'disp-1', party_id: 'p-2' }]
    const payments = [{ id: 'pay-1', party_id: 'p-2' }]

    it('blocks deleting party with active inward receipts', () => {
      const res = checkCanDeleteParty('p-1', receipts, [], [], 'Ashokbhai')
      expect(res.canDelete).toBe(false)
      expect(res.hasReceipts).toBe(true)
      expect(res.reason).toContain('inward receipts')
    })

    it('blocks deleting party with active outward dispatches', () => {
      const res = checkCanDeleteParty('p-2', [], dispatches, [], 'Harish')
      expect(res.canDelete).toBe(false)
      expect(res.hasDispatches).toBe(true)
      expect(res.reason).toContain('outward dispatches')
    })

    it('blocks deleting party with active payments', () => {
      const res = checkCanDeleteParty('p-2', [], [], payments, 'Harish')
      expect(res.canDelete).toBe(false)
      expect(res.hasPayments).toBe(true)
      expect(res.reason).toContain('payments')
    })

    it('blocks deleting party with multiple active transaction types and lists them', () => {
      const res = checkCanDeleteParty('p-2', [], dispatches, payments, 'Harish')
      expect(res.canDelete).toBe(false)
      expect(res.reason).toContain('outward dispatches, payments')
    })

    it('allows deleting party with zero transactions', () => {
      const res = checkCanDeleteParty('p-3', receipts, dispatches, payments, 'Vijay')
      expect(res.canDelete).toBe(true)
      expect(res.reason).toBeUndefined()
    })
  })
})
