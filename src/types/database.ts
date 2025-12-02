export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      landlords: {
        Row: {
          business_name: string | null
          created_at: string
          default_rent_due_day: number
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_suspended: boolean
          paid_until: string | null
          phone_number: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          default_rent_due_day?: number
          email: string
          full_name: string
          id: string
          is_admin?: boolean
          is_suspended?: boolean
          paid_until?: string | null
          phone_number?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          default_rent_due_day?: number
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          is_suspended?: boolean
          paid_until?: string | null
          phone_number?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlords_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      mpesa_settings: {
        Row: {
          callback_url: string | null
          consumer_key_encrypted: string | null
          consumer_secret_encrypted: string | null
          created_at: string
          id: string
          landlord_id: string
          passkey_encrypted: string | null
          paybill_or_till_number: string | null
          shortcode: string | null
          status: string
          updated_at: string
        }
        Insert: {
          callback_url?: string | null
          consumer_key_encrypted?: string | null
          consumer_secret_encrypted?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          passkey_encrypted?: string | null
          paybill_or_till_number?: string | null
          shortcode?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          callback_url?: string | null
          consumer_key_encrypted?: string | null
          consumer_secret_encrypted?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          passkey_encrypted?: string | null
          paybill_or_till_number?: string | null
          shortcode?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_settings_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: true
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string
          id: string
          landlord_id: string
          payment_id: string
          rent_charge_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string
          id?: string
          landlord_id: string
          payment_id: string
          rent_charge_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          payment_id?: string
          rent_charge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_rent_charge_id_fkey"
            columns: ["rent_charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_matched: boolean
          landlord_id: string
          mpesa_trans_id: string | null
          notes: string | null
          paid_at: string
          phone_number: string | null
          raw_reference: string | null
          source: string
          tenancy_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_matched?: boolean
          landlord_id: string
          mpesa_trans_id?: string | null
          notes?: string | null
          paid_at?: string
          phone_number?: string | null
          raw_reference?: string | null
          source: string
          tenancy_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_matched?: boolean
          landlord_id?: string
          mpesa_trans_id?: string | null
          notes?: string | null
          paid_at?: string
          phone_number?: string | null
          raw_reference?: string | null
          source?: string
          tenancy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_properties: number
          max_units_per_property: number
          max_units_total: number | null
          monthly_price: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_properties?: number
          max_units_per_property?: number
          max_units_total?: number | null
          monthly_price?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_properties?: number
          max_units_per_property?: number
          max_units_total?: number | null
          monthly_price?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_mpesa_settings: {
        Row: {
          callback_url: string | null
          consumer_key_encrypted: string | null
          consumer_secret_encrypted: string | null
          created_at: string
          id: string
          passkey_encrypted: string | null
          subscription_paybill_or_till: string | null
          updated_at: string
        }
        Insert: {
          callback_url?: string | null
          consumer_key_encrypted?: string | null
          consumer_secret_encrypted?: string | null
          created_at?: string
          id?: string
          passkey_encrypted?: string | null
          subscription_paybill_or_till?: string | null
          updated_at?: string
        }
        Update: {
          callback_url?: string | null
          consumer_key_encrypted?: string | null
          consumer_secret_encrypted?: string | null
          created_at?: string
          id?: string
          passkey_encrypted?: string | null
          subscription_paybill_or_till?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          landlord_id: string
          mpesa_trans_id: string | null
          notes: string | null
          paid_at: string
          plan: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          landlord_id: string
          mpesa_trans_id?: string | null
          notes?: string | null
          paid_at?: string
          plan: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          mpesa_trans_id?: string | null
          notes?: string | null
          paid_at?: string
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          landlord_id: string
          location: string | null
          notes: string | null
          property_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          landlord_id: string
          location?: string | null
          notes?: string | null
          property_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          landlord_id?: string
          location?: string | null
          notes?: string | null
          property_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_charges: {
        Row: {
          amount: number
          balance: number
          created_at: string
          due_date: string
          id: string
          landlord_id: string
          period: string
          status: string
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance: number
          created_at?: string
          due_date: string
          id?: string
          landlord_id: string
          period: string
          status?: string
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          due_date?: string
          id?: string
          landlord_id?: string
          period?: string
          status?: string
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          created_at: string
          deposit_required: number | null
          end_date: string | null
          id: string
          landlord_id: string
          monthly_rent_amount: number
          move_in_charges: Json | null
          rent_due_day: number | null
          start_date: string
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_required?: number | null
          end_date?: string | null
          id?: string
          landlord_id: string
          monthly_rent_amount: number
          move_in_charges?: Json | null
          rent_due_day?: number | null
          start_date: string
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_required?: number | null
          end_date?: string | null
          id?: string
          landlord_id?: string
          monthly_rent_amount?: number
          move_in_charges?: Json | null
          rent_due_day?: number | null
          start_date?: string
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          full_name: string
          id: string
          id_number: string | null
          is_archived: boolean
          landlord_id: string
          notes: string | null
          phone_numbers: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          id_number?: string | null
          is_archived?: boolean
          landlord_id: string
          notes?: string | null
          phone_numbers?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          id_number?: string | null
          is_archived?: boolean
          landlord_id?: string
          notes?: string | null
          phone_numbers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          landlord_id: string
          monthly_rent_amount: number
          property_id: string
          status: string
          unit_code: string
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          landlord_id: string
          monthly_rent_amount?: number
          property_id: string
          status?: string
          unit_code: string
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          landlord_id?: string
          monthly_rent_amount?: number
          property_id?: string
          status?: string
          unit_code?: string
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      generate_rent_charges_for_current_month: {
        Args: Record<string, never>
        Returns: {
          tenancy_id: string
          tenant_name: string
          amount: number
          due_date: string
          created: boolean
        }[]
      }
      generate_rent_charges_for_period: {
        Args: { target_period: string }
        Returns: {
          tenancy_id: string
          tenant_name: string
          amount: number
          due_date: string
          created: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type Landlord = Tables<'landlords'>
export type Property = Tables<'properties'>
export type Unit = Tables<'units'>
export type Tenant = Tables<'tenants'>
export type Tenancy = Tables<'tenancies'>
export type RentCharge = Tables<'rent_charges'>
export type Payment = Tables<'payments'>
export type PaymentAllocation = Tables<'payment_allocations'>
export type MpesaSettings = Tables<'mpesa_settings'>
export type Plan = Tables<'plans'>
export type PlatformPayment = Tables<'platform_payments'>
export type PlatformMpesaSettings = Tables<'platform_mpesa_settings'>

// Phone number type for tenants
export type PhoneNumber = {
  number: string
  label?: string
}

// Move-in charge type for tenancies
export type MoveInCharge = {
  name: string
  amount: number
}

// Unit status enum
export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'RESERVED'

// Tenancy status enum
export type TenancyStatus = 'ACTIVE' | 'NOTICE' | 'ENDED'

// Rent charge status enum
export type RentChargeStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

// Payment source enum
export type PaymentSource = 'MPESA' | 'MANUAL'

// M-Pesa settings status enum
export type MpesaSettingsStatus = 'ACTIVE' | 'INACTIVE'

// Plan code enum
export type PlanCode = 'basic' | 'standard' | 'premium' | 'enterprise'
