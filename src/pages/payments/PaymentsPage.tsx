import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Payment, Tenancy, Tenant, Unit, Property, PaymentSource, RentCharge } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatKES, capitalize } from '@/lib/utils'
import { Plus, Edit } from 'lucide-react'

interface PaymentFormState {
  id?: string
  amount: string
  paidAt: string
  source: PaymentSource
  paymentMethod: 'CASH' | 'BANK' | 'CHEQUE' | 'OTHER'
  rawReference: string
  tenancyId: string
}

export default function PaymentsPage() {
  const { landlord } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState<PaymentFormState>({
    amount: '',
    paidAt: '',
    source: 'MANUAL',
    paymentMethod: 'CASH',
    rawReference: '',
    tenancyId: '',
  })

  const {
    data: tenancies,
    isLoading: isLoadingTenancies,
  } = useQuery({
    queryKey: ['tenancies-for-payments', landlord?.id],
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

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-payments', landlord?.id],
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
    queryKey: ['units-for-payments', landlord?.id],
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
    queryKey: ['properties-for-payments', landlord?.id],
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

  const createMutation = useMutation({
    mutationFn: async (payload: PaymentFormState) => {
      if (!landlord) throw new Error('Landlord profile not loaded')

      const amount = parseInt(payload.amount, 10)
      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number')
      }

      // 1. Insert the payment
      const { data: newPayment, error: insertError } = await supabase
        .from('payments')
        .insert({
          landlord_id: landlord.id,
          amount,
          paid_at: payload.paidAt || new Date().toISOString(),
          source: 'MANUAL',
          phone_number: null,
          raw_reference: payload.rawReference.trim() || null,
          tenancy_id: payload.tenancyId || null,
          notes: payload.paymentMethod,
          is_matched: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 2. If tenancy is selected, auto-allocate to unpaid rent charges
      if (payload.tenancyId && newPayment) {
        // Fetch unpaid rent charges for this tenancy (oldest first by period)
        const { data: unpaidCharges, error: chargesError } = await supabase
          .from('rent_charges')
          .select('*')
          .eq('landlord_id', landlord.id)
          .eq('tenancy_id', payload.tenancyId)
          .gt('balance', 0)
          .order('period', { ascending: true })

        if (chargesError) {
          console.error('Error fetching rent charges:', chargesError)
          return // Payment created, but allocation failed - user can allocate manually
        }

        let remainingAmount = amount
        let fullyAllocated = true

        // Allocate to each charge until payment is exhausted
        for (const charge of (unpaidCharges || []) as RentCharge[]) {
          if (remainingAmount <= 0) break

          const allocateAmount = Math.min(remainingAmount, charge.balance)

          // Create allocation record
          const { error: allocError } = await supabase
            .from('payment_allocations')
            .insert({
              landlord_id: landlord.id,
              payment_id: newPayment.id,
              rent_charge_id: charge.id,
              allocated_amount: allocateAmount,
            })

          if (allocError) {
            console.error('Error creating allocation:', allocError)
            fullyAllocated = false
            continue
          }

          // Update rent charge balance and status
          const newBalance = charge.balance - allocateAmount
          const newStatus = newBalance <= 0 ? 'PAID' : newBalance < charge.amount ? 'PARTIAL' : 'UNPAID'

          const { error: updateChargeError } = await supabase
            .from('rent_charges')
            .update({ balance: newBalance, status: newStatus })
            .eq('id', charge.id)

          if (updateChargeError) {
            console.error('Error updating rent charge:', updateChargeError)
          }

          remainingAmount -= allocateAmount
        }

        // Mark payment as matched if fully allocated
        if (remainingAmount <= 0 && fullyAllocated) {
          await supabase
            .from('payments')
            .update({ is_matched: true })
            .eq('id', newPayment.id)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['rent-charges', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['payment-allocations', landlord?.id] })
      // Also invalidate related queries used by other pages
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-tenancies', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-charges-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-for-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['current-month-payments-tenancies', landlord?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: PaymentFormState) => {
      if (!payload.id) throw new Error('Missing payment id')
      if (!landlord) throw new Error('Landlord profile not loaded')

      const amount = parseInt(payload.amount, 10)
      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number')
      }

      // Get the old payment to compare what changed
      const { data: oldPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payload.id)
        .single()
      if (fetchError) throw fetchError

      const amountChanged = oldPayment.amount !== amount
      const tenancyChanged = oldPayment.tenancy_id !== (payload.tenancyId || null)

      // Update the payment
      const { error } = await supabase
        .from('payments')
        .update({
          amount,
          paid_at: payload.paidAt || new Date().toISOString(),
          source: payload.source,
          phone_number: null,
          raw_reference: payload.rawReference.trim() || null,
          tenancy_id: payload.tenancyId || null,
          notes: payload.paymentMethod,
          is_matched: false, // Will be recalculated
        })
        .eq('id', payload.id)
      if (error) throw error

      // If amount or tenancy changed, recalculate allocations
      if (amountChanged || tenancyChanged) {
        // Get existing allocations for this payment
        const { data: existingAllocations } = await supabase
          .from('payment_allocations')
          .select('id, rent_charge_id, allocated_amount')
          .eq('payment_id', payload.id)

        // Reverse old allocations - restore balances on rent charges
        if (existingAllocations && existingAllocations.length > 0) {
          for (const alloc of existingAllocations) {
            // Get current charge
            const { data: charge } = await supabase
              .from('rent_charges')
              .select('amount, balance')
              .eq('id', alloc.rent_charge_id)
              .single()

            if (charge) {
              const newBalance = Math.min(charge.balance + alloc.allocated_amount, charge.amount)
              const newStatus = newBalance >= charge.amount ? 'UNPAID' : newBalance > 0 ? 'PARTIAL' : 'PAID'
              
              await supabase
                .from('rent_charges')
                .update({ balance: newBalance, status: newStatus })
                .eq('id', alloc.rent_charge_id)
            }
          }

          // Delete old allocations
          await supabase
            .from('payment_allocations')
            .delete()
            .eq('payment_id', payload.id)
        }

        // If tenancy is selected, reallocate to new tenancy's charges
        if (payload.tenancyId) {
          const { data: unpaidCharges } = await supabase
            .from('rent_charges')
            .select('*')
            .eq('landlord_id', landlord.id)
            .eq('tenancy_id', payload.tenancyId)
            .gt('balance', 0)
            .order('period', { ascending: true })

          let remainingAmount = amount
          let fullyAllocated = true

          for (const charge of (unpaidCharges || []) as RentCharge[]) {
            if (remainingAmount <= 0) break

            const allocateAmount = Math.min(remainingAmount, charge.balance)

            const { error: allocError } = await supabase
              .from('payment_allocations')
              .insert({
                landlord_id: landlord.id,
                payment_id: payload.id,
                rent_charge_id: charge.id,
                allocated_amount: allocateAmount,
              })

            if (allocError) {
              console.error('Error creating allocation:', allocError)
              fullyAllocated = false
              continue
            }

            const newBalance = charge.balance - allocateAmount
            const newStatus = newBalance <= 0 ? 'PAID' : newBalance < charge.amount ? 'PARTIAL' : 'UNPAID'

            await supabase
              .from('rent_charges')
              .update({ balance: newBalance, status: newStatus })
              .eq('id', charge.id)

            remainingAmount -= allocateAmount
          }

          // Update payment matched status
          if (remainingAmount <= 0 && fullyAllocated) {
            await supabase
              .from('payments')
              .update({ is_matched: true })
              .eq('id', payload.id)
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['rent-charges', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['payment-allocations', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-tenancies', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-charges-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-rent-charges-for-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['current-month-payments-tenancies', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-payments-for-tenants', landlord?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-allocations-for-tenants', landlord?.id] })
    },
  })

  const openCreateForm = () => {
    setFormState({
      id: undefined,
      amount: '',
      paidAt: '',
      source: 'MANUAL',
      paymentMethod: 'CASH',
      rawReference: '',
      tenancyId: '',
    })
    setIsEditMode(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (payment: Payment) => {
    // Do not allow editing of M-Pesa payments to protect data integrity
    if (payment.source === 'MPESA') {
      return
    }

    setFormState({
      id: payment.id,
      amount: payment.amount.toString(),
      paidAt: payment.paid_at,
      source: payment.source as PaymentSource,
      paymentMethod:
        payment.notes === 'CASH' ||
        payment.notes === 'BANK' ||
        payment.notes === 'CHEQUE' ||
        payment.notes === 'OTHER'
          ? (payment.notes as PaymentFormState['paymentMethod'])
          : 'CASH',
      rawReference: payment.raw_reference || '',
      tenancyId: payment.tenancy_id || '',
    })
    setIsEditMode(true)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formState.amount) {
      setFormError('Amount is required')
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
      const message = err instanceof Error ? err.message : 'Failed to save payment'
      setFormError(message)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isLoadingAny = isLoadingTenancies || isLoadingPayments

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Record non-M-Pesa payments such as cash, bank transfer, or cheque. M-Pesa rent payments
            are imported automatically and will appear here when synced.
          </p>
        </div>
        <Button onClick={openCreateForm} disabled={isLoadingAny}>
          <Plus className="mr-2 h-4 w-4" />
          Record non-M-Pesa payment
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>
              {isEditMode ? 'Edit non-M-Pesa payment' : 'Record non-M-Pesa payment'}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Update the details of this non-M-Pesa payment.'
                : 'Record a new non-M-Pesa payment, such as cash, cheque, or bank transfer. M-Pesa rent payments are created automatically from your M-Pesa integration.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              {/* Step 1: Select tenancy first */}
              <div className="space-y-2">
                <Label htmlFor="tenancy">Select tenancy</Label>
                <select
                  id="tenancy"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formState.tenancyId}
                  onChange={(e) => {
                    const selectedTenancyId = e.target.value
                    const selectedTenancy = tenancyMap.get(selectedTenancyId)
                    
                    setFormState((prev) => ({
                      ...prev,
                      tenancyId: selectedTenancyId,
                      // Auto-fill amount with monthly rent from selected tenancy
                      amount: selectedTenancy ? selectedTenancy.monthly_rent_amount.toString() : prev.amount,
                    }))
                  }}
                  disabled={isSaving || isLoadingTenancies}
                >
                  <option value="">Select tenant / unit...</option>
                  {(tenancies || []).map((t) => {
                    const tenant = tenantMap.get(t.tenant_id)
                    const unit = unitMap.get(t.unit_id)
                    const property = unit ? propertyMap.get(unit.property_id) : undefined

                    return (
                      <option key={t.id} value={t.id}>
                        {tenant?.full_name || 'Tenant'} - {property?.property_name || 'Property'}
                        {unit && ` (${unit.unit_code})`} - {formatKES(t.monthly_rent_amount)}/month
                      </option>
                    )
                  })}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selecting a tenancy will auto-fill the amount with the monthly rent. You can adjust it if needed.
                </p>
              </div>

              {/* Step 2: Amount, date, and payment method */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount paid (KES)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={formState.amount}
                    onChange={(e) => setFormState((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="25000"
                    required
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can edit this amount for partial payments or different amounts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidAt">Date paid</Label>
                  <Input
                    id="paidAt"
                    type="date"
                    value={formState.paidAt}
                    onChange={(e) => setFormState((prev) => ({ ...prev, paidAt: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <select
                    id="paymentMethod"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formState.paymentMethod}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as PaymentFormState['paymentMethod'],
                      }))
                    }
                    disabled={isSaving}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="rawReference">Payment reference (optional)</Label>
                <Input
                  id="rawReference"
                  value={formState.rawReference}
                  onChange={(e) => setFormState((prev) => ({ ...prev, rawReference: e.target.value }))}
                  placeholder="Bank slip number, cheque number, etc. (optional)"
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
          <CardTitle>Your payments</CardTitle>
          <CardDescription>
            Overview of all payments received (both M-Pesa and non-M-Pesa), with optional tenancy links.
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

          {!isLoadingAny && !isPaymentsError && (!payments || payments.length === 0) && (
            <p className="text-sm text-muted-foreground">
              You have not recorded any payments yet. M-Pesa rent payments will appear here once
              your integration is active. Use "Record non-M-Pesa payment" for cash, cheque, or
              bank transfers.
            </p>
          )}

          {!isLoadingAny && !isPaymentsError && payments && payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tenant</th>
                    <th className="py-2 pr-4">Property / Unit</th>
                    <th className="py-2 pr-4">Date paid</th>
                    <th className="py-2 pr-4">Amount paid</th>
                    <th className="py-2 pr-4">Mode of payment</th>
                    <th className="py-2 pr-4">Matched</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const tenancy = payment.tenancy_id
                      ? tenancyMap.get(payment.tenancy_id)
                      : undefined
                    const tenant = tenancy ? tenantMap.get(tenancy.tenant_id) : undefined
                    const unit = tenancy ? unitMap.get(tenancy.unit_id) : undefined
                    const property = unit ? propertyMap.get(unit.property_id) : undefined

                    return (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">
                          {capitalize(tenant?.full_name) ||
                            (payment.phone_number || payment.raw_reference ? 'Unlinked' : '-')}
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
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatKES(payment.amount)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {payment.source === 'MPESA'
                            ? 'M-Pesa'
                            : payment.notes === 'CASH'
                            ? 'Manual (Cash)'
                            : payment.notes === 'BANK'
                            ? 'Manual (Bank transfer)'
                            : payment.notes === 'CHEQUE'
                            ? 'Manual (Cheque)'
                            : 'Manual'}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {payment.is_matched ? 'Yes' : 'No'}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {payment.raw_reference || payment.mpesa_trans_id || '-'}
                        </td>
                        <td className="py-2 pr-4 flex justify-end gap-2">
                          {payment.source === 'MPESA' ? (
                            <span className="text-xs text-muted-foreground italic">Not editable</span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditForm(payment)}
                              disabled={isSaving}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          )}
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
