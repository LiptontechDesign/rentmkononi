import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tenant, Tenancy, Unit, Property, RentCharge } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatKES, capitalize, formatPeriod } from '@/lib/utils'
import { Plus, Edit, Archive, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface TenantFormState {
  id?: string
  fullName: string
  idNumber: string
  phoneNumber: string
  secondaryPhoneNumber: string
  notes: string
}

export default function TenantsPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<TenantFormState>({
    fullName: '',
    idNumber: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    notes: '',
  })
  const [tenantToArchive, setTenantToArchive] = useState<Tenant | null>(null)

  const {
    data: tenants,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tenants', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('landlord_id', landlord.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Tenant[]
    },
  })

  // Load all tenancies to derive current tenancy and map to tenant
  const { data: allTenancies } = useQuery({
    queryKey: ['all-tenancies-for-tenants', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('id, tenant_id, unit_id, status, monthly_rent_amount, start_date, end_date')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Pick<
        Tenancy,
        'id' | 'tenant_id' | 'unit_id' | 'status' | 'monthly_rent_amount' | 'start_date' | 'end_date'
      >[]
    },
  })

  // Load units and properties to display current property/unit
  const { data: allUnits } = useQuery({
    queryKey: ['all-units-for-tenants', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('units')
        .select('id, property_id, unit_code')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Pick<Unit, 'id' | 'property_id' | 'unit_code'>[]
    },
  })

  const { data: allProperties } = useQuery({
    queryKey: ['all-properties-for-tenants', landlord?.id],
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

  // Outstanding charges (all time, current balances)
  const { data: outstandingCharges } = useQuery({
    queryKey: ['outstanding-charges-tenants', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('id, balance, tenancy_id, due_date')
        .eq('landlord_id', landlord.id)
        .gt('balance', 0)

      if (error) throw error
      return data as Pick<RentCharge, 'id' | 'balance' | 'tenancy_id' | 'due_date'>[]
    },
  })

  // All rent charges for computing rent status per tenant
  const { data: allRentCharges } = useQuery({
    queryKey: ['all-rent-charges-for-tenants', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('id, tenancy_id, period, due_date, amount, balance, status')
        .eq('landlord_id', landlord.id)
        .order('period', { ascending: true })

      if (error) throw error
      return data as Pick<RentCharge, 'id' | 'tenancy_id' | 'period' | 'due_date' | 'amount' | 'balance' | 'status'>[]
    },
  })

  // Build lookup maps
  const unitById = useMemo(() => {
    const map = new Map<string, Pick<Unit, 'id' | 'property_id' | 'unit_code'>>()
    ;(allUnits || []).forEach((u) => map.set(u.id, u))
    return map
  }, [allUnits])

  const propertyById = useMemo(() => {
    const map = new Map<string, Pick<Property, 'id' | 'property_name'>>()
    ;(allProperties || []).forEach((p) => map.set(p.id, p))
    return map
  }, [allProperties])

  const tenancyById = useMemo(() => {
    const map = new Map<
      string,
      Pick<
        Tenancy,
        'id' | 'tenant_id' | 'unit_id' | 'status' | 'monthly_rent_amount' | 'start_date' | 'end_date'
      >
    >()
    ;(allTenancies || []).forEach((t) => map.set(t.id, t))
    return map
  }, [allTenancies])

  // Active tenancy per tenant (most recent ACTIVE or NOTICE if multiple)
  const activeTenancyByTenantId = useMemo(() => {
    const map = new Map<string, Tenancy>()
    ;(allTenancies || []).forEach((t) => {
      if (t.status !== 'ACTIVE' && t.status !== 'NOTICE') return
      const existing = map.get(t.tenant_id)
      if (!existing) {
        map.set(t.tenant_id, t as Tenancy)
        return
      }
      if (new Date(t.start_date) > new Date(existing.start_date)) {
        map.set(t.tenant_id, t as Tenancy)
      }
    })
    return map
  }, [allTenancies])

  // Get current period (YYYY-MM)
  const currentPeriod = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  // Financial summaries per tenant
  const totalOutstandingByTenantId = useMemo(() => {
    const total: Record<string, number> = {}
    ;(outstandingCharges || []).forEach((c) => {
      const tenancy = tenancyById.get(c.tenancy_id)
      if (!tenancy) return
      const tenantId = tenancy.tenant_id
      total[tenantId] = (total[tenantId] || 0) + c.balance
    })
    return total
  }, [outstandingCharges, tenancyById])

  // Compute rent status per tenant
  type RentStatusInfo = {
    type: 'paid' | 'due' | 'behind' | 'ahead' | 'no_charges'
    label: string
    paidUpTo?: string
    monthsBehind?: number
    monthsAhead?: number
    firstUnpaidPeriod?: string
  }

  const rentStatusByTenantId = useMemo(() => {
    const map: Record<string, RentStatusInfo> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Helper to format due day
    const formatDueDay = (dateStr: string) => {
      const d = new Date(dateStr)
      return d.getDate() + getDaySuffix(d.getDate())
    }
    const getDaySuffix = (day: number) => {
      if (day >= 11 && day <= 13) return 'th'
      switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }

    // Group charges by tenant
    const chargesByTenantId: Record<string, typeof allRentCharges> = {}
    ;(allRentCharges || []).forEach((c) => {
      const tenancy = tenancyById.get(c.tenancy_id)
      if (!tenancy) return
      const tenantId = tenancy.tenant_id
      if (!chargesByTenantId[tenantId]) chargesByTenantId[tenantId] = []
      chargesByTenantId[tenantId]!.push(c)
    })

    // For each tenant, compute status
    Object.entries(chargesByTenantId).forEach(([tenantId, charges]) => {
      if (!charges || charges.length === 0) {
        map[tenantId] = { type: 'no_charges', label: 'No rent charges yet' }
        return
      }

      // Sort by period
      const sorted = [...charges].sort((a, b) => a.period.localeCompare(b.period))

      // Calculate total outstanding
      const totalOwed = sorted.reduce((sum, c) => sum + c.balance, 0)

      // Find latest fully paid period
      let paidUpToPeriod: string | null = null
      for (const c of sorted) {
        if (c.status === 'PAID' && c.balance === 0) {
          paidUpToPeriod = c.period
        }
      }

      // Find overdue charges (due_date < today and balance > 0)
      const overdueCharges = sorted.filter((c) => {
        const dueDate = new Date(c.due_date)
        return c.balance > 0 && dueDate < today
      })
      const overdueTotal = overdueCharges.reduce((sum, c) => sum + c.balance, 0)

      // Find current month charge
      const currentMonthCharge = sorted.find((c) => c.period === currentPeriod)

      // Find future paid charges (period > currentPeriod and paid)
      const futurePaidCharges = sorted.filter((c) => {
        return c.period > currentPeriod && c.status === 'PAID' && c.balance === 0
      })

      // Determine status
      if (overdueCharges.length > 0) {
        // Behind - has overdue unpaid charges
        const firstUnpaid = overdueCharges[0]!
        const monthsBehind = overdueCharges.length
        map[tenantId] = {
          type: 'behind',
          label: `${monthsBehind} month${monthsBehind > 1 ? 's' : ''} behind (${formatKES(overdueTotal)} owed since ${formatPeriod(firstUnpaid.period)})`,
          monthsBehind,
          firstUnpaidPeriod: firstUnpaid.period,
        }
      } else if (futurePaidCharges.length > 0) {
        // Paid ahead - has future months paid
        const latestFuturePaid = futurePaidCharges[futurePaidCharges.length - 1]!
        const monthsAhead = futurePaidCharges.length
        map[tenantId] = {
          type: 'ahead',
          label: `Paid up to ${formatPeriod(latestFuturePaid.period)} (+${monthsAhead} month${monthsAhead > 1 ? 's' : ''} ahead)`,
          paidUpTo: latestFuturePaid.period,
          monthsAhead,
        }
      } else if (currentMonthCharge && currentMonthCharge.status === 'PAID' && currentMonthCharge.balance === 0) {
        // Paid up to current month
        map[tenantId] = {
          type: 'paid',
          label: `Paid up to ${formatPeriod(currentPeriod)} (${formatKES(0)} owed)`,
          paidUpTo: currentPeriod,
        }
      } else if (currentMonthCharge && currentMonthCharge.balance > 0) {
        // Current month due but not overdue yet
        const dueDate = new Date(currentMonthCharge.due_date)
        if (dueDate >= today) {
          map[tenantId] = {
            type: 'due',
            label: `${formatPeriod(currentPeriod)} due (${formatKES(currentMonthCharge.balance)} by ${formatDueDay(currentMonthCharge.due_date)})`,
          }
        } else {
          // Current month is overdue
          map[tenantId] = {
            type: 'behind',
            label: `1 month behind (${formatKES(currentMonthCharge.balance)} owed since ${formatPeriod(currentPeriod)})`,
            monthsBehind: 1,
            firstUnpaidPeriod: currentPeriod,
          }
        }
      } else if (paidUpToPeriod) {
        // Has some paid history
        map[tenantId] = {
          type: 'paid',
          label: `Paid up to ${formatPeriod(paidUpToPeriod)} (${formatKES(totalOwed)} owed)`,
          paidUpTo: paidUpToPeriod,
        }
      } else {
        map[tenantId] = { type: 'no_charges', label: 'No rent charges yet' }
      }
    })

    return map
  }, [allRentCharges, tenancyById, currentPeriod])

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<TenantFormState, 'id'>) => {
      if (!landlord) throw new Error('Landlord profile not loaded')

      const phoneNumbers = [] as { number: string; label?: string }[]
      if (payload.phoneNumber) {
        phoneNumbers.push({ number: payload.phoneNumber.trim(), label: 'Primary' })
      }
      if (payload.secondaryPhoneNumber) {
        phoneNumbers.push({ number: payload.secondaryPhoneNumber.trim(), label: 'Secondary' })
      }

      const { error } = await supabase.from('tenants').insert({
        landlord_id: landlord.id,
        full_name: payload.fullName.trim(),
        id_number: payload.idNumber.trim() || null,
        phone_numbers: phoneNumbers,
        notes: payload.notes.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', landlord?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: TenantFormState) => {
      if (!payload.id) throw new Error('Missing tenant id')

      const phoneNumbers = [] as { number: string; label?: string }[]
      if (payload.phoneNumber) {
        phoneNumbers.push({ number: payload.phoneNumber.trim(), label: 'Primary' })
      }
      if (payload.secondaryPhoneNumber) {
        phoneNumbers.push({ number: payload.secondaryPhoneNumber.trim(), label: 'Secondary' })
      }

      const { error } = await supabase
        .from('tenants')
        .update({
          full_name: payload.fullName.trim(),
          id_number: payload.idNumber.trim() || null,
          phone_numbers: phoneNumbers,
          notes: payload.notes.trim() || null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', landlord?.id] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenants')
        .update({ is_archived: true })
        .eq('id', tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', landlord?.id] })
    },
  })

  const openCreateForm = () => {
    setFormState({ fullName: '', idNumber: '', phoneNumber: '', secondaryPhoneNumber: '', notes: '' })
    setIsEditMode(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (tenant: Tenant) => {
    const phones = (tenant.phone_numbers as any[]) || []
    const primary = phones[0]
    const secondary = phones[1]

    setFormState({
      id: tenant.id,
      fullName: tenant.full_name,
      idNumber: tenant.id_number ?? '',
      phoneNumber: primary?.number ?? '',
      secondaryPhoneNumber: secondary?.number ?? '',
      notes: tenant.notes ?? '',
    })
    setIsEditMode(true)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const name = formState.fullName.trim()
    if (!name) {
      setFormError('Full name is required')
      return
    }

    try {
      if (isEditMode && formState.id) {
        await updateMutation.mutateAsync(formState)
      } else {
        await createMutation.mutateAsync({
          fullName: formState.fullName,
          idNumber: formState.idNumber,
          phoneNumber: formState.phoneNumber,
          secondaryPhoneNumber: formState.secondaryPhoneNumber,
          notes: formState.notes,
        })
      }
      setIsFormOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tenant'
      setFormError(message)
    }
  }

  const handleArchiveClick = (tenant: Tenant) => {
    setTenantToArchive(tenant)
  }

  const confirmArchiveTenant = async () => {
    if (!tenantToArchive) return

    try {
      await archiveMutation.mutateAsync(tenantToArchive.id)
      setTenantToArchive(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive tenant'
      alert(message)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Manage your tenants, their contact details, and a quick view of their rent status.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add tenant
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit tenant' : 'Add tenant'}</CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Update this tenant\'s details.'
                : 'Create a new tenant record with basic contact information.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={formState.fullName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Jane Doe"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">ID / Passport number</Label>
                <Input
                  id="idNumber"
                  value={formState.idNumber}
                  onChange={(e) => setFormState((prev) => ({ ...prev, idNumber: e.target.value }))}
                  placeholder="ID number (optional)"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Primary phone</Label>
                <Input
                  id="phoneNumber"
                  value={formState.phoneNumber}
                  onChange={(e) => setFormState((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="07xx xxx xxx"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryPhoneNumber">Secondary contact phone (optional)</Label>
                <Input
                  id="secondaryPhoneNumber"
                  value={formState.secondaryPhoneNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, secondaryPhoneNumber: e.target.value }))
                  }
                  placeholder="Spouse / next of kin phone"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any extra details (e.g. employer, references)"
                  disabled={isSaving}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsFormOpen(false)
                    setFormError('')
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" className="text-white" /> : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Your tenants</CardTitle>
          <CardDescription>Only active tenants (not archived) are shown here.</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantToArchive && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <div>
                Archive tenant
                {' '}
                <span className="font-semibold">"{tenantToArchive.full_name}"</span>
                ? They will be removed from the active list but kept for history.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTenantToArchive(null)}
                  disabled={archiveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={confirmArchiveTenant}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? (
                    <Spinner size="sm" className="text-white" />
                  ) : (
                    'Confirm archive'
                  )}
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error instanceof Error ? error.message : 'Failed to load tenants'}
            </div>
          )}

          {!isLoading && !isError && (!tenants || tenants.length === 0) && (
            <p className="text-sm text-muted-foreground">
              You have not added any tenants yet. Click "Add tenant" to create your first one.
            </p>
          )}

          {!isLoading && !isError && tenants && tenants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tenant Name</th>
                    <th className="py-2 pr-4">Primary Contact</th>
                    <th className="py-2 pr-4">Secondary Contact</th>
                    <th className="py-2 pr-4">ID / Passport Number</th>
                    <th className="py-2 pr-4">Current Property / Unit</th>
                    <th className="py-2 pr-4">Rent Status</th>
                    <th className="py-2 pr-4">Total Outstanding</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const phones = (tenant.phone_numbers as any[]) || []
                    const primary = phones[0]
                    const secondary = phones[1]

                    const activeTenancy = activeTenancyByTenantId.get(tenant.id)
                    const unit = activeTenancy ? unitById.get(activeTenancy.unit_id) : undefined
                    const property = unit ? propertyById.get(unit.property_id) : undefined
                    const totalOutstanding = totalOutstandingByTenantId[tenant.id] || 0

                    return (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{capitalize(tenant.full_name)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {primary ? (
                            <span>
                              {primary.number}
                            </span>
                          ) : (
                            <span className="italic text-xs">No phone</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {secondary ? secondary.number : <span className="italic text-xs">None</span>}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{tenant.id_number || '-'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {property ? (
                            <span>
                              {capitalize(property.property_name)}
                              {unit && (
                                <span className="ml-1 text-xs text-muted-foreground">({unit.unit_code})</span>
                              )}
                            </span>
                          ) : (
                            <span className="italic text-xs">No active tenancy</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {(() => {
                            const status = rentStatusByTenantId[tenant.id]
                            if (!status || status.type === 'no_charges') {
                              return (
                                <span className="text-muted-foreground italic text-xs flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  No rent charges yet
                                </span>
                              )
                            }
                            if (status.type === 'paid') {
                              return (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {status.label}
                                </span>
                              )
                            }
                            if (status.type === 'ahead') {
                              return (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {status.label}
                                </span>
                              )
                            }
                            if (status.type === 'due') {
                              return (
                                <span className="text-yellow-600 flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {status.label}
                                </span>
                              )
                            }
                            if (status.type === 'behind') {
                              return (
                                <span className="text-red-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="h-4 w-4" />
                                  {status.label}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={totalOutstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatKES(totalOutstanding)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(tenant)}
                            disabled={archiveMutation.isPending}
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleArchiveClick(tenant)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="mr-1 h-4 w-4" />
                            Archive
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
