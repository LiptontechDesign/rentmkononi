import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

console.log('[Supabase] Initializing client with URL:', supabaseUrl)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Recommended settings for SPAs
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
