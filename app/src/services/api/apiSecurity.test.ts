import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getUserApiToken, getAppSecurityHeaders, supabase } from './client'
import * as appLockService from '@/services/security/appLockService'

describe('API Security and Bot Protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUserApiToken & getAppSecurityHeaders', () => {
    it('returns a non-empty user API token by default', () => {
      const token = getUserApiToken()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThanOrEqual(16)
    })

    it('generates complete security headers including x-user-token and x-app-pin', () => {
      vi.spyOn(appLockService, 'getAppPin').mockReturnValue('7878')
      const headers = getAppSecurityHeaders()

      expect(headers['x-user-token']).toBe(getUserApiToken())
      expect(headers['x-app-token']).toBe(getUserApiToken())
      expect(headers['x-app-pin']).toBe('7878')
    })
  })

  describe('Supabase Client Fetch Interceptor', () => {
    it('automatically attaches x-app-pin and x-user-token headers on outgoing requests', async () => {
      vi.spyOn(appLockService, 'getAppPin').mockReturnValue('7878')

      let interceptedHeaders: Headers | null = null

      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        interceptedHeaders = new Headers(options.headers)
        return new Response(JSON.stringify([]), { status: 200 })
      })

      try {
        // Query through Supabase client
        await supabase.from('parties').select('*').limit(1)

        expect(interceptedHeaders).not.toBeNull()
        expect(interceptedHeaders!.get('x-app-pin')).toBe('7878')
        expect(interceptedHeaders!.get('x-user-token')).toBe(getUserApiToken())
        expect(interceptedHeaders!.get('x-app-token')).toBe(getUserApiToken())
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('Backend is_app_authorized() Logic Verification', () => {
    // Pure TypeScript implementation of the PostgreSQL is_app_authorized() security definer function
    function simulateIsAppAuthorized(
      headers: Record<string, string | undefined>,
      cfg: { pin: string; user_token: string } = { pin: '7878', user_token: 'kasab_secure_prod_token_2026' }
    ): boolean {
      const headerPin = headers['x-app-pin']
      const headerToken = headers['x-user-token'] || headers['x-app-token']

      // 1. Validate user API token
      if (headerToken && headerToken === cfg.user_token) {
        return true
      }

      // 2. Validate app PIN
      if (headerPin && headerPin === cfg.pin) {
        return true
      }

      // Deny bot or crawler request
      return false
    }

    it('REJECTS unauthenticated bot requests with no security headers', () => {
      const botHeaders = {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'accept': 'application/json',
      }
      expect(simulateIsAppAuthorized(botHeaders)).toBe(false)
    })

    it('REJECTS scanner requests with invalid/random tokens', () => {
      const scannerHeaders = {
        'x-app-pin': '1234',
        'x-user-token': 'hacker_random_token_xyz',
      }
      expect(simulateIsAppAuthorized(scannerHeaders)).toBe(false)
    })

    it('ACCEPTS requests with valid user API token', () => {
      const legitimateClientHeaders = {
        'x-user-token': 'kasab_secure_prod_token_2026',
      }
      expect(simulateIsAppAuthorized(legitimateClientHeaders)).toBe(true)
    })

    it('ACCEPTS requests with valid app PIN', () => {
      const operatorHeaders = {
        'x-app-pin': '7878',
      }
      expect(simulateIsAppAuthorized(operatorHeaders)).toBe(true)
    })

    it('ACCEPTS requests with both valid PIN and valid user token', () => {
      const fullAppHeaders = {
        'x-app-pin': '7878',
        'x-user-token': 'kasab_secure_prod_token_2026',
      }
      expect(simulateIsAppAuthorized(fullAppHeaders)).toBe(true)
    })
  })
})

