// Supabase client initialization (browser-safe)
// Uses public anon key; do NOT use the service role key in the browser.
import { createClient } from '@supabase/supabase-js'

// Prefer Vite-style public env vars in the browser; accept Next-style and SUPABASE_* fallbacks.
// As a last resort, allow runtime override via localStorage keys 'SUPABASE_URL' and 'SUPABASE_ANON_KEY'.
let supabaseUrl =
  import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta?.env?.VITE_SUPABASE_URL ||
  import.meta?.env?.SUPABASE_URL

let supabaseAnonKey =
  import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta?.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta?.env?.SUPABASE_ANON_KEY

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lsUrl = window.localStorage.getItem('SUPABASE_URL')
    const lsKey = window.localStorage.getItem('SUPABASE_ANON_KEY')
    // Prefer runtime override if both are present
    if (lsUrl && lsKey) {
      supabaseUrl = lsUrl
      supabaseAnonKey = lsKey
    }
  }
} catch {
  // ignore storage access errors
}

let supabase = null
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    })
  } else {
    // Only log in development mode to avoid noise in deployed demos
    if (import.meta.env.DEV) {
      console.warn('Supabase client not configured: missing URL or anon key')
    }
  }
} catch (e) {
  if (import.meta.env.DEV) {
    console.warn('Supabase client init failed:', e?.message)
  }
}

export { supabase }
