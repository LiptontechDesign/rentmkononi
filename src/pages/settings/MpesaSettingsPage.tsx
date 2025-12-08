import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MpesaSettings } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Save, Check, AlertTriangle, Eye, EyeOff, Copy, CheckCircle2, XCircle, TestTube2, Link, Send } from 'lucide-react'

interface MpesaFormState {
  paybillOrTill: string
  shortcode: string
  consumerKey: string
  consumerSecret: string
  passkey: string
}

// Mask a string showing only last 4 characters
function maskValue(value: string | null): string {
  if (!value) return ''
  if (value.length <= 4) return '****'
  return '****' + value.slice(-4)
}

export default function MpesaSettingsPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [formState, setFormState] = useState<MpesaFormState>({
    paybillOrTill: '',
    shortcode: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState(false)

  // Sandbox testing state
  const [isSandboxMode] = useState(true) // For now, always sandbox until live credentials
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorPhone, setSimulatorPhone] = useState('')
  const [simulatorAmount, setSimulatorAmount] = useState('')
  const [simulatorRef, setSimulatorRef] = useState('')
  const [registerResult, setRegisterResult] = useState<{ success: boolean; message: string } | null>(null)
  const [simulateResult, setSimulateResult] = useState<{ success: boolean; message: string } | null>(null)

  // Fetch existing M-Pesa settings
  const {
    data: mpesaSettings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['mpesa-settings', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return null
      const { data, error } = await supabase
        .from('mpesa_settings')
        .select('*')
        .eq('landlord_id', landlord.id)
        .maybeSingle()

      if (error) throw error
      return data as MpesaSettings | null
    },
  })

  // Initialize form when settings load
  useEffect(() => {
    if (mpesaSettings) {
      setFormState({
        paybillOrTill: mpesaSettings.paybill_or_till_number || '',
        shortcode: mpesaSettings.shortcode || '',
        // Don't show actual encrypted values - show masked placeholder
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
      })
    }
  }, [mpesaSettings])

  // Callback URL - uses c2b-callback which has JWT verification disabled for Safaricom to call
  const callbackUrl = landlord
    ? `https://lylmyqdesefsmuchyhqh.supabase.co/functions/v1/c2b-callback?landlord_id=${landlord.id}`
    : ''

  // Save mutation - calls Edge Function to encrypt and save
  const saveMutation = useMutation({
    mutationFn: async (payload: MpesaFormState) => {
      if (!landlord) throw new Error('Landlord not loaded')

      // Call Edge Function to encrypt and save credentials
      const { data, error } = await supabase.functions.invoke('save-mpesa-settings', {
        body: {
          landlord_id: landlord.id,
          paybill_or_till_number: payload.paybillOrTill.trim(),
          shortcode: payload.shortcode.trim(),
          consumer_key: payload.consumerKey.trim(),
          consumer_secret: payload.consumerSecret.trim(),
          passkey: payload.passkey.trim(),
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpesa-settings', landlord?.id] })
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'ACTIVE' | 'INACTIVE') => {
      if (!landlord) throw new Error('Landlord not loaded')

      const { error } = await supabase
        .from('mpesa_settings')
        .update({ status: newStatus })
        .eq('landlord_id', landlord.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpesa-settings', landlord?.id] })
    },
  })

  // Register C2B URLs mutation
  const registerUrlsMutation = useMutation({
    mutationFn: async () => {
      if (!landlord) throw new Error('Landlord not loaded')

      const { data, error } = await supabase.functions.invoke('c2b-register', {
        body: {
          landlord_id: landlord.id,
          is_sandbox: isSandboxMode,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: (data) => {
      setRegisterResult({ success: true, message: data.message || 'URLs registered successfully!' })
      queryClient.invalidateQueries({ queryKey: ['mpesa-settings', landlord?.id] })
    },
    onError: (err) => {
      setRegisterResult({ success: false, message: err instanceof Error ? err.message : 'Registration failed' })
    },
  })

  // Simulate C2B payment mutation
  const simulatePaymentMutation = useMutation({
    mutationFn: async (payload: { phone: string; amount: number; ref: string }) => {
      if (!landlord) throw new Error('Landlord not loaded')

      const { data, error } = await supabase.functions.invoke('c2b-simulate', {
        body: {
          landlord_id: landlord.id,
          phone_number: payload.phone,
          amount: payload.amount,
          bill_ref_number: payload.ref,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: (data) => {
      setSimulateResult({ success: true, message: data.message || 'Payment simulation sent!' })
      // Clear form
      setSimulatorPhone('')
      setSimulatorAmount('')
      setSimulatorRef('')
    },
    onError: (err) => {
      setSimulateResult({ success: false, message: err instanceof Error ? err.message : 'Simulation failed' })
    },
  })

  const handleSave = async () => {
    setFormError('')
    setSaveSuccess(false)

    // Validation
    if (!formState.paybillOrTill.trim()) {
      setFormError('Paybill or Till number is required')
      return
    }
    if (!formState.shortcode.trim()) {
      setFormError('Shortcode is required')
      return
    }
    if (!formState.consumerKey.trim()) {
      setFormError('Consumer Key is required')
      return
    }
    if (!formState.consumerSecret.trim()) {
      setFormError('Consumer Secret is required')
      return
    }
    if (!formState.passkey.trim()) {
      setFormError('Passkey is required')
      return
    }

    try {
      await saveMutation.mutateAsync(formState)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setFormError(message)
    }
  }

  const handleToggleStatus = async () => {
    if (!mpesaSettings) return
    const newStatus = mpesaSettings.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await toggleStatusMutation.mutateAsync(newStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      setFormError(message)
    }
  }

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegisterUrls = async () => {
    setRegisterResult(null)
    try {
      await registerUrlsMutation.mutateAsync()
    } catch {
      // Error handled in mutation
    }
  }

  const handleSimulatePayment = async () => {
    setSimulateResult(null)
    
    const amount = parseFloat(simulatorAmount)
    if (!simulatorPhone.trim()) {
      setSimulateResult({ success: false, message: 'Phone number is required' })
      return
    }
    if (isNaN(amount) || amount <= 0) {
      setSimulateResult({ success: false, message: 'Valid amount is required' })
      return
    }

    try {
      await simulatePaymentMutation.mutateAsync({
        phone: simulatorPhone.trim(),
        amount,
        ref: simulatorRef.trim(),
      })
    } catch {
      // Error handled in mutation
    }
  }

  const isSaving = saveMutation.isPending || toggleStatusMutation.isPending
  const isRegistering = registerUrlsMutation.isPending
  const isSimulating = simulatePaymentMutation.isPending
  const hasSettings = !!mpesaSettings
  const isActive = mpesaSettings?.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">M-Pesa Settings</h1>
        <p className="text-muted-foreground">
          Configure your M-Pesa Daraja API credentials to receive payments directly from tenants.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            M-Pesa Integration Status
            {hasSettings && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {hasSettings
              ? isActive
                ? 'Your M-Pesa integration is active. Tenant payments will be automatically recorded.'
                : 'Your M-Pesa integration is configured but inactive. Enable it to start receiving automatic payments.'
              : 'Set up your M-Pesa Daraja API credentials to enable automatic payment collection.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error instanceof Error ? error.message : 'Failed to load M-Pesa settings'}
            </div>
          )}

          {!isLoading && !isError && hasSettings && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Paybill / Till Number</Label>
                  <p className="font-medium">{mpesaSettings.paybill_or_till_number || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Shortcode</Label>
                  <p className="font-medium">{mpesaSettings.shortcode || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Consumer Key</Label>
                  <p className="font-medium font-mono">
                    {mpesaSettings.consumer_key_encrypted
                      ? maskValue(mpesaSettings.consumer_key_encrypted)
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Consumer Secret</Label>
                  <p className="font-medium font-mono">
                    {mpesaSettings.consumer_secret_encrypted
                      ? maskValue(mpesaSettings.consumer_secret_encrypted)
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Passkey</Label>
                  <p className="font-medium font-mono">
                    {mpesaSettings.passkey_encrypted
                      ? maskValue(mpesaSettings.passkey_encrypted)
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={isSaving}
                >
                  Update Credentials
                </Button>
                <Button
                  variant={isActive ? 'destructive' : 'default'}
                  onClick={handleToggleStatus}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Spinner size="sm" className="text-white" />
                  ) : isActive ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Disable Integration
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Enable Integration
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !isError && !hasSettings && (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                You haven't configured M-Pesa yet. Click below to set up your Daraja API credentials.
              </p>
              <Button onClick={() => setIsEditing(true)}>
                Set Up M-Pesa Integration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Callback URL Card */}
      {hasSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Callback URL</CardTitle>
            <CardDescription>
              Configure this URL in your Safaricom Daraja portal to receive payment notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={callbackUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyCallbackUrl}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this URL as your C2B (Customer to Business) callback URL in the Safaricom Daraja portal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sandbox Testing Card */}
      {hasSettings && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-purple-600" />
              Sandbox Testing
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                Test Mode
              </span>
            </CardTitle>
            <CardDescription>
              Test your M-Pesa integration using Safaricom's sandbox environment. No real money is involved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Register URLs */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Step 1: Register C2B URLs</h4>
              <p className="text-xs text-muted-foreground">
                Register your callback URLs with Safaricom sandbox to receive payment notifications.
              </p>
              
              {registerResult && (
                <div className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                  registerResult.success 
                    ? 'text-green-600 bg-green-50 border border-green-200' 
                    : 'text-red-600 bg-red-50 border border-red-200'
                }`}>
                  {registerResult.success ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {registerResult.message}
                </div>
              )}

              <Button 
                onClick={handleRegisterUrls} 
                disabled={isRegistering}
                variant="outline"
                className="border-purple-300 hover:bg-purple-100"
              >
                {isRegistering ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Register C2B URLs with Safaricom
              </Button>
            </div>

            {/* Step 2: Simulate Payment */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Step 2: Simulate a Payment</h4>
                  <p className="text-xs text-muted-foreground">
                    Simulate a C2B payment to test your integration flow.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSimulator(!showSimulator)}
                >
                  {showSimulator ? 'Hide' : 'Show'} Simulator
                </Button>
              </div>

              {showSimulator && (
                <div className="space-y-3 p-4 bg-white rounded-lg border">
                  {simulateResult && (
                    <div className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                      simulateResult.success 
                        ? 'text-green-600 bg-green-50 border border-green-200' 
                        : 'text-red-600 bg-red-50 border border-red-200'
                    }`}>
                      {simulateResult.success ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {simulateResult.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="simPhone" className="text-xs">Phone Number</Label>
                      <Input
                        id="simPhone"
                        value={simulatorPhone}
                        onChange={(e) => setSimulatorPhone(e.target.value)}
                        placeholder="254708374149"
                        disabled={isSimulating}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Use test number</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="simAmount" className="text-xs">Amount (KES)</Label>
                      <Input
                        id="simAmount"
                        type="number"
                        value={simulatorAmount}
                        onChange={(e) => setSimulatorAmount(e.target.value)}
                        placeholder="1000"
                        disabled={isSimulating}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="simRef" className="text-xs">Account/Reference</Label>
                      <Input
                        id="simRef"
                        value={simulatorRef}
                        onChange={(e) => setSimulatorRef(e.target.value)}
                        placeholder="Unit code or name"
                        disabled={isSimulating}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">For matching</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSimulatePayment} 
                    disabled={isSimulating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isSimulating ? (
                      <Spinner size="sm" className="mr-2 text-white" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Simulate C2B Payment
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    After simulating, check your <strong>Payments</strong> page. Unmatched payments go to <strong>Unmatched Payments</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="p-3 bg-purple-100 border border-purple-200 rounded-md text-sm text-purple-800">
              <p className="font-medium">Sandbox Test Credentials</p>
              <p className="text-xs mt-1">
                Use the test shortcode <strong>174379</strong> and test phone <strong>254708374149</strong> for sandbox testing.
                Get your sandbox credentials from the <a href="https://developer.safaricom.co.ke/MyApps" target="_blank" rel="noopener noreferrer" className="underline">Daraja Portal</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{hasSettings ? 'Update M-Pesa Credentials' : 'Set Up M-Pesa Integration'}</CardTitle>
            <CardDescription>
              Enter your Safaricom Daraja API credentials. These will be encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  M-Pesa settings saved successfully!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paybillOrTill">Paybill or Till Number</Label>
                  <Input
                    id="paybillOrTill"
                    value={formState.paybillOrTill}
                    onChange={(e) => setFormState((prev) => ({ ...prev, paybillOrTill: e.target.value }))}
                    placeholder="e.g., 174379"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your M-Pesa Paybill or Till number that tenants pay to.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortcode">Shortcode</Label>
                  <Input
                    id="shortcode"
                    value={formState.shortcode}
                    onChange={(e) => setFormState((prev) => ({ ...prev, shortcode: e.target.value }))}
                    placeholder="e.g., 174379"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually same as Paybill/Till for C2B integration.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="consumerKey">Consumer Key</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <EyeOff className="h-4 w-4 mr-1" />
                    ) : (
                      <Eye className="h-4 w-4 mr-1" />
                    )}
                    {showSecrets ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <Input
                  id="consumerKey"
                  type={showSecrets ? 'text' : 'password'}
                  value={formState.consumerKey}
                  onChange={(e) => setFormState((prev) => ({ ...prev, consumerKey: e.target.value }))}
                  placeholder="Your Daraja API Consumer Key"
                  disabled={isSaving}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type={showSecrets ? 'text' : 'password'}
                  value={formState.consumerSecret}
                  onChange={(e) => setFormState((prev) => ({ ...prev, consumerSecret: e.target.value }))}
                  placeholder="Your Daraja API Consumer Secret"
                  disabled={isSaving}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passkey">Passkey</Label>
                <Input
                  id="passkey"
                  type={showSecrets ? 'text' : 'password'}
                  value={formState.passkey}
                  onChange={(e) => setFormState((prev) => ({ ...prev, passkey: e.target.value }))}
                  placeholder="Your Daraja API Passkey"
                  disabled={isSaving}
                  className="font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Security Notice</p>
                    <p>
                      Your API credentials will be encrypted before storage. Never share these credentials
                      with anyone. RentMkononi staff will never ask for your API keys.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setFormError('')
                    // Reset form to original values
                    if (mpesaSettings) {
                      setFormState({
                        paybillOrTill: mpesaSettings.paybill_or_till_number || '',
                        shortcode: mpesaSettings.shortcode || '',
                        consumerKey: '',
                        consumerSecret: '',
                        passkey: '',
                      })
                    } else {
                      setFormState({
                        paybillOrTill: '',
                        shortcode: '',
                        consumerKey: '',
                        consumerSecret: '',
                        passkey: '',
                      })
                    }
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Spinner size="sm" className="text-white" />
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get Daraja API Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Go to the{' '}
              <a
                href="https://developer.safaricom.co.ke/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Safaricom Daraja Portal
              </a>
            </li>
            <li>Create an account or log in if you already have one</li>
            <li>Create a new app and select "Lipa Na M-Pesa Online" (C2B) API</li>
            <li>Copy your Consumer Key, Consumer Secret, and Passkey</li>
            <li>For production, you'll need to complete the Go Live process with Safaricom</li>
          </ol>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <p className="font-medium">Testing with Sandbox</p>
            <p>
              You can use Safaricom's sandbox environment for testing before going live.
              Sandbox credentials work the same way but process test transactions only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
