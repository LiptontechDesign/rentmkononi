import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Tenancies', href: '/tenancies', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Rent Due', href: '/rent-charges', icon: FileText },
  { name: 'Unmatched', href: '/unmatched-payments', icon: AlertCircle },
]

const settingsNav = [
  { name: 'M-Pesa Settings', href: '/settings/mpesa', icon: CreditCard },
  { name: 'Account Settings', href: '/settings/account', icon: Settings },
]

const adminNav = [
  { name: 'Admin Dashboard', href: '/admin', icon: Shield },
]

export function Sidebar() {
  const location = useLocation()
  const { landlord, signOut, isAdmin } = useAuth()

  return (
    <div className="flex h-full flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b">
        <img 
          src="/rentmkononi/Logo.png" 
          alt="RentMkononi Logo" 
          className="h-10 w-10 object-contain rounded"
        />
        <span className="text-lg font-bold text-primary">RentMkononi</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
          {settingsNav.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Admin section - only visible to admins */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
              {adminNav.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="mb-3">
          <p className="text-sm font-medium truncate">{landlord?.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{landlord?.email}</p>
          <p className="text-xs text-muted-foreground capitalize mt-1">
            Plan: <span className="font-medium">{landlord?.plan}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
