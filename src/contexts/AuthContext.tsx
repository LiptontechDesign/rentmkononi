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

  // Fetch landlord profile
  const fetchLandlord = async (userId: string) => {
    const { data, error } = await supabase
      .from('landlords')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching landlord:', error)
      return null
    }
    return data
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

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('Error getting initial session:', error)
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const landlordData = await fetchLandlord(session.user.id)
          if (!isMounted) return
          setLandlord(landlordData)
        } else {
          setLandlord(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Unexpected error getting initial session:', err)
        setSession(null)
        setUser(null)
        setLandlord(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initAuth()

    // Listen for auth changes (login/logout in this tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // Mark event as intentionally unused to satisfy TypeScript
        void event

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const landlordData = await fetchLandlord(session.user.id)
          if (!isMounted) return
          setLandlord(landlordData)
        } else {
          setLandlord(null)
        }
        setIsLoading(false)
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
