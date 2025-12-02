import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Public pages
import PrivacyPolicyPage from '@/pages/legal/PrivacyPolicyPage'
import TermsPage from '@/pages/legal/TermsPage'
import AboutPage from '@/pages/company/AboutPage'
import BlogPage from '@/pages/company/BlogPage'
import CareersPage from '@/pages/company/CareersPage'

// Main pages
import DashboardPage from '@/pages/dashboard/DashboardPage'
import PropertiesPage from '@/pages/properties/PropertiesPage'
import PropertyDetailPage from '@/pages/properties/PropertyDetailPage'
import TenantsPage from '@/pages/tenants/TenantsPage'
import TenanciesPage from '@/pages/tenancies/TenanciesPage'
import RentChargesPage from '@/pages/rent-charges/RentChargesPage'
import PaymentsPage from '@/pages/payments/PaymentsPage'
import UnmatchedPaymentsPage from '@/pages/unmatched-payments/UnmatchedPaymentsPage'
import AccountSettingsPage from '@/pages/settings/AccountSettingsPage'
import MpesaSettingsPage from '@/pages/settings/MpesaSettingsPage'

// Placeholder pages - will be implemented step by step
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">This page is coming soon...</p>
    </div>
  )
}

// Ensure routing works correctly when the app is served from a sub-path
// like /rentmkononi/ on GitHub Pages.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/careers',
    element: <CareersPage />,
  },

  // Protected routes with main layout
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/properties',
        element: <PropertiesPage />,
      },
      {
        path: '/properties/:id',
        element: <PropertyDetailPage />,
      },
      {
        path: '/tenants',
        element: <TenantsPage />,
      },
      {
        path: '/tenancies',
        element: <TenanciesPage />,
      },
      {
        path: '/payments',
        element: <PaymentsPage />,
      },
      {
        path: '/rent-charges',
        element: <RentChargesPage />,
      },
      {
        path: '/unmatched-payments',
        element: <UnmatchedPaymentsPage />,
      },
      {
        path: '/settings/mpesa',
        element: <MpesaSettingsPage />,
      },
      {
        path: '/settings/account',
        element: <AccountSettingsPage />,
      },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <PlaceholderPage title="Admin Dashboard" />,
      },
      {
        path: 'landlords',
        element: <PlaceholderPage title="Manage Landlords" />,
      },
      {
        path: 'landlords/:id',
        element: <PlaceholderPage title="Landlord Details" />,
      },
      {
        path: 'plans',
        element: <PlaceholderPage title="Manage Plans" />,
      },
      {
        path: 'mpesa',
        element: <PlaceholderPage title="Platform M-Pesa Settings" />,
      },
      {
        path: 'payments',
        element: <PlaceholderPage title="Platform Payments" />,
      },
    ],
  },

  // Catch all - redirect to dashboard
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
], {
  basename: basePath,
})
