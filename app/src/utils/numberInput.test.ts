import { describe, it, expect } from 'vitest'
import {
  sanitizeNumericInput,
  sanitizeIntegerInput,
  parseNumericInput,
  parseWeightInput,
  formatKgDisplay,
  formatCurrencyDisplay,
  calculateLineTotal,
} from './numberInput'

describe('numberInput utilities', () => {
  describe('sanitizeNumericInput', () => {
    it('strips redundant leading zeros but preserves valid decimal starts', () => {
      expect(sanitizeNumericInput('005')).toBe('5')
      expect(sanitizeNumericInput('07.2')).toBe('7.2')
      expect(sanitizeNumericInput('0.25')).toBe('0.25')
      expect(sanitizeNumericInput('0.')).toBe('0.')
      expect(sanitizeNumericInput('0')).toBe('0')
    })

    it('strips non-numeric characters and enforces single decimal point', () => {
      expect(sanitizeNumericInput('abc12.34def')).toBe('12.34')
      expect(sanitizeNumericInput('12.34.56')).toBe('12.3456')
      expect(sanitizeNumericInput('-15.2')).toBe('15.2')
    })

    it('handles allowDecimals=false', () => {
      expect(sanitizeNumericInput('12.34', false)).toBe('1234')
      expect(sanitizeNumericInput('0050', false)).toBe('50')
    })
  })

  describe('sanitizeIntegerInput', () => {
    it('only allows whole positive integers', () => {
      expect(sanitizeIntegerInput('12.5')).toBe('125')
      expect(sanitizeIntegerInput('008')).toBe('8')
      expect(sanitizeIntegerInput('')).toBe('')
    })
  })

  describe('parseNumericInput', () => {
    it('parses valid numeric strings without NaN or negatives', () => {
      expect(parseNumericInput('12.345')).toBe(12.345)
      expect(parseNumericInput('abc')).toBe(0)
      expect(parseNumericInput('')).toBe(0)
      expect(parseNumericInput('-5')).toBe(0)
    })
  })

  describe('parseWeightInput', () => {
    it('auto-converts scale readings in grams > 500 to kg', () => {
      expect(parseWeightInput('20860')).toBe(20.86)
      expect(parseWeightInput('30010')).toBe(30.01)
      expect(parseWeightInput('25.5')).toBe(25.5)
      expect(parseWeightInput('400')).toBe(400)
    })
  })

  describe('formatKgDisplay & formatCurrencyDisplay', () => {
    it('formats weights to 3 decimal places', () => {
      expect(formatKgDisplay(12.5)).toBe('12.500')
      expect(formatKgDisplay('20.86')).toBe('20.860')
      expect(formatKgDisplay('invalid')).toBe('0.000')
    })

    it('formats currency to 2 decimal places', () => {
      expect(formatCurrencyDisplay(1500)).toBe('1500.00')
      expect(formatCurrencyDisplay('25.5')).toBe('25.50')
      expect(formatCurrencyDisplay('invalid')).toBe('0.00')
    })
  })

  describe('calculateLineTotal', () => {
    it('accurately calculates weight * rate rounded to 2 decimals', () => {
      expect(calculateLineTotal(20.86, 25)).toBe(521.5)
      expect(calculateLineTotal(10.123, 113.39)).toBe(1147.85)
      expect(calculateLineTotal(0, 25)).toBe(0)
      expect(calculateLineTotal(-5, 25)).toBe(0)
    })
  })
})
