import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Landlord } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  landlord: Landlord | null
  isLoading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, fullName: string, phoneNumber: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshLandlord: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch landlord profile with timeout
  const fetchLandlord = async (userId: string): Promise<Landlord | null> => {
    console.log('[Auth] fetchLandlord: starting query for userId:', userId)
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Supabase query timed out after 5s')), 5000)
    })

    try {
      // Race between the query and timeout
      const result = await Promise.race([
        supabase
          .from('landlords')
          .select('*')
          .eq('id', userId)
          .single(),
        timeoutPromise
      ]) as { data: Landlord | null; error: { message: string } | null }

      console.log('[Auth] fetchLandlord: query completed', { 
        hasData: !!result.data, 
        error: result.error?.message 
      })

      if (result.error) {
        console.error('[Auth] fetchLandlord error:', result.error.message)
        return null
      }
      return result.data
    } catch (err) {
      console.error('[Auth] fetchLandlord exception:', err)
      return null
    }
  }

  // Refresh landlord data
  const refreshLandlord = async () => {
    if (user) {
      const landlordData = await fetchLandlord(user.id)
      setLandlord(landlordData)
    }
  }

  useEffect(() => {
    let isMounted = true
    let initialSessionProcessed = false

    // Use onAuthStateChange as the single source of truth (recommended by Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('[Auth] onAuthStateChange:', event, session?.user?.email ?? 'no session')

        // Update session and user state immediately
        setSession(session)
        setUser(session?.user ?? null)

        // IMPORTANT: On page refresh, SIGNED_IN fires before auth is ready, then INITIAL_SESSION fires after.
        // We should only fetch landlord data on:
        // 1. INITIAL_SESSION (page load/refresh - auth is ready)
        // 2. SIGNED_IN after initial session (actual login action)
        // 3. TOKEN_REFRESHED (token was refreshed)
        const shouldFetchLandlord = 
          event === 'INITIAL_SESSION' || 
          event === 'TOKEN_REFRESHED' ||
          (event === 'SIGNED_IN' && initialSessionProcessed)

        if (event === 'INITIAL_SESSION') {
          initialSessionProcessed = true
        }

        if (session?.user && shouldFetchLandlord) {
          console.log('[Auth] Fetching landlord for event:', event)
          const landlordData = await fetchLandlord(session.user.id)
          if (!isMounted) return
          console.log('[Auth] Landlord result:', landlordData ? landlordData.email : 'not found')
          setLandlord(landlordData)
        } else if (!session) {
          setLandlord(null)
        }

        // Mark loading complete after INITIAL_SESSION (the definitive initial state)
        if (event === 'INITIAL_SESSION' && isMounted) {
          setIsLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign up with email and password
  // Note: Landlord profile is created automatically by database trigger
  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
          }
        }
      })

      if (error) throw error

      // Landlord profile is automatically created by database trigger (handle_new_user)
      // No need to manually insert here

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const rawBase = import.meta.env.BASE_URL ?? '/'
      const normalizedBase = rawBase === '/' ? '/' : rawBase.replace(/\/$/, '/')
      const redirectTo = `${window.location.origin}${normalizedBase}auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        }
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setLandlord(null)
  }

  const value = {
    user,
    session,
    landlord,
    isLoading,
    isAdmin: landlord?.is_admin ?? false,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshLandlord,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
