import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-20 w-20 rounded-xl bg-white shadow-sm border">
                <img
                  src="/rentmkononi/Logo.png"
                  alt="RentMkononi Logo"
                  className="h-16 w-16 object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-primary tracking-tight">RentMkononi</span>
            </div>
            <CardTitle className="text-xl text-green-600">Check your email</CardTitle>
            <CardDescription>
              If an account exists for <strong>{email}</strong>, we have sent a password reset
              link. Please check your inbox.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/login" className="text-primary hover:underline font-medium">
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex items-center justify-center h-20 w-20 rounded-xl bg-white shadow-sm border">
              <img
                src="/rentmkononi/Logo.png"
                alt="RentMkononi Logo"
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-primary tracking-tight">RentMkononi</span>
          </div>
          <CardTitle className="text-xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" className="text-white" /> : 'Send reset link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-between text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
          <Link to="/signup" className="text-primary hover:underline">
            Create account
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
