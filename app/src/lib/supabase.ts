import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Kasab] Supabase env vars not set. Copy .env.example → .env.local and fill in your project values.'
  )
}

const appPin = sessionStorage.getItem('KASAB_MASTER_PIN') || ''

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    global: {
      headers: {
        'x-app-pin': appPin
      }
    }
  }
)
