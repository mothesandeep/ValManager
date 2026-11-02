import { describe, it, expect } from 'vitest'
import { parseDeepLinkUrl, detectSharedTextIntent } from './deepLinkHelper'

describe('deepLinkHelper', () => {
  describe('parseDeepLinkUrl', () => {
    it('handles kasabval:// scheme with path and query parameters', () => {
      expect(parseDeepLinkUrl('kasabval://receiving?action=new')).toBe('/receiving?action=new')
      expect(parseDeepLinkUrl('kasabval://inward?action=new')).toBe('/receiving?action=new')
      expect(parseDeepLinkUrl('kasabval://outward?action=new')).toBe('/dispatch?action=new')
      expect(parseDeepLinkUrl('kasabval://dispatch?action=new')).toBe('/dispatch?action=new')
      expect(parseDeepLinkUrl('kasabval://payments?action=new')).toBe('/payments?action=new')
      expect(parseDeepLinkUrl('kasabval://billing?action=new')).toBe('/payments?action=new')
      expect(parseDeepLinkUrl('kasabval://parties?party=p_123')).toBe('/parties?party=p_123')
      expect(parseDeepLinkUrl('kasabval://expenses?action=new')).toBe('/expenses?action=new')
      expect(parseDeepLinkUrl('kasabval://reports')).toBe('/reports')
      expect(parseDeepLinkUrl('kasabval://settings')).toBe('/settings')
      expect(parseDeepLinkUrl('kasabval://dashboard')).toBe('/')
    })

    it('handles valmanager:// scheme', () => {
      expect(parseDeepLinkUrl('valmanager://payments?action=new')).toBe('/payments?action=new')
      expect(parseDeepLinkUrl('valmanager://inward')).toBe('/receiving')
    })

    it('handles https://valmanager.app deep links', () => {
      expect(parseDeepLinkUrl('https://valmanager.app/receiving?action=new')).toBe('/receiving?action=new')
      expect(parseDeepLinkUrl('https://valmanager.app/inward')).toBe('/receiving')
      expect(parseDeepLinkUrl('https://valmanager.app/')).toBe('/')
    })

    it('returns null for empty or invalid strings', () => {
      expect(parseDeepLinkUrl('')).toBeNull()
      expect(parseDeepLinkUrl('   ')).toBeNull()
      expect(parseDeepLinkUrl('not-a-valid-url:::')).toBeNull()
    })
  })

  describe('detectSharedTextIntent', () => {
    it('detects payment intents and amounts from message text', () => {
      const res = detectSharedTextIntent('Payment received ₹ 25,000 via UPI Axis Bank ref 928310')
      expect(res.intent).toBe('PAYMENT')
      expect(res.suggestedAmount).toBe(25000)
    })

    it('detects expense intents', () => {
      const res = detectSharedTextIntent('Chai and snacks for factory ₹ 350 cash')
      expect(res.intent).toBe('EXPENSE')
      expect(res.suggestedAmount).toBe(350)
    })

    it('detects inward receiving intents', () => {
      const res = detectSharedTextIntent('Raw yarn inward 4 spools rola tare 5kg')
      expect(res.intent).toBe('INWARD')
    })

    it('detects outward dispatch intents', () => {
      const res = detectSharedTextIntent('Outward dispatch val delivery 6 bungari')
      expect(res.intent).toBe('OUTWARD')
    })

    it('detects party contacts', () => {
      const res = detectSharedTextIntent('New party Khata: Rajesh Textile, phone 9825123456')
      expect(res.intent).toBe('PARTY')
    })
  })
})

