import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Payment,
  PaymentAllocation,
  RentCharge,
  Tenancy,
  Tenant,
  Unit,
  Property,
} from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatKES, capitalize } from '@/lib/utils'
import { Edit } from 'lucide-react'

interface AllocationFormState {
  tenancyId: string
  rentChargeId: string
  amount: string
}

export default function UnmatchedPaymentsPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [allocationForm, setAllocationForm] = useState<AllocationFormState>({
    tenancyId: '',
    rentChargeId: '',
    amount: '',
  })
  const [formError, setFormError] = useState('')

  const {
    data: payments,
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
    error: paymentsError,
  } = useQuery({
    queryKey: ['payments', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('landlord_id', landlord.id)
        .order('paid_at', { ascending: false })

      if (error) throw error
      return data as Payment[]
    },
  })

  const {
    data: allocations,
    isLoading: isLoadingAllocations,
  } = useQuery({
    queryKey: ['payment-allocations', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('payment_allocations')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as PaymentAllocation[]
    },
  })

  const { data: rentCharges } = useQuery({
    queryKey: ['rent-charges', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('rent_charges')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as RentCharge[]
    },
  })

  const { data: tenancies } = useQuery({
    queryKey: ['tenancies-for-unmatched', landlord?.id],
    enabled: !!landlord,
    queryFn: async () => {
      if (!landlord) return []
      const { data, error } = await supabase
        .from('tenancies')
        .select('*')
        .eq('landlord_id', landlord.id)

      if (error) throw error
      return data as Tenancy[]
    },
  })

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-unmatched', landlord?.id],
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
    queryKey: ['units-for-unmatched', landlord?.id],
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
    queryKey: ['properties-for-unmatched', landlord?.id],
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

  const allocationsByPayment = useMemo(() => {
    const map = new Map<string, number>()
    ;(allocations || []).forEach((a) => {
      const current = map.get(a.payment_id) ?? 0
      map.set(a.payment_id, current + a.allocated_amount)
    })
    return map
  }, [allocations])

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

  const unmatchedPayments: Payment[] = useMemo(() => {
    if (!payments) return []
    return payments.filter((p) => {
      const allocated = allocationsByPayment.get(p.id) ?? 0
      return p.amount - allocated > 0
    })
  }, [payments, allocationsByPayment])

  const currentPaymentRemaining = useMemo(() => {
    if (!selectedPayment) return 0
    const allocated = allocationsByPayment.get(selectedPayment.id) ?? 0
    return selectedPayment.amount - allocated
  }, [selectedPayment, allocationsByPayment])

  const availableChargesForSelectedTenancy = useMemo(() => {
    if (!allocationForm.tenancyId || !rentCharges) return []
    return rentCharges.filter((c) => c.tenancy_id === allocationForm.tenancyId && c.balance > 0)
  }, [allocationForm.tenancyId, rentCharges])

  const allocateMutation = useMutation({
    mutationFn: async (payload: { paymentId: string; rentChargeId: string; amount: number }) => {
      if (!landlord) throw new Error('Landlord profile not loaded')

      const { paymentId, rentChargeId, amount } = payload

      const { data: charge, error: chargeError } = await supabase
        .from('rent_charges')
        .select('*')
        .eq('id', rentChargeId)
        .eq('landlord_id', landlord.id)
        .single()

      if (chargeError) throw chargeError

      if (amount <= 0) {
        throw new Error('Allocation amount must be positive')
      }
      if (amount > (charge as RentCharge).balance) {
        throw new Error('Allocation exceeds remaining charge balance')
      }

      const { error: allocError } = await supabase.from('payment_allocations').insert({
        landlord_id: landlord.id,
        payment_id: paymentId,
        rent_charge_id: rentChargeId,
        allocated_amount: amount,
      })
      if (allocError) throw allocError

      const newBalance = (charge as RentCharge).balance - amount
      const newStatus =
        newBalance <= 0
          ? 'PAID'
          : newBalance < (charge as RentCharge).amount
            ? 'PARTIAL'
            : 'UNPAID'

      const { error: updateChargeError } = await supabase
        .from('rent_charges')
        .update({ balance: newBalance, status: newStatus })
        .eq('id', rentChargeId)
      if (updateChargeError) throw updateChargeError

      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ is_matched: true })
        .eq('id', paymentId)
      if (updatePaymentError) throw updatePaymentError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-allocations', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['rent-charges', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['payments', landlord?.id] })
      // Also invalidate related queries used by other pages
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-tenancies', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-charges-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-for-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['current-month-payments-tenancies', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-charges-units', landlord?.id] })
    },
  })

  const openAllocateForm = (payment: Payment) => {
    const defaultTenancyId = payment.tenancy_id || ''
    setSelectedPayment(payment)
    setAllocationForm({ tenancyId: defaultTenancyId, rentChargeId: '', amount: '' })
    setFormError('')
  }

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!selectedPayment) return

    if (!allocationForm.tenancyId) {
      setFormError('Tenancy is required')
      return
    }
    if (!allocationForm.rentChargeId) {
      setFormError('Rent charge is required')
      return
    }

    const amount = parseInt(allocationForm.amount, 10)
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Allocation amount must be a positive number')
      return
    }

    const remaining = currentPaymentRemaining
    if (amount > remaining) {
      setFormError('Allocation cannot exceed remaining payment amount')
      return
    }

    const charge = rentCharges?.find((c) => c.id === allocationForm.rentChargeId)
    if (!charge) {
      setFormError('Selected rent charge not found')
      return
    }
    if (amount > charge.balance) {
      setFormError('Allocation exceeds remaining charge balance')
      return
    }

    try {
      await allocateMutation.mutateAsync({
        paymentId: selectedPayment.id,
        rentChargeId: allocationForm.rentChargeId,
        amount,
      })
      setSelectedPayment(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to allocate payment'
      setFormError(message)
    }
  }

  const isSaving = allocateMutation.isPending
  const isLoadingAny = isLoadingPayments || isLoadingAllocations

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Unmatched payments</h1>
          <p className="text-muted-foreground">
            Allocate incoming payments to rent charges and reduce outstanding balances.
          </p>
        </div>
      </div>

      {/* Allocation form */}
      {selectedPayment && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Allocate payment</CardTitle>
            <CardDescription>
              Allocate part of this payment to a specific rent charge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Payment:</span>{' '}
                {formatKES(selectedPayment.amount)} paid on {formatDate(selectedPayment.paid_at)}{' '}
                {selectedPayment.raw_reference && `• Ref: ${selectedPayment.raw_reference}`}
              </div>
              <div>
                <span className="font-medium">Remaining:</span> {formatKES(currentPaymentRemaining)}
              </div>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenancy">Tenancy</Label>
                  <select
                    id="tenancy"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={allocationForm.tenancyId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        tenancyId: e.target.value,
                        rentChargeId: '',
                      }))
                    }
                    disabled={isSaving}
                  >
                    <option value="">Select tenancy</option>
                    {(tenancies || []).map((t) => {
                      const tenant = tenantMap.get(t.tenant_id)
                      const unit = unitMap.get(t.unit_id)
                      const property = unit ? propertyMap.get(unit.property_id) : undefined

                      return (
                        <option key={t.id} value={t.id}>
                          {tenant?.full_name || 'Tenant'} - {property?.property_name || 'Property'}
                          {unit && ` (${unit.unit_code})`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rentCharge">Rent charge</Label>
                  <select
                    id="rentCharge"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={allocationForm.rentChargeId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        rentChargeId: e.target.value,
                      }))
                    }
                    disabled={isSaving || !allocationForm.tenancyId}
                  >
                    <option value="">Select rent charge</option>
                    {availableChargesForSelectedTenancy.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.period} • Due {formatDate(c.due_date)} • Balance {formatKES(c.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to allocate (KES)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={allocationForm.amount}
                    onChange={(e) => setAllocationForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 10000"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPayment(null)
                    setFormError('')
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" className="text-white" /> : 'Allocate'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Payments with remaining balance</CardTitle>
          <CardDescription>
            These payments still have unallocated amounts. Allocate them to rent charges above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAny && !payments && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          )}

          {isPaymentsError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {paymentsError instanceof Error ? paymentsError.message : 'Failed to load payments'}
            </div>
          )}

          {!isLoadingAny && !isPaymentsError && unmatchedPayments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              All payments are fully allocated. New unmatched payments will appear here.
            </p>
          )}

          {!isLoadingAny && !isPaymentsError && unmatchedPayments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tenant</th>
                    <th className="py-2 pr-4">Property / Unit</th>
                    <th className="py-2 pr-4">Paid at</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Allocated</th>
                    <th className="py-2 pr-4">Remaining</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatchedPayments.map((payment) => {
                    const allocated = allocationsByPayment.get(payment.id) ?? 0
                    const remaining = payment.amount - allocated

                    const tenancy = payment.tenancy_id
                      ? tenancyMap.get(payment.tenancy_id)
                      : undefined
                    const tenant = tenancy ? tenantMap.get(tenancy.tenant_id) : undefined
                    const unit = tenancy ? unitMap.get(tenancy.unit_id) : undefined
                    const property = unit ? propertyMap.get(unit.property_id) : undefined

                    return (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">
                          {capitalize(tenant?.full_name) || (payment.phone_number || payment.raw_reference ? 'Unlinked' : '-')}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {property ? capitalize(property.property_name) : '-'}
                          {unit && (
                            <span className="ml-1 text-xs text-muted-foreground">({unit.unit_code})</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatDate(payment.paid_at)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatKES(payment.amount)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatKES(allocated)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatKES(remaining)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {payment.raw_reference || payment.mpesa_trans_id || '-'}
                        </td>
                        <td className="py-2 pr-4 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAllocateForm(payment)}
                            disabled={isSaving}
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Allocate
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
