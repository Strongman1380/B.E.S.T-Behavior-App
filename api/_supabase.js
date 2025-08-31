// Supabase admin client (server-only). Uses service role key.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

let supabaseAdmin = null
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  } else {
    console.warn('Supabase admin not configured: missing URL or service role key')
  }
} catch (e) {
  console.warn('Supabase admin init failed:', e?.message)
}

export { supabaseAdmin }

