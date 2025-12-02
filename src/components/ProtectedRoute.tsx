import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, landlord } = useAuth()
  const location = useLocation()

  const [profileTimeoutReached, setProfileTimeoutReached] = useState(false)

  // If we're logged in but the landlord profile has not loaded for a while,
  // treat it as an auth/profile error instead of spinning forever.
  useEffect(() => {
    if (!user || landlord || isLoading) {
      setProfileTimeoutReached(false)
      return
    }

    const id = window.setTimeout(() => {
      console.warn('[ProtectedRoute] Landlord profile did not load in time, redirecting to /login')
      setProfileTimeoutReached(true)
    }, 5000)

    return () => window.clearTimeout(id)
  }, [user, landlord, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login, but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Wait for landlord profile to load
  if (!landlord && !profileTimeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!landlord && profileTimeoutReached) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    // Redirect non-admins away from admin routes
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
