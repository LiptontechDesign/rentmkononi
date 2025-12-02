import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Property, Unit, Tenancy, Tenant, Payment, RentCharge } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatKES, capitalize } from '@/lib/utils'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'

interface UnitFormState {
  id?: string
  unitCode: string
  unitType: string
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED'
}

// Get current month date range
function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startOfMonth = new Date(year, month, 1).toISOString()
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { startOfMonth, endOfMonth }
}

// Format current date for column header (e.g. "1 Dec")
function getCurrentDateLabel() {
  const now = new Date()
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
  }).format(now)
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const propertyId = id ?? ''
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<UnitFormState>({
    unitCode: '',
    unitType: '',
    status: 'VACANT',
  })
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null)

  // Load property
  const {
    data: property,
    isLoading: isPropertyLoading,
    isError: isPropertyError,
  } = useQuery({
    queryKey: ['property', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (error) throw error
      return data as Property
    },
  })

  // Load units for property
  const {
    data: units,
    isLoading: isUnitsLoading,
    isError: isUnitsError,
    error: unitsError,
  } = useQuery({
    queryKey: ['units', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_deleted', false)
        .order('unit_code', { ascending: true })

      if (error) throw error
      return data as Unit[]
    },
  })

  // Unit IDs for this property
  const propertyUnitIds = useMemo(() => (units || []).map((u) => u.id), [units])

  // Tenancies for units in this property
  const { data: tenancies } = useQuery({
    queryKey: ['tenancies-for-property', landlord?.id, propertyId, propertyUnitIds],
    enabled: !!landlord && !!propertyId && propertyUnitIds.length > 0,
    queryFn: async () => {
      if (!landlord || !propertyId || propertyUnitIds.length === 0) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('id, unit_id, tenant_id, status, monthly_rent_amount, start_date')
        .eq('landlord_id', landlord.id)
        .in('unit_id', propertyUnitIds)

      if (error) throw error
      return data as Pick<
        Tenancy,
        'id' | 'unit_id' | 'tenant_id' | 'status' | 'monthly_rent_amount' | 'start_date'
      >[]
    },
  })

  // Tenants (for names)
  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-property-units', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenants')
        .select('id, full_name')
        .eq('landlord_id', landlord.id)
        .eq('is_archived', false)

      if (error) throw error
      return data as Pick<Tenant, 'id' | 'full_name'>[]
    },
  })

  // Tenancy IDs for this property
  const propertyTenancyIds = useMemo(
    () => (tenancies || []).map((t) => t.id),
    [tenancies],
  )

  // Payments for current month for this property's tenancies
  const { data: currentMonthPayments } = useQuery({
    queryKey: ['current-month-payments-units', landlord?.id, propertyId, propertyTenancyIds],
    enabled: !!landlord && !!propertyId && propertyTenancyIds.length > 0,
    queryFn: async () => {
      if (!landlord || !propertyId || propertyTenancyIds.length === 0) return []
      const { startOfMonth, endOfMonth } = getCurrentMonthRange()
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, tenancy_id, paid_at')
        .eq('landlord_id', landlord.id)
        .in('tenancy_id', propertyTenancyIds)
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth)

      if (error) throw error
      return data as Pick<Payment, 'id' | 'amount' | 'tenancy_id' | 'paid_at'>[]
    },
  })

  // Outstanding rent charges (all time) for this property's tenancies
  const { data: outstandingCharges } = useQuery({
    queryKey: ['outstanding-charges-units', landlord?.id, propertyId, propertyTenancyIds],
    enabled: !!landlord && !!propertyId && propertyTenancyIds.length > 0,
    queryFn: async () => {
      if (!landlord || !propertyId || propertyTenancyIds.length === 0) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('id, balance, tenancy_id, due_date')
        .eq('landlord_id', landlord.id)
        .gt('balance', 0)
        .in('tenancy_id', propertyTenancyIds)

      if (error) throw error
      return data as Pick<RentCharge, 'id' | 'balance' | 'tenancy_id' | 'due_date'>[]
    },
  })

  // Lookup maps
  const tenantById = useMemo(() => {
    const map = new Map<string, Pick<Tenant, 'id' | 'full_name'>>()
    ;(tenants || []).forEach((t) => map.set(t.id, t))
    return map
  }, [tenants])

  const tenancyById = useMemo(() => {
    const map = new Map<
      string,
      Pick<
        Tenancy,
        'id' | 'unit_id' | 'tenant_id' | 'status' | 'monthly_rent_amount' | 'start_date'
      >
    >()
    ;(tenancies || []).forEach((t) => map.set(t.id, t))
    return map
  }, [tenancies])

  // Active tenancy per unit (most recent ACTIVE or NOTICE)
  const activeTenancyByUnitId = useMemo(() => {
    const map = new Map<string, Tenancy>()
    ;(tenancies || []).forEach((t) => {
      if (t.status !== 'ACTIVE' && t.status !== 'NOTICE') return
      const existing = map.get(t.unit_id)
      if (!existing) {
        map.set(t.unit_id, t as Tenancy)
        return
      }
      if (new Date(t.start_date) > new Date(existing.start_date)) {
        map.set(t.unit_id, t as Tenancy)
      }
    })
    return map
  }, [tenancies])

  const { startOfMonth, endOfMonth } = getCurrentMonthRange()

  // Financial summaries per unit
  const paidThisMonthByUnitId = useMemo(() => {
    const map: Record<string, number> = {}
    ;(currentMonthPayments || []).forEach((p) => {
      if (!p.tenancy_id) return
      const tenancy = tenancyById.get(p.tenancy_id)
      if (!tenancy) return
      const unitId = tenancy.unit_id
      map[unitId] = (map[unitId] || 0) + p.amount
    })
    return map
  }, [currentMonthPayments, tenancyById])

  const {
    thisMonthOutstandingByUnitId,
    totalOutstandingByUnitId,
  } = useMemo(() => {
    const thisMonth: Record<string, number> = {}
    const total: Record<string, number> = {}

    ;(outstandingCharges || []).forEach((c) => {
      const tenancy = tenancyById.get(c.tenancy_id)
      if (!tenancy) return
      const unitId = tenancy.unit_id

      total[unitId] = (total[unitId] || 0) + c.balance

      if (c.due_date >= startOfMonth && c.due_date <= endOfMonth) {
        thisMonth[unitId] = (thisMonth[unitId] || 0) + c.balance
      }
    })

    return { thisMonthOutstandingByUnitId: thisMonth, totalOutstandingByUnitId: total }
  }, [outstandingCharges, tenancyById, startOfMonth, endOfMonth])

  const dateLabel = getCurrentDateLabel()

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<UnitFormState, 'id'>) => {
      if (!landlord || !propertyId) throw new Error('Landlord or property not loaded')

      const { error } = await supabase.from('units').insert({
        landlord_id: landlord.id,
        property_id: propertyId,
        unit_code: payload.unitCode.trim(),
        unit_type: payload.unitType.trim() || null,
        monthly_rent_amount: 0,
        status: payload.status,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property-unit-summaries', landlord?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: UnitFormState) => {
      if (!payload.id) throw new Error('Missing unit id')

      const { error } = await supabase
        .from('units')
        .update({
          unit_code: payload.unitCode.trim(),
          unit_type: payload.unitType.trim() || null,
          status: payload.status,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property-unit-summaries', landlord?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('units')
        .update({ is_deleted: true })
        .eq('id', unitId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property-unit-summaries', landlord?.id] })
    },
  })

  const openCreateForm = () => {
    setFormState({ unitCode: '', unitType: '', status: 'VACANT' })
    setIsEditMode(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (unit: Unit) => {
    setFormState({
      id: unit.id,
      unitCode: unit.unit_code,
      unitType: unit.unit_type ?? '',
      status: unit.status as UnitFormState['status'],
    })
    setIsEditMode(true)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const code = formState.unitCode.trim()
    if (!code) {
      setFormError('Unit code is required')
      return
    }

    try {
      if (isEditMode && formState.id) {
        await updateMutation.mutateAsync(formState)
      } else {
        await createMutation.mutateAsync({
          unitCode: formState.unitCode,
          unitType: formState.unitType,
          status: formState.status,
        })
      }
      setIsFormOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save unit'
      setFormError(message)
    }
  }

  const handleDeleteClick = (unit: Unit) => {
    setUnitToDelete(unit)
  }

  const confirmDeleteUnit = async () => {
    if (!unitToDelete) return
    try {
      await deleteMutation.mutateAsync(unitToDelete.id)
      setUnitToDelete(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete unit'
      alert(message)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isPropertyLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isPropertyError || !property) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 text-sm">Unable to load property.</p>
        <Link to="/properties" className="text-primary hover:underline text-sm">
          &larr; Back to properties
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/properties">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Property details</span>
          </div>
          <h1 className="text-3xl font-bold">{capitalize(property.property_name)}</h1>
          <p className="text-muted-foreground">
            {property.location ? capitalize(property.location) : 'No location set'} · Created {formatDate(property.created_at)}
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add unit
        </Button>
      </div>

      {/* Unit form */}
      {isFormOpen && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit unit' : 'Add unit'}</CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Update the details of this unit.'
                : 'Create a new rentable unit for this property.'}
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
                <Label htmlFor="unitCode">Unit code</Label>
                <Input
                  id="unitCode"
                  value={formState.unitCode}
                  onChange={(e) => setFormState((prev) => ({ ...prev, unitCode: e.target.value }))}
                  placeholder="A1, B2, House 3"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitType">Unit type</Label>
                <Input
                  id="unitType"
                  list="unitTypeOptions"
                  value={formState.unitType}
                  onChange={(e) => setFormState((prev) => ({ ...prev, unitType: e.target.value }))}
                  placeholder="Single room, bedsitter, 1-bedroom, shop, etc."
                  disabled={isSaving}
                />
                <datalist id="unitTypeOptions">
                  <option value="Single room" />
                  <option value="Double room" />
                  <option value="Bedsitter" />
                  <option value="Studio" />
                  <option value="1-bedroom" />
                  <option value="2-bedroom" />
                  <option value="3-bedroom" />
                  <option value="4-bedroom" />
                  <option value="Shop" />
                  <option value="Office" />
                  <option value="Store" />
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, status: e.target.value as UnitFormState['status'] }))
                  }
                  disabled={isSaving}
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="RESERVED">Reserved</option>
                </select>
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

      {/* Units list */}
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
          <CardDescription>Manage all rentable units in this property.</CardDescription>
        </CardHeader>
        <CardContent>
          {unitToDelete && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <div>
                Are you sure you want to remove unit
                {' '}
                <span className="font-semibold">"{unitToDelete.unit_code}"</span>
                ? This will hide the unit but keep its data.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUnitToDelete(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={confirmDeleteUnit}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Spinner size="sm" className="text-white" />
                  ) : (
                    'Confirm remove'
                  )}
                </Button>
              </div>
            </div>
          )}

          {isUnitsLoading && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isUnitsError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {unitsError instanceof Error ? unitsError.message : 'Failed to load units'}
            </div>
          )}

          {!isUnitsLoading && !isUnitsError && (!units || units.length === 0) && (
            <p className="text-sm text-muted-foreground">
              You have not added any units yet. Click "Add unit" to create the first unit for this property.
            </p>
          )}

          {!isUnitsLoading && !isUnitsError && units && units.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Unit Code</th>
                    <th className="py-2 pr-4">Unit Type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Current Tenant</th>
                    <th className="py-2 pr-4">Current Monthly Rent (KES)</th>
                    <th className="py-2 pr-4">This Month Paid (As of {dateLabel})</th>
                    <th className="py-2 pr-4">This Month Outstanding (As of {dateLabel})</th>
                    <th className="py-2 pr-4">Total Outstanding (All Time)</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => {
                    const activeTenancy = activeTenancyByUnitId.get(unit.id)
                    const tenant = activeTenancy ? tenantById.get(activeTenancy.tenant_id) : undefined

                    const paidThisMonth = paidThisMonthByUnitId[unit.id] || 0
                    const thisMonthOutstanding = thisMonthOutstandingByUnitId[unit.id] || 0
                    const totalOutstanding = totalOutstandingByUnitId[unit.id] || 0

                    return (
                      <tr key={unit.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{unit.unit_code}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {unit.unit_type || <span className="italic text-xs">Not set</span>}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground capitalize">
                          {unit.status.toLowerCase()}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {tenant ? (
                            capitalize(tenant.full_name)
                          ) : (
                            <span className="italic text-xs">No active tenancy</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {activeTenancy ? (
                            formatKES(activeTenancy.monthly_rent_amount)
                          ) : (
                            <span className="italic text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          <span className={paidThisMonth > 0 ? 'text-green-600' : ''}>
                            {formatKES(paidThisMonth)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          <span className={thisMonthOutstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatKES(thisMonthOutstanding)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          <span className={totalOutstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatKES(totalOutstanding)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(unit)}
                            disabled={deleteMutation.isPending}
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(unit)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
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
