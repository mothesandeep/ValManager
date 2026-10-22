import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Kasab] Supabase env vars not set. Copy .env.example → .env.local and fill in your project values.'
  )
}

export function getAppPin(): string {
  if (typeof window === 'undefined') return ''
  return (
    sessionStorage.getItem('KASAB_MASTER_PIN') ||
    localStorage.getItem('KASAB_MASTER_PIN') ||
    import.meta.env.VITE_MASTER_PIN ||
    '7878'
  )
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    global: {
      fetch: (url, options = {}) => {
        const pin = getAppPin()
        const headers = new Headers(options.headers || {})
        if (pin && !headers.has('x-app-pin')) {
          headers.set('x-app-pin', pin)
        }
        return fetch(url, { ...options, headers })
      }
    }
  }
)

