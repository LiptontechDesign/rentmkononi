import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tenancy, Tenant, Unit, Property } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { capitalize } from '@/lib/utils'
import { Save, Check, AlertTriangle } from 'lucide-react'

export default function AccountSettingsPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [rentDueDay, setRentDueDay] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  // Initialize form with landlord data
  useEffect(() => {
    if (landlord) {
      setRentDueDay(landlord.default_rent_due_day?.toString() || '5')
    }
  }, [landlord])

  // Query tenancies with custom due dates
  const { data: tenanciesWithOverride, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['tenancies-with-override', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('id, tenant_id, unit_id, rent_due_day, status')
        .eq('landlord_id', landlord.id)
        .not('rent_due_day', 'is', null)
        .in('status', ['ACTIVE', 'NOTICE'])

      if (error) throw error
      return data as Pick<Tenancy, 'id' | 'tenant_id' | 'unit_id' | 'rent_due_day' | 'status'>[]
    },
  })

  // Query tenants for names
  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-settings', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenants')
        .select('id, full_name')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Pick<Tenant, 'id' | 'full_name'>[]
    },
  })

  // Query units for codes
  const { data: units } = useQuery({
    queryKey: ['units-for-settings', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_code, property_id')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Pick<Unit, 'id' | 'unit_code' | 'property_id'>[]
    },
  })

  // Query properties for names
  const { data: properties } = useQuery({
    queryKey: ['properties-for-settings', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Pick<Property, 'id' | 'property_name'>[]
    },
  })

  // Lookup maps
  const tenantMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(tenants || []).forEach((t) => map.set(t.id, t.full_name))
    return map
  }, [tenants])

  const unitMap = useMemo(() => {
    const map = new Map<string, { unit_code: string; property_id: string }>()
    ;(units || []).forEach((u) => map.set(u.id, { unit_code: u.unit_code, property_id: u.property_id }))
    return map
  }, [units])

  const propertyMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(properties || []).forEach((p) => map.set(p.id, p.property_name))
    return map
  }, [properties])

  const updateMutation = useMutation({
    mutationFn: async (newRentDueDay: number) => {
      if (!landlord) throw new Error('Landlord not loaded')

      const { error } = await supabase
        .from('landlords')
        .update({ default_rent_due_day: newRentDueDay })
        .eq('id', landlord.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const handleSave = async () => {
    setFormError('')
    setSaveSuccess(false)

    const day = parseInt(rentDueDay, 10)
    if (Number.isNaN(day) || day < 1 || day > 28) {
      setFormError('Rent due day must be between 1 and 28')
      return
    }

    try {
      await updateMutation.mutateAsync(day)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setFormError(message)
    }
  }

  const isSaving = updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Account & Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and rent collection preferences.
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <p className="font-medium">{landlord?.full_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium">{landlord?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Business Name</Label>
              <p className="font-medium">{landlord?.business_name || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <p className="font-medium">{landlord?.phone_number || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Plan</Label>
              <p className="font-medium capitalize">{landlord?.plan}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rent Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Rent Collection Settings</CardTitle>
          <CardDescription>
            Configure when rent is due each month. This applies to all tenancies unless overridden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {formError}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <Check className="h-4 w-4" />
              Settings saved successfully!
            </div>
          )}

          <div className="max-w-xs space-y-2">
            <Label htmlFor="rentDueDay">Default rent due day (1-28)</Label>
            <div className="flex gap-2">
              <Input
                id="rentDueDay"
                type="number"
                min={1}
                max={28}
                value={rentDueDay}
                onChange={(e) => setRentDueDay(e.target.value)}
                placeholder="5"
                disabled={isSaving}
                className="w-24"
              />
              <span className="flex items-center text-sm text-muted-foreground">
                of each month
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rent will be considered due on this day. After this day, unpaid rent becomes overdue.
              We use 1-28 to avoid issues with months that have fewer than 31 days.
            </p>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save settings
                </>
              )}
            </Button>
          </div>

          {/* Tenancies with custom due dates */}
          <div className="pt-6 border-t mt-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-medium">Tenancies with custom due dates</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              These tenancies have their own rent due day and will <strong>not be affected</strong> if you change the default above.
            </p>

            {isLoadingOverrides && (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}

            {!isLoadingOverrides && (!tenanciesWithOverride || tenanciesWithOverride.length === 0) && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
                All your active tenancies currently use the default due day. Any changes above will apply to everyone.
              </p>
            )}

            {!isLoadingOverrides && tenanciesWithOverride && tenanciesWithOverride.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Tenant</th>
                      <th className="py-2 pr-4">Property / Unit</th>
                      <th className="py-2 pr-4">Custom Due Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenanciesWithOverride.map((tenancy) => {
                      const tenantName = tenantMap.get(tenancy.tenant_id) || 'Unknown'
                      const unit = unitMap.get(tenancy.unit_id)
                      const propertyName = unit ? propertyMap.get(unit.property_id) : 'Unknown'

                      return (
                        <tr key={tenancy.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{capitalize(tenantName)}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {propertyName ? capitalize(propertyName) : 'Unknown'}
                            {unit && (
                              <span className="ml-1 text-xs">({unit.unit_code})</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              {tenancy.rent_due_day}th of month
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
