import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Property, Unit, Tenant, Tenancy, Payment, RentCharge } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatKES, capitalize, formatPeriod } from '@/lib/utils'
import { Plus, Edit } from 'lucide-react'

interface TenancyFormState {
  id?: string
  propertyId: string
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  monthlyRent: string
  deposit: string
  rentDueDay: string
  status: 'ACTIVE' | 'NOTICE' | 'ENDED'
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

export default function TenanciesPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<TenancyFormState>({
    propertyId: '',
    unitId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    rentDueDay: '',
    status: 'ACTIVE',
  })

  const {
    data: properties,
    isLoading: isLoadingProperties,
  } = useQuery({
    queryKey: ['properties-for-tenancies', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlord.id)
        .eq('is_deleted', false)
        .order('property_name', { ascending: true })

      if (error) throw error
      return data as Property[]
    },
  })

  const {
    data: units,
    isLoading: isLoadingUnits,
  } = useQuery({
    queryKey: ['units-for-tenancies', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('landlord_id', landlord.id)
        .eq('is_deleted', false)
        .order('unit_code', { ascending: true })

      if (error) throw error
      return data as Unit[]
    },
  })

  const {
    data: tenants,
    isLoading: isLoadingTenants,
  } = useQuery({
    queryKey: ['tenants-for-tenancies', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('landlord_id', landlord.id)
        .eq('is_archived', false)
        .order('full_name', { ascending: true })

      if (error) throw error
      return data as Tenant[]
    },
  })

  const {
    data: tenancies,
    isLoading: isLoadingTenancies,
    isError: isTenanciesError,
    error: tenanciesError,
  } = useQuery({
    queryKey: ['tenancies', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('*')
        .eq('landlord_id', landlord.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      return data as Tenancy[]
    },
  })

  // Payments this month (for all tenancies)
  const { data: currentMonthPayments } = useQuery({
    queryKey: ['current-month-payments-tenancies', landlord?.id],
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

  // All rent charges for all tenancies (to show which months are unpaid)
  const { data: allRentCharges } = useQuery({
    queryKey: ['all-rent-charges-tenancies', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('id, balance, tenancy_id, due_date, period, amount, status')
        .eq('landlord_id', landlord.id)
        .order('period', { ascending: true })

      if (error) throw error
      return data as Pick<RentCharge, 'id' | 'balance' | 'tenancy_id' | 'due_date' | 'period' | 'amount' | 'status'>[]
    },
  })

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    ;(properties || []).forEach((p) => map.set(p.id, p))
    return map
  }, [properties])

  const unitMap = useMemo(() => {
    const map = new Map<string, Unit>()
    ;(units || []).forEach((u) => map.set(u.id, u))
    return map
  }, [units])

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>()
    ;(tenants || []).forEach((t) => map.set(t.id, t))
    return map
  }, [tenants])

  const { startOfMonth, endOfMonth } = getCurrentMonthRange()

  // Financial summaries per tenancy
  const paidThisMonthByTenancyId = useMemo(() => {
    const map: Record<string, number> = {}
    ;(currentMonthPayments || []).forEach((p) => {
      if (!p.tenancy_id) return
      const tenancyId = p.tenancy_id
      map[tenancyId] = (map[tenancyId] || 0) + p.amount
    })
    return map
  }, [currentMonthPayments])

  // Financial summaries per tenancy with unpaid months breakdown
  type TenancyFinancials = {
    totalOutstanding: number
    thisMonthOutstanding: number
    unpaidMonths: string[] // e.g., ["Oct 2025", "Nov 2025"]
  }

  const financialsByTenancyId = useMemo(() => {
    const map: Record<string, TenancyFinancials> = {}

    ;(allRentCharges || []).forEach((c) => {
      if (!c.tenancy_id) return
      const tenancyId = c.tenancy_id

      if (!map[tenancyId]) {
        map[tenancyId] = { totalOutstanding: 0, thisMonthOutstanding: 0, unpaidMonths: [] }
      }

      // Add to total if has balance
      if (c.balance > 0) {
        map[tenancyId].totalOutstanding += c.balance

        // Track unpaid month
        map[tenancyId].unpaidMonths.push(formatPeriod(c.period))

        // Check if this month
        if (c.due_date >= startOfMonth && c.due_date <= endOfMonth) {
          map[tenancyId].thisMonthOutstanding += c.balance
        }
      }
    })

    return map
  }, [allRentCharges, startOfMonth, endOfMonth])

  const dateLabel = getCurrentDateLabel()

  const availableUnitsForSelectedProperty = useMemo(() => {
    if (!formState.propertyId || !units) return []
    return units.filter((u) => u.property_id === formState.propertyId)
  }, [formState.propertyId, units])

  const createMutation = useMutation({
    mutationFn: async (payload: TenancyFormState) => {
      if (!landlord) throw new Error('Landlord profile not loaded')

      const monthlyRent = parseInt(payload.monthlyRent, 10)
      const deposit = payload.deposit ? parseInt(payload.deposit, 10) : 0
      if (Number.isNaN(monthlyRent) || monthlyRent <= 0) {
        throw new Error('Monthly rent must be a positive number')
      }
      if (Number.isNaN(deposit) || deposit < 0) {
        throw new Error('Deposit must be zero or a positive number')
      }

      const rentDueDay = payload.rentDueDay ? parseInt(payload.rentDueDay, 10) : null
      if (rentDueDay !== null && (Number.isNaN(rentDueDay) || rentDueDay < 1 || rentDueDay > 28)) {
        throw new Error('Rent due day must be between 1 and 28')
      }

      const { error } = await supabase.from('tenancies').insert({
        landlord_id: landlord.id,
        tenant_id: payload.tenantId,
        unit_id: payload.unitId,
        start_date: payload.startDate,
        end_date: payload.endDate || null,
        monthly_rent_amount: monthlyRent,
        deposit_required: deposit,
        rent_due_day: rentDueDay,
        status: payload.status,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenancies', landlord?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: TenancyFormState) => {
      if (!payload.id) throw new Error('Missing tenancy id')

      const monthlyRent = parseInt(payload.monthlyRent, 10)
      const deposit = payload.deposit ? parseInt(payload.deposit, 10) : 0
      if (Number.isNaN(monthlyRent) || monthlyRent <= 0) {
        throw new Error('Monthly rent must be a positive number')
      }
      if (Number.isNaN(deposit) || deposit < 0) {
        throw new Error('Deposit must be zero or a positive number')
      }

      const rentDueDay = payload.rentDueDay ? parseInt(payload.rentDueDay, 10) : null
      if (rentDueDay !== null && (Number.isNaN(rentDueDay) || rentDueDay < 1 || rentDueDay > 28)) {
        throw new Error('Rent due day must be between 1 and 28')
      }

      const { error } = await supabase
        .from('tenancies')
        .update({
          tenant_id: payload.tenantId,
          unit_id: payload.unitId,
          start_date: payload.startDate,
          end_date: payload.endDate || null,
          monthly_rent_amount: monthlyRent,
          deposit_required: deposit,
          rent_due_day: rentDueDay,
          status: payload.status,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenancies', landlord?.id] })
    },
  })

  const openCreateForm = () => {
    setFormState({
      id: undefined,
      propertyId: '',
      unitId: '',
      tenantId: '',
      startDate: '',
      endDate: '',
      monthlyRent: '',
      deposit: '',
      rentDueDay: '',
      status: 'ACTIVE',
    })
    setIsEditMode(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (tenancy: Tenancy) => {
    const unit = unitMap.get(tenancy.unit_id)

    setFormState({
      id: tenancy.id,
      propertyId: unit?.property_id || '',
      unitId: tenancy.unit_id,
      tenantId: tenancy.tenant_id,
      startDate: tenancy.start_date,
      endDate: tenancy.end_date || '',
      monthlyRent: tenancy.monthly_rent_amount.toString(),
      deposit: tenancy.deposit_required?.toString() || '',
      rentDueDay: tenancy.rent_due_day?.toString() || '',
      status: tenancy.status as TenancyFormState['status'],
    })
    setIsEditMode(true)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formState.propertyId) {
      setFormError('Property is required')
      return
    }
    if (!formState.unitId) {
      setFormError('Unit is required')
      return
    }
    if (!formState.tenantId) {
      setFormError('Tenant is required')
      return
    }
    if (!formState.startDate) {
      setFormError('Start date is required')
      return
    }

    try {
      if (isEditMode && formState.id) {
        await updateMutation.mutateAsync(formState)
      } else {
        await createMutation.mutateAsync(formState)
      }
      setIsFormOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tenancy'
      setFormError(message)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const isLoadingAny =
    isLoadingProperties || isLoadingUnits || isLoadingTenants || isLoadingTenancies

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tenancies</h1>
          <p className="text-muted-foreground">
            Link tenants to specific units with clear start/end dates, agreed monthly rent, and tenancy status.
          </p>
        </div>
        <Button onClick={openCreateForm} disabled={isLoadingAny}>
          <Plus className="mr-2 h-4 w-4" />
          Add tenancy
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit tenancy' : 'Add tenancy'}</CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Update the details of this tenancy.'
                : 'Create a new tenancy by linking a tenant to a specific unit.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <select
                    id="property"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formState.propertyId}
                    onChange={(e) => {
                      const propertyId = e.target.value
                      setFormState((prev) => ({
                        ...prev,
                        propertyId,
                        // Reset unit when property changes
                        unitId: '',
                      }))
                    }}
                    disabled={isSaving || isLoadingProperties}
                  >
                    <option value="">Select property</option>
                    {(properties || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.property_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <select
                    id="unit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formState.unitId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        unitId: e.target.value,
                      }))
                    }
                    disabled={isSaving || !formState.propertyId || isLoadingUnits}
                  >
                    <option value="">Select unit</option>
                    {availableUnitsForSelectedProperty.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant</Label>
                  <select
                    id="tenant"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formState.tenantId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        tenantId: e.target.value,
                      }))
                    }
                    disabled={isSaving || isLoadingTenants}
                  >
                    <option value="">Select tenant</option>
                    {(tenants || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tenancy start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Tenancy end date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Agreed monthly rent (KES)</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    min={0}
                    value={formState.monthlyRent}
                    onChange={(e) => setFormState((prev) => ({ ...prev, monthlyRent: e.target.value }))}
                    placeholder="25000"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit">Deposit amount (KES, optional)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    min={0}
                    value={formState.deposit}
                    onChange={(e) => setFormState((prev) => ({ ...prev, deposit: e.target.value }))}
                    placeholder="0"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentDueDay">Rent due day (optional override)</Label>
                  <Input
                    id="rentDueDay"
                    type="number"
                    min={1}
                    max={28}
                    value={formState.rentDueDay}
                    onChange={(e) => setFormState((prev) => ({ ...prev, rentDueDay: e.target.value }))}
                    placeholder={`Use default (${landlord?.default_rent_due_day || 5})`}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use your default ({landlord?.default_rent_due_day || 5}th of month).
                    Set a value (1-28) to override for this tenancy only.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Tenancy status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, status: e.target.value as TenancyFormState['status'] }))
                  }
                  disabled={isSaving}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="NOTICE">Notice</option>
                  <option value="ENDED">Ended</option>
                </select>
                </div>
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
          <CardTitle>Your tenancies</CardTitle>
          <CardDescription>
            Overview of which tenants are in which units, and their rent details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAny && !tenancies && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isTenanciesError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {tenanciesError instanceof Error ? tenanciesError.message : 'Failed to load tenancies'}
            </div>
          )}

          {!isLoadingAny && !isTenanciesError && (!tenancies || tenancies.length === 0) && (
            <p className="text-sm text-muted-foreground">
              You have not created any tenancies yet. Click "Add tenancy" to create the first one.
            </p>
          )}

          {!isLoadingAny && !isTenanciesError && tenancies && tenancies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tenant Name</th>
                    <th className="py-2 pr-4">Property / Unit</th>
                    <th className="py-2 pr-4">Tenancy Status</th>
                    <th className="py-2 pr-4">Tenancy Start Date</th>
                    <th className="py-2 pr-4">Tenancy End Date</th>
                    <th className="py-2 pr-4">Current Monthly Rent (KES)</th>
                    <th className="py-2 pr-4">This Month Paid (As of {dateLabel})</th>
                    <th className="py-2 pr-4">This Month Outstanding (As of {dateLabel})</th>
                    <th className="py-2 pr-4">Total Outstanding (All Time)</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenancies.map((tenancy) => {
                    const tenant = tenantMap.get(tenancy.tenant_id)
                    const unit = unitMap.get(tenancy.unit_id)
                    const property = unit ? propertyMap.get(unit.property_id) : undefined

                    const paidThisMonth = paidThisMonthByTenancyId[tenancy.id] || 0
                    const financials = financialsByTenancyId[tenancy.id]
                    const thisMonthOutstanding = financials?.thisMonthOutstanding || 0
                    const totalOutstanding = financials?.totalOutstanding || 0
                    const unpaidMonths = financials?.unpaidMonths || []

                    // Format unpaid months for display
                    let unpaidMonthsLabel = ''
                    if (unpaidMonths.length === 0) {
                      unpaidMonthsLabel = 'all paid'
                    } else if (unpaidMonths.length <= 3) {
                      unpaidMonthsLabel = unpaidMonths.join(', ') + ' unpaid'
                    } else {
                      unpaidMonthsLabel = `${unpaidMonths.length} months unpaid`
                    }

                    return (
                      <tr key={tenancy.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{capitalize(tenant?.full_name) || 'Unknown tenant'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {property ? capitalize(property.property_name) : 'Unknown property'}
                          {unit && (
                            <span className="ml-1 text-xs text-muted-foreground">({unit.unit_code})</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground capitalize">
                          {tenancy.status.toLowerCase()}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatDate(tenancy.start_date)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {tenancy.end_date ? (
                            formatDate(tenancy.end_date)
                          ) : (
                            <span className="italic text-xs">Open</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatKES(tenancy.monthly_rent_amount)}
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
                        <td className="py-2 pr-4">
                          <div className={totalOutstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatKES(totalOutstanding)}
                            <span className="block text-xs font-normal text-muted-foreground">
                              ({unpaidMonthsLabel})
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(tenancy)}
                            disabled={isSaving}
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit
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
