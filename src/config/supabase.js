// Supabase client initialization (browser-safe)
// Uses public anon key; do NOT use the service role key in the browser.
import { createClient } from '@supabase/supabase-js'

// Prefer Vite-style public env vars in the browser
const supabaseUrl = import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY

let supabase = null
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    })
  } else {
    console.warn('Supabase client not configured: missing URL or anon key')
  }
} catch (e) {
  console.warn('Supabase client init failed:', e?.message)
}

export { supabase }
