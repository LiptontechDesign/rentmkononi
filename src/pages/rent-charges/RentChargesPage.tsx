import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RentCharge, Tenancy, Tenant, Unit, Property } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatKES, formatPeriod, capitalize } from '@/lib/utils'
import { Filter } from 'lucide-react'

export default function RentChargesPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  // State for generating rent
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const {
    data: tenancies,
    isLoading: isLoadingTenancies,
  } = useQuery({
    queryKey: ['tenancies-for-rent-charges', landlord?.id],
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

  const {
    data: rentCharges,
    isLoading: isLoadingRentCharges,
    isError: isRentChargesError,
    error: rentChargesError,
  } = useQuery({
    queryKey: ['rent-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('*')
        .eq('landlord_id', landlord.id)
        .order('due_date', { ascending: false })

      if (error) throw error
      return data as RentCharge[]
    },
  })

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-rent-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Tenant[]
    },
  })

  const { data: units } = useQuery({
    queryKey: ['units-for-rent-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Unit[]
    },
  })

  const { data: properties } = useQuery({
    queryKey: ['properties-for-rent-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Property[]
    },
  })

  const tenancyMap = useMemo(() => {
    const map = new Map<string, Tenancy>()
    ;(tenancies || []).forEach((t) => map.set(t.id, t))
    return map
  }, [tenancies])

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>()
    ;(tenants || []).forEach((t) => map.set(t.id, t))
    return map
  }, [tenants])

  const unitMap = useMemo(() => {
    const map = new Map<string, Unit>()
    ;(units || []).forEach((u) => map.set(u.id, u))
    return map
  }, [units])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    ;(properties || []).forEach((p) => map.set(p.id, p))
    return map
  }, [properties])
  const isLoadingAny = isLoadingTenancies || isLoadingRentCharges

  // Filtered rent charges
  const filteredRentCharges = useMemo(() => {
    if (!rentCharges) return []
    return rentCharges.filter((charge) => {
      // Status filter
      if (statusFilter !== 'ALL' && charge.status !== statusFilter) return false

      // Property filter
      if (propertyFilter) {
        const tenancy = tenancyMap.get(charge.tenancy_id)
        const unit = tenancy ? unitMap.get(tenancy.unit_id) : undefined
        if (!unit || unit.property_id !== propertyFilter) return false
      }

      // Tenant filter
      if (tenantFilter) {
        const tenancy = tenancyMap.get(charge.tenancy_id)
        if (!tenancy || tenancy.tenant_id !== tenantFilter) return false
      }

      return true
    })
  }, [rentCharges, statusFilter, propertyFilter, tenantFilter, tenancyMap, unitMap])

  // Summary stats
  const summaryStats = useMemo(() => {
    const all = rentCharges || []
    const now = new Date()

    // Basic counts
    const unpaidCount = all.filter((c) => c.status === 'UNPAID').length
    const partialCount = all.filter((c) => c.status === 'PARTIAL').length
    const paidCount = all.filter((c) => c.status === 'PAID').length
    const totalOutstanding = all.reduce((sum, c) => sum + c.balance, 0)

    // Overdue count (past due date and has balance)
    const overdueCount = all.filter((c) => {
      const dueDate = new Date(c.due_date)
      return c.balance > 0 && now > dueDate
    }).length

    // Unique tenants with outstanding balance
    const tenantsWithOutstanding = new Set(
      all
        .filter((c) => c.balance > 0)
        .map((c) => {
          const tenancy = tenancyMap.get(c.tenancy_id)
          return tenancy?.tenant_id
        })
        .filter(Boolean)
    ).size

    // Unique properties with outstanding balance
    const propertiesWithOutstanding = new Set(
      all
        .filter((c) => c.balance > 0)
        .map((c) => {
          const tenancy = tenancyMap.get(c.tenancy_id)
          const unit = tenancy ? unitMap.get(tenancy.unit_id) : undefined
          return unit?.property_id
        })
        .filter(Boolean)
    ).size

    // Unique units with outstanding balance
    const unitsWithOutstanding = new Set(
      all
        .filter((c) => c.balance > 0)
        .map((c) => {
          const tenancy = tenancyMap.get(c.tenancy_id)
          return tenancy?.unit_id
        })
        .filter(Boolean)
    ).size

    // Total rent expected (sum of all amounts)
    const totalExpected = all.reduce((sum, c) => sum + c.amount, 0)

    // Total collected (expected - outstanding)
    const totalCollected = totalExpected - totalOutstanding

    return {
      unpaidCount,
      partialCount,
      paidCount,
      totalOutstanding,
      overdueCount,
      tenantsWithOutstanding,
      propertiesWithOutstanding,
      unitsWithOutstanding,
      totalExpected,
      totalCollected,
    }
  }, [rentCharges, tenancyMap, unitMap])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rent Due</h1>
          <p className="text-muted-foreground">
            Monthly rent owed by each tenant. Entries are auto-generated; balances update as payments are matched.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={async () => {
              setIsGenerating(true)
              setGenerateMessage(null)
              try {
                const { data, error } = await supabase.rpc('generate_rent_charges_for_current_month')
                if (error) throw error
                const count = Array.isArray(data) ? data.length : 0
                if (count > 0) {
                  setGenerateMessage({ type: 'success', text: `Generated ${count} rent due entries for this month.` })
                  queryClient.invalidateQueries({ queryKey: ['rent-charges', landlord?.id] })
                } else {
                  setGenerateMessage({ type: 'success', text: 'All tenancies already have rent due entries for this month.' })
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to generate rent due entries'
                setGenerateMessage({ type: 'error', text: message })
              } finally {
                setIsGenerating(false)
              }
            }}
            disabled={isGenerating || isLoadingAny}
          >
            {isGenerating ? <Spinner size="sm" className="text-white" /> : 'Generate this month\'s rent'}
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide filters' : 'Filters'}
          </Button>
        </div>
      </div>

      {/* Generate message */}
      {generateMessage && (
        <div
          className={`p-3 text-sm rounded-md ${
            generateMessage.type === 'success'
              ? 'text-green-600 bg-green-50 border border-green-200'
              : 'text-red-600 bg-red-50 border border-red-200'
          }`}
        >
          {generateMessage.text}
        </div>
      )}

      {/* Summary cards - only the essentials */}
      {!isLoadingAny && rentCharges && rentCharges.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Unpaid</p>
            <p className="text-2xl font-bold text-red-600">{formatKES(summaryStats.totalOutstanding)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Units with Unpaid Rent</p>
            <p className="text-2xl font-bold">{summaryStats.unitsWithOutstanding}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{summaryStats.overdueCount}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="ALL">All statuses</option>
                <option value="UNPAID">Unpaid only</option>
                <option value="PARTIAL">Partial only</option>
                <option value="PAID">Paid only</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Property</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option value="">All properties</option>
                {(properties || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tenant</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="">All tenants</option>
                {(tenants || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('ALL')
                  setPropertyFilter('')
                  setTenantFilter('')
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Rent due list
            {statusFilter !== 'ALL' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (showing {statusFilter.toLowerCase()} only)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {filteredRentCharges.length} entries shown. Balances update automatically when payments are allocated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAny && !rentCharges && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isRentChargesError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {rentChargesError instanceof Error ? rentChargesError.message : 'Failed to load rent charges'}
            </div>
          )}

          {!isLoadingAny && !isRentChargesError && (!rentCharges || rentCharges.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No rent due entries yet. Entries will be auto-generated for active tenancies each month.
            </p>
          )}

          {!isLoadingAny && !isRentChargesError && rentCharges && rentCharges.length > 0 && filteredRentCharges.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No entries match your current filters.
            </p>
          )}

          {!isLoadingAny && !isRentChargesError && filteredRentCharges.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tenant Name</th>
                    <th className="py-2 pr-4">Property / Unit</th>
                    <th className="py-2 pr-4">Rent month</th>
                    <th className="py-2 pr-4">Date rent was due</th>
                    <th className="py-2 pr-4">Rent Amount (KES)</th>
                    <th className="py-2 pr-4">Balance Owed (KES)</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRentCharges.map((charge) => {
                    const tenancy = tenancyMap.get(charge.tenancy_id)
                    const tenant = tenancy ? tenantMap.get(tenancy.tenant_id) : undefined
                    const unit = tenancy ? unitMap.get(tenancy.unit_id) : undefined
                    const property = unit ? propertyMap.get(unit.property_id) : undefined

                    // Derive landlord-friendly status using due date, balance, and stored status
                    const now = new Date()
                    const dueDate = new Date(charge.due_date)
                    const hasBalance = charge.balance > 0
                    const isOverdue = hasBalance && now > dueDate && charge.status !== 'PAID'

                    // Helper to format due day with suffix
                    const getDaySuffix = (day: number) => {
                      if (day >= 11 && day <= 13) return 'th'
                      switch (day % 10) {
                        case 1: return 'st'
                        case 2: return 'nd'
                        case 3: return 'rd'
                        default: return 'th'
                      }
                    }
                    const dueDayFormatted = dueDate.getDate() + getDaySuffix(dueDate.getDate())

                    // Calculate days overdue
                    const daysOverdue = isOverdue ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

                    let displayStatus: string
                    let statusClass: string

                    if (charge.status === 'PAID' || !hasBalance) {
                      displayStatus = `Paid (${formatKES(charge.amount)})`
                      statusClass = 'bg-green-100 text-green-800'
                    } else if (isOverdue) {
                      if (charge.status === 'PARTIAL') {
                        displayStatus = `Overdue (${formatKES(charge.balance)} unpaid, ${daysOverdue} days late)`
                      } else {
                        displayStatus = `Overdue (${formatKES(charge.balance)} unpaid, ${daysOverdue} days late)`
                      }
                      statusClass = 'bg-red-100 text-red-800'
                    } else {
                      if (charge.status === 'PARTIAL') {
                        displayStatus = `Partial (${formatKES(charge.amount - charge.balance)} paid, ${formatKES(charge.balance)} left)`
                        statusClass = 'bg-yellow-100 text-yellow-800'
                      } else {
                        displayStatus = `Due (${formatKES(charge.balance)} by ${dueDayFormatted})`
                        statusClass = 'bg-yellow-100 text-yellow-800'
                      }
                    }

                    return (
                      <tr key={charge.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{capitalize(tenant?.full_name) || 'Unknown tenant'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {property ? capitalize(property.property_name) : 'Unknown property'}
                          {unit && (
                            <span className="ml-1 text-xs text-muted-foreground">({unit.unit_code})</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatPeriod(charge.period)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatDate(charge.due_date)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatKES(charge.amount)}</td>
                        <td className="py-2 pr-4">
                          <span className={hasBalance ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatKES(charge.balance)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                          >
                            {displayStatus}
                          </span>
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
