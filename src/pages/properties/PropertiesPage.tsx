import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Property, Unit, Tenancy, Payment, RentCharge } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { capitalize, formatKES } from '@/lib/utils'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface PropertyFormState {
  id?: string
  propertyName: string
  location: string
  notes: string
}

type UnitSummary = {
  total: number
  vacant: number
  occupied: number
  reserved: number
}

type UnitSummaryMap = Record<string, UnitSummary>

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

export default function PropertiesPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<PropertyFormState>({
    propertyName: '',
    location: '',
    notes: '',
  })
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null)

  const {
    data: properties,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['properties', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlord.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Property[]
    },
  })

  const { data: unitSummaries } = useQuery<UnitSummaryMap>({
    queryKey: ['property-unit-summaries', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return {}

      const { data, error } = await supabase
        .from('units')
        .select('property_id, status')
        .eq('landlord_id', landlord.id)
        .eq('is_deleted', false)

      if (error) throw error

      const summaries: UnitSummaryMap = {}

      for (const row of data as Pick<Unit, 'property_id' | 'status'>[]) {
        const key = row.property_id
        if (!summaries[key]) {
          summaries[key] = { total: 0, vacant: 0, occupied: 0, reserved: 0 }
        }
        const summary = summaries[key]
        summary.total += 1
        if (row.status === 'VACANT') summary.vacant += 1
        else if (row.status === 'OCCUPIED') summary.occupied += 1
        else if (row.status === 'RESERVED') summary.reserved += 1
      }

      return summaries
    },
  })

  // Load all units to map unit_id -> property_id
  const { data: allUnits } = useQuery({
    queryKey: ['all-units-for-properties', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('units')
        .select('id, property_id')
        .eq('landlord_id', landlord.id)
      if (error) throw error
      return data as Pick<Unit, 'id' | 'property_id'>[]
    },
  })

  // Load all tenancies to map tenancy_id -> unit_id
  const { data: allTenancies } = useQuery({
    queryKey: ['all-tenancies-for-properties', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('id, unit_id')
        .eq('landlord_id', landlord.id)
      if (error) throw error
      return data as Pick<Tenancy, 'id' | 'unit_id'>[]
    },
  })

  // Load payments for current month
  const { data: currentMonthPayments } = useQuery({
    queryKey: ['current-month-payments', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { startOfMonth, endOfMonth } = getCurrentMonthRange()
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, tenancy_id, paid_at')
        .eq('landlord_id', landlord.id)
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth)
      if (error) throw error
      return data as Pick<Payment, 'id' | 'amount' | 'tenancy_id' | 'paid_at'>[]
    },
  })

  // Load rent charges for current month (by due_date)
  const { data: currentMonthCharges } = useQuery({
    queryKey: ['current-month-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { startOfMonth, endOfMonth } = getCurrentMonthRange()
      const { data, error } = await supabase
        .from('rent_charges')
        .select('id, amount, balance, tenancy_id, due_date, status')
        .eq('landlord_id', landlord.id)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
      if (error) throw error
      return data as Pick<RentCharge, 'id' | 'amount' | 'balance' | 'tenancy_id' | 'due_date' | 'status'>[]
    },
  })

  // Build maps for lookups
  const unitToPropertyMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(allUnits || []).forEach((u) => map.set(u.id, u.property_id))
    return map
  }, [allUnits])

  const tenancyToUnitMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(allTenancies || []).forEach((t) => map.set(t.id, t.unit_id))
    return map
  }, [allTenancies])

  // Calculate collected per property (current month)
  const collectedByProperty = useMemo(() => {
    const map: Record<string, number> = {}
    ;(currentMonthPayments || []).forEach((p) => {
      if (!p.tenancy_id) return
      const unitId = tenancyToUnitMap.get(p.tenancy_id)
      if (!unitId) return
      const propertyId = unitToPropertyMap.get(unitId)
      if (!propertyId) return
      map[propertyId] = (map[propertyId] || 0) + p.amount
    })
    return map
  }, [currentMonthPayments, tenancyToUnitMap, unitToPropertyMap])

  // Calculate outstanding per property (current month)
  const outstandingByProperty = useMemo(() => {
    const map: Record<string, number> = {}
    ;(currentMonthCharges || []).forEach((c) => {
      const unitId = tenancyToUnitMap.get(c.tenancy_id)
      if (!unitId) return
      const propertyId = unitToPropertyMap.get(unitId)
      if (!propertyId) return
      map[propertyId] = (map[propertyId] || 0) + c.balance
    })
    return map
  }, [currentMonthCharges, tenancyToUnitMap, unitToPropertyMap])

  const dateLabel = getCurrentDateLabel()

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<PropertyFormState, 'id'>) => {
      if (!landlord) throw new Error('Landlord profile not loaded')
      const { error } = await supabase.from('properties').insert({
        landlord_id: landlord.id,
        property_name: payload.propertyName.trim(),
        location: payload.location.trim() || null,
        notes: payload.notes.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', landlord?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: PropertyFormState) => {
      if (!payload.id) throw new Error('Missing property id')
      const { error } = await supabase
        .from('properties')
        .update({
          property_name: payload.propertyName.trim(),
          location: payload.location.trim() || null,
          notes: payload.notes.trim() || null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', landlord?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('properties')
        .update({ is_deleted: true })
        .eq('id', propertyId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', landlord?.id] })
    },
  })

  const openCreateForm = () => {
    setFormState({ propertyName: '', location: '', notes: '' })
    setIsEditMode(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (property: Property) => {
    setFormState({
      id: property.id,
      propertyName: property.property_name,
      location: property.location ?? '',
      notes: property.notes ?? '',
    })
    setIsEditMode(true)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const name = formState.propertyName.trim()
    if (!name) {
      setFormError('Property name is required')
      return
    }

    try {
      if (isEditMode && formState.id) {
        await updateMutation.mutateAsync(formState)
      } else {
        await createMutation.mutateAsync({
          propertyName: formState.propertyName,
          location: formState.location,
          notes: formState.notes,
        })
      }
      setIsFormOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save property'
      setFormError(message)
    }
  }

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property)
  }

  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return
    try {
      await deleteMutation.mutateAsync(propertyToDelete.id)
      setPropertyToDelete(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete property'
      alert(message)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground">
            Manage your buildings and estates. Each property can have multiple units.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add property
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit property' : 'Add property'}</CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Update the details of this property.'
                : 'Create a new property such as an apartment block or plot.'}
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
                <Label htmlFor="propertyName">Property name</Label>
                <Input
                  id="propertyName"
                  value={formState.propertyName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, propertyName: e.target.value }))}
                  placeholder="Sunrise Apartments"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formState.location}
                  onChange={(e) => setFormState((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Kileleshwa, Nairobi"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any extra details (e.g. caretaker contact)"
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
          <CardTitle>Your properties</CardTitle>
          <CardDescription>Only non-deleted properties are shown here.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error instanceof Error ? error.message : 'Failed to load properties'}
            </div>
          )}

          {!isLoading && !isError && (!properties || properties.length === 0) && (
            <p className="text-sm text-muted-foreground">
              You have not added any properties yet. Click "Add property" to create your first one.
            </p>
          )}

          {!isLoading && !isError && properties && properties.length > 0 && (
            <>
              {propertyToDelete && (
                <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <div>
                    Are you sure you want to remove
                    {' '}
                    <span className="font-semibold">"{propertyToDelete.property_name}"</span>
                    ? This will hide the property but keep its data.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPropertyToDelete(null)}
                      disabled={deleteMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={confirmDeleteProperty}
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

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Property Name</th>
                      <th className="py-2 pr-4">Location</th>
                      <th className="py-2 pr-4">Units (Vacant)</th>
                      <th className="py-2 pr-4">Occupancy</th>
                      <th className="py-2 pr-4">Collected (As of {dateLabel})</th>
                      <th className="py-2 pr-4">Outstanding (As of {dateLabel})</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((property) => {
                      const summary = unitSummaries?.[property.id]
                      const totalUnits = summary?.total || 0
                      const vacantUnits = summary?.vacant || 0
                      const occupiedUnits = totalUnits - vacantUnits
                      const occupancyPercent = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
                      const collected = collectedByProperty[property.id] || 0
                      const outstanding = outstandingByProperty[property.id] || 0

                      return (
                        <tr key={property.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">
                            <Link
                              to={`/properties/${property.id}`}
                              className="text-primary hover:underline"
                            >
                              {capitalize(property.property_name)}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {property.location ? capitalize(property.location) : <span className="italic text-xs">Not set</span>}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {totalUnits} ({vacantUnits} vacant)
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            <span className={occupancyPercent === 100 ? 'text-green-600 font-medium' : occupancyPercent >= 80 ? 'text-green-600' : occupancyPercent >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                              {occupancyPercent}%
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            <span className={collected > 0 ? 'text-green-600' : ''}>
                              {formatKES(collected)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            <span className={outstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                              {formatKES(outstanding)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              asChild
                              disabled={deleteMutation.isPending}
                            >
                              <Link to={`/properties/${property.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditForm(property)}
                              disabled={deleteMutation.isPending}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(property)}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
