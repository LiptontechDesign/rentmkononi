import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

console.log('[Supabase] Initializing client with URL:', supabaseUrl)

// Helper to clear all Supabase auth data from storage
function clearSupabaseAuth() {
  try {
    // Clear all sb- prefixed keys from localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage too
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('sb-')) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
    
    console.log('[Supabase] Cleared corrupted auth data')
  } catch (e) {
    console.error('[Supabase] Error clearing auth data:', e)
  }
}

// Check for corrupted tokens on page load and clear them
try {
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    // Try to parse it - if it fails, it's corrupted
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[Supabase] Found corrupted auth token, clearing...')
      clearSupabaseAuth()
    }
  }
} catch (e) {
  console.warn('[Supabase] Found corrupted auth token, clearing...', e)
  clearSupabaseAuth()
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Recommended settings for SPAs
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Listen for auth errors and auto-clear corrupted sessions
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('[Supabase] Token refresh failed, clearing auth...')
    clearSupabaseAuth()
    window.location.href = '/rentmkononi/login'
  }
})
