import { describe, it, expect } from 'vitest'
import {
  InwardReceiptFormSchema,
  InwardBagItemSchema,
  OutwardDispatchFormSchema,
  OutwardValBagItemSchema,
  OutwardRolaBagItemSchema,
  PaymentFormSchema,
  ExpenseFormSchema,
  PartyFormSchema,
  formatZodErrors,
} from './schemas'

describe('Zod Validation Schemas', () => {
  describe('Inward Receipt Schemas', () => {
    it('validates a valid inward bag item', () => {
      const res = InwardBagItemSchema.safeParse({
        id: '1',
        gross: '30.010',
        rolaCount: '60',
        perRolaGrams: '200',
        color: 'M.gold',
        twistType: 'S',
        sizeType: 'Norm',
      })
      expect(res.success).toBe(true)
    })

    it('rejects gross weight <= 0 or NaN', () => {
      const res = InwardBagItemSchema.safeParse({
        id: '1',
        gross: '0',
        rolaCount: '60',
        perRolaGrams: '200',
        color: 'M.gold',
        twistType: 'S',
        sizeType: 'Norm',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        const errs = formatZodErrors(res.error)
        expect(errs['gross']).toBeDefined()
      }
    })

    it('rejects tare exceeding gross weight', () => {
      // 100 rolas * 200g = 20kg tare + 0.1kg bori = 20.1kg tare > 10kg gross
      const res = InwardBagItemSchema.safeParse({
        id: '1',
        gross: '10.000',
        rolaCount: '100',
        perRolaGrams: '200',
        color: 'M.gold',
        twistType: 'S',
        sizeType: 'Norm',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        const errs = formatZodErrors(res.error)
        expect(errs['gross']).toContain('exceeds gross')
      }
    })

    it('validates inward receipt form header and bags array', () => {
      const valid = InwardReceiptFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        challanNo: '504',
        bags: [
          {
            id: '1',
            gross: '25.500',
            rolaCount: '50',
            perRolaGrams: '200',
            color: 'M.gold',
            twistType: 'S',
            sizeType: 'Norm',
          },
        ],
      })
      expect(valid.success).toBe(true)

      const missingParty = InwardReceiptFormSchema.safeParse({
        partyId: '',
        date: '2026-10-23',
        bags: [],
      })
      expect(missingParty.success).toBe(false)
    })
  })

  describe('Outward Dispatch Schemas', () => {
    it('validates a valid outward Val bag item', () => {
      const res = OutwardValBagItemSchema.safeParse({
        id: '1',
        gross: '20.860',
        bungariCount: '12',
        tar: '10',
        twistType: 'S',
      })
      expect(res.success).toBe(true)
    })

    it('rejects Val bag when tare exceeds gross', () => {
      const res = OutwardValBagItemSchema.safeParse({
        id: '1',
        gross: '0.500', // 0.5kg
        bungariCount: '100', // 100 * 70g = 7kg tare
        tar: '10',
        twistType: 'S',
      })
      expect(res.success).toBe(false)
    })

    it('validates outward Rola bag items', () => {
      const res = OutwardRolaBagItemSchema.safeParse({
        id: '1',
        gross: '5.200',
        rolaCount: '25',
      })
      expect(res.success).toBe(true)

      const empty = OutwardRolaBagItemSchema.safeParse({
        id: '1',
        gross: '0',
        rolaCount: '0',
      })
      expect(empty.success).toBe(false)
    })

    it('validates outward dispatch form header', () => {
      const valid = OutwardDispatchFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        dispatchType: 'Val',
        challanNo: '21',
      })
      expect(valid.success).toBe(true)

      const invalid = OutwardDispatchFormSchema.safeParse({
        partyId: '',
        date: 'invalid',
        dispatchType: 'Val',
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('Payment Form Schema', () => {
    it('validates correct payment payload', () => {
      const res = PaymentFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        amount: '15000',
        mode: 'UPI / Online',
        reference: 'GPay 98765',
      })
      expect(res.success).toBe(true)
    })

    it('rejects amount <= 0 or missing party', () => {
      const res = PaymentFormSchema.safeParse({
        partyId: '',
        date: '2026-10-23',
        amount: '0',
        mode: 'Cash',
      })
      expect(res.success).toBe(false)
      if (!res.success) {
        const errs = formatZodErrors(res.error)
        expect(errs['partyId']).toBeDefined()
        expect(errs['amount']).toBeDefined()
      }
    })

    it('rejects non-numeric string amounts and negative numbers', () => {
      const resAlpha = PaymentFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        amount: 'not-a-number',
        mode: 'Cash',
      })
      expect(resAlpha.success).toBe(false)

      const resNeg = PaymentFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        amount: '-1500',
        mode: 'Cash',
      })
      expect(resNeg.success).toBe(false)
    })

    it('accepts precision decimal amounts', () => {
      const res = PaymentFormSchema.safeParse({
        partyId: 'party-1',
        date: '2026-10-23',
        amount: '12500.75',
        mode: 'Cheque',
      })
      expect(res.success).toBe(true)
    })
  })

  describe('Operating Expense Schema', () => {
    it('validates operating expenses and rejects zero amounts', () => {
      const valid = ExpenseFormSchema.safeParse({
        date: '2026-10-23',
        category: 'Shop Supplies',
        amount: '250.50',
        paymentMode: 'Cash',
      })
      expect(valid.success).toBe(true)

      const invalid = ExpenseFormSchema.safeParse({
        date: 'invalid-date',
        category: '',
        amount: '-50',
        paymentMode: 'Cash',
      })
      expect(invalid.success).toBe(false)
    })

    it('rejects zero amount or non-numeric amount in expense vouchers', () => {
      const zeroAmt = ExpenseFormSchema.safeParse({
        date: '2026-10-23',
        category: 'Tea & Snacks',
        amount: '0',
        paymentMode: 'Cash',
      })
      expect(zeroAmt.success).toBe(false)

      const nonNum = ExpenseFormSchema.safeParse({
        date: '2026-10-23',
        category: 'Tea & Snacks',
        amount: 'free',
        paymentMode: 'Cash',
      })
      expect(nonNum.success).toBe(false)
    })
  })

  describe('Party Form Schema', () => {
    it('validates party names and 10-digit phone numbers', () => {
      const valid = PartyFormSchema.safeParse({
        name: 'Ramesh Textiles',
        phone: '9825012345',
        address: 'Surat',
        default_rola_weight_g: 200,
        default_bungari_weight_g: 70,
      })
      expect(valid.success).toBe(true)

      const invalidPhone = PartyFormSchema.safeParse({
        name: 'Ramesh Textiles',
        phone: '12345', // not 10 digits
        default_rola_weight_g: null,
        default_bungari_weight_g: null,
      })
      expect(invalidPhone.success).toBe(false)

      const shortName = PartyFormSchema.safeParse({
        name: 'A', // too short (< 2 chars)
        phone: null,
        default_rola_weight_g: null,
        default_bungari_weight_g: null,
      })
      expect(shortName.success).toBe(false)
    })
  })
})
