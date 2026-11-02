import { createClient } from '@supabase/supabase-js'
import { getAppPin } from '@/services/security/appLockService'

export { getAppPin }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Returns the configured user API token required to bypass backend bot protection.
 * Can be customized via VITE_USER_API_TOKEN in .env.local.
 */
export function getUserApiToken(): string {
  const token = import.meta.env.VITE_USER_API_TOKEN
  if (token && typeof token === 'string' && token.trim().length > 0) {
    return token.trim()
  }
  return 'kasab_secure_prod_token_2026'
}

/**
 * Returns the authorization headers required by Supabase RLS is_app_authorized().
 */
export function getAppSecurityHeaders(): Record<string, string> {
  const pin = getAppPin()
  const token = getUserApiToken()
  const headers: Record<string, string> = {
    'x-user-token': token,
    'x-app-token': token,
  }
  if (pin) {
    headers['x-app-pin'] = pin
  }
  return headers
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Kasab] Supabase env vars not set. Copy .env.example → .env.local and fill in your project values.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    global: {
      fetch: (url, options = {}) => {
        const pin = getAppPin()
        const userToken = getUserApiToken()
        const headers = new Headers(options.headers || {})

        if (pin && !headers.has('x-app-pin')) {
          headers.set('x-app-pin', pin)
        }
        if (userToken && !headers.has('x-user-token')) {
          headers.set('x-user-token', userToken)
        }
        if (userToken && !headers.has('x-app-token')) {
          headers.set('x-app-token', userToken)
        }

        // Prevent infinite hangs on flaky mobile connections (12s timeout)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort(new DOMException('Network request timed out', 'TimeoutError'))
        }, 12000)

        if (options.signal) {
          options.signal.addEventListener('abort', () => controller.abort())
        }

        return fetch(url, { ...options, headers, signal: controller.signal }).finally(() => {
          clearTimeout(timeoutId)
        })
      },
    },
  }
)

export const apiClient = supabase
