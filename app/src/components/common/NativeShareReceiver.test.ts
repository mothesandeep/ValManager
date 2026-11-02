import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SHARED_IMPORT_TEXT_KEY, SHARED_IMPORT_AMOUNT_KEY } from './NativeShareReceiver'
import { detectSharedTextIntent, parseDeepLinkUrl } from '@/utils/deepLinkHelper'

describe('NativeShareReceiver integration mechanics', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('stores and retrieves shared import text and amount in sessionStorage', () => {
    const raw = 'Payment received ₹ 45,000 via RTGS ref AXIS00192'
    const parsed = detectSharedTextIntent(raw)

    sessionStorage.setItem(SHARED_IMPORT_TEXT_KEY, parsed.rawText)
    if (parsed.suggestedAmount) {
      sessionStorage.setItem(SHARED_IMPORT_AMOUNT_KEY, String(parsed.suggestedAmount))
    }

    expect(sessionStorage.getItem(SHARED_IMPORT_TEXT_KEY)).toBe(raw)
    expect(sessionStorage.getItem(SHARED_IMPORT_AMOUNT_KEY)).toBe('45000')

    // Emulate page consuming the shared text
    const retrievedText = sessionStorage.getItem(SHARED_IMPORT_TEXT_KEY)
    const retrievedAmt = sessionStorage.getItem(SHARED_IMPORT_AMOUNT_KEY)
    sessionStorage.removeItem(SHARED_IMPORT_TEXT_KEY)
    sessionStorage.removeItem(SHARED_IMPORT_AMOUNT_KEY)

    expect(retrievedText).toBe(raw)
    expect(retrievedAmt).toBe('45000')
    expect(sessionStorage.getItem(SHARED_IMPORT_TEXT_KEY)).toBeNull()
  })

  it('correctly maps shared deep link intents to application routes', () => {
    expect(parseDeepLinkUrl('kasabval://payments?action=new')).toBe('/payments?action=new')
    expect(parseDeepLinkUrl('kasabval://receiving?action=new')).toBe('/receiving?action=new')
    expect(parseDeepLinkUrl('kasabval://dispatch?action=new')).toBe('/dispatch?action=new')
    expect(parseDeepLinkUrl('kasabval://expenses?action=new')).toBe('/expenses?action=new')
    expect(parseDeepLinkUrl('kasabval://parties?action=new')).toBe('/parties?action=new')
  })
})

