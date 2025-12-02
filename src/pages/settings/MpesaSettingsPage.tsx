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
import { Save, Check, AlertTriangle, Eye, EyeOff, Copy, CheckCircle2, XCircle } from 'lucide-react'

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

  // Callback URL generated and stored by the Edge Function.
  // Fall back to the new c2b-callback pattern if settings are not yet created.
  const callbackUrl = mpesaSettings?.callback_url ??
    (landlord
      ? `https://lylmyqdesefsmuchyhqh.supabase.co/functions/v1/c2b-callback?landlord_id=${landlord.id}`
      : '')

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

  const isSaving = saveMutation.isPending || toggleStatusMutation.isPending
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
