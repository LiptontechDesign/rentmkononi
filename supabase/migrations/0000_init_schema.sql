-- 0000_init_schema.sql
-- RentMkononi initial database schema for Supabase
-- This file recreates the current production schema: tables, functions,
-- triggers, seed data, and RLS policies.

-- Enable required extensions
create extension if not exists "pgcrypto";

-- =====================================================================
-- Helper functions
-- =====================================================================

-- Admin check used by RLS policies
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.landlords
    where id = auth.uid()
      and is_admin = true
  );
end;
$$;

-- Generic updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- Tables
-- =====================================================================

-- Subscription plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price integer not null default 0,
  max_properties integer not null default 1,
  max_units_per_property integer not null default 10,
  max_units_total integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plans is 'Subscription plans for RentMkononi SaaS';

-- Landlords (multi-tenant root entity)
create table if not exists public.landlords (
  id uuid primary key references auth.users(id),
  full_name text not null,
  business_name text,
  email text not null unique,
  phone_number text,
  plan text not null default 'basic',
  paid_until date,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landlords_plan_fkey foreign key (plan) references public.plans(code)
);

comment on table public.landlords is 'Landlord accounts for RentMkononi multi-tenant SaaS';

-- Properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  property_name text not null,
  location text,
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is 'Properties (buildings/plots) managed by each landlord';

-- Units within properties
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  property_id uuid not null references public.properties(id),
  unit_code text not null,
  unit_type text,
  monthly_rent_amount integer not null default 0,
  status text not null default 'VACANT' check (status = any (array['VACANT','OCCUPIED','RESERVED'])),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.units is 'Rentable units (houses/rooms) within properties';

-- Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  full_name text not null,
  id_number text,
  phone_numbers jsonb default '[]'::jsonb,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenants is 'Tenants who rent units from landlords';
comment on column public.tenants.phone_numbers is 'Array of {number, label} objects for multiple phone numbers';

-- Tenancies linking tenants to units
create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  tenant_id uuid not null references public.tenants(id),
  unit_id uuid not null references public.units(id),
  start_date date not null,
  end_date date,
  monthly_rent_amount integer not null,
  deposit_required integer default 0,
  status text not null default 'ACTIVE' check (status = any (array['ACTIVE','NOTICE','ENDED'])),
  move_in_charges jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenancies is 'Tenancy records linking tenants to units over time';
comment on column public.tenancies.move_in_charges is 'Array of {name, amount} for one-time move-in fees';

-- Rent charges
create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  tenancy_id uuid not null references public.tenancies(id),
  period text not null,
  amount integer not null,
  due_date date not null,
  status text not null default 'UNPAID' check (status = any (array['UNPAID','PARTIAL','PAID'])),
  balance integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rent_charges is 'Monthly rent charges for tenancies';
comment on column public.rent_charges.period is 'Month in YYYY-MM format, e.g., 2025-06';

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  tenancy_id uuid references public.tenancies(id),
  amount integer not null,
  source text not null check (source = any (array['MPESA','MANUAL'])),
  mpesa_trans_id text,
  phone_number text,
  raw_reference text,
  paid_at timestamptz not null default now(),
  notes text,
  is_matched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Payment transactions from tenants (M-Pesa or manual entry)';

-- Payment allocations
create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  payment_id uuid not null references public.payments(id),
  rent_charge_id uuid not null references public.rent_charges(id),
  allocated_amount integer not null,
  created_at timestamptz not null default now()
);

comment on table public.payment_allocations is 'Links payments to rent charges showing how much was allocated';

-- Per-landlord M-Pesa settings
create table if not exists public.mpesa_settings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null unique references public.landlords(id),
  paybill_or_till_number text,
  shortcode text,
  consumer_key_encrypted text,
  consumer_secret_encrypted text,
  passkey_encrypted text,
  callback_url text,
  status text not null default 'INACTIVE' check (status = any (array['ACTIVE','INACTIVE'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mpesa_settings is 'Per-landlord M-Pesa/Daraja API credentials (encrypted)';

-- Platform subscription payments from landlords
create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords(id),
  amount integer not null,
  mpesa_trans_id text,
  plan text not null,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_payments is 'Subscription payments from landlords to the RentMkononi platform';

-- Platform-wide M-Pesa settings (single row)
create table if not exists public.platform_mpesa_settings (
  id uuid primary key default gen_random_uuid(),
  subscription_paybill_or_till text,
  consumer_key_encrypted text,
  consumer_secret_encrypted text,
  passkey_encrypted text,
  callback_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_mpesa_settings is 'Platform owner M-Pesa credentials for subscription payments (single row)';

-- =====================================================================
-- Triggers for updated_at
-- =====================================================================

create trigger update_plans_updated_at
before update on public.plans
for each row execute function public.update_updated_at_column();

create trigger update_landlords_updated_at
before update on public.landlords
for each row execute function public.update_updated_at_column();

create trigger update_properties_updated_at
before update on public.properties
for each row execute function public.update_updated_at_column();

create trigger update_units_updated_at
before update on public.units
for each row execute function public.update_updated_at_column();

create trigger update_tenants_updated_at
before update on public.tenants
for each row execute function public.update_updated_at_column();

create trigger update_tenancies_updated_at
before update on public.tenancies
for each row execute function public.update_updated_at_column();

create trigger update_rent_charges_updated_at
before update on public.rent_charges
for each row execute function public.update_updated_at_column();

create trigger update_payments_updated_at
before update on public.payments
for each row execute function public.update_updated_at_column();

create trigger update_payment_platform_updated_at
before update on public.platform_payments
for each row execute function public.update_updated_at_column();

create trigger update_mpesa_settings_updated_at
before update on public.mpesa_settings
for each row execute function public.update_updated_at_column();

create trigger update_platform_mpesa_settings_updated_at
before update on public.platform_mpesa_settings
for each row execute function public.update_updated_at_column();

-- =====================================================================
-- Seed data
-- =====================================================================

insert into public.plans (code, name, monthly_price, max_properties, max_units_per_property, max_units_total, is_active)
values
  ('basic', 'Basic', 0, 1, 10, 10, true),
  ('standard', 'Standard', 500, 3, 50, 150, true),
  ('premium', 'Premium', 1500, 10, 100, 1000, true),
  ('enterprise', 'Enterprise', 0, 100, 500, 50000, true)
on conflict (code) do nothing;

-- =====================================================================
-- Row Level Security (RLS)
-- =====================================================================

-- Enable RLS on all tenant-specific tables
alter table public.landlords enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.tenancies enable row level security;
alter table public.rent_charges enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.mpesa_settings enable row level security;
alter table public.platform_payments enable row level security;
alter table public.platform_mpesa_settings enable row level security;
alter table public.plans enable row level security;

-- Landlords RLS
create policy "Landlords can insert own record" on public.landlords
  for insert
  to public
  with check (auth.uid() = id);

create policy "Landlords can update own record" on public.landlords
  for update
  to public
  using (auth.uid() = id);

create policy "Landlords can view own record" on public.landlords
  for select
  to public
  using (auth.uid() = id);

create policy "Admins can view all landlords" on public.landlords
  for select
  to public
  using (is_admin());

create policy "Admins can update all landlords" on public.landlords
  for update
  to public
  using (is_admin());

-- Properties RLS
create policy "Landlords can insert own properties" on public.properties
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own properties" on public.properties
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own properties" on public.properties
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own properties" on public.properties
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all properties" on public.properties
  for select
  to public
  using (is_admin());

-- Units RLS
create policy "Landlords can insert own units" on public.units
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own units" on public.units
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own units" on public.units
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own units" on public.units
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all units" on public.units
  for select
  to public
  using (is_admin());

-- Tenants RLS
create policy "Landlords can insert own tenants" on public.tenants
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own tenants" on public.tenants
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own tenants" on public.tenants
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own tenants" on public.tenants
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all tenants" on public.tenants
  for select
  to public
  using (is_admin());

-- Tenancies RLS
create policy "Landlords can insert own tenancies" on public.tenancies
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own tenancies" on public.tenancies
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own tenancies" on public.tenancies
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own tenancies" on public.tenancies
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all tenancies" on public.tenancies
  for select
  to public
  using (is_admin());

-- Rent charges RLS
create policy "Landlords can insert own rent_charges" on public.rent_charges
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own rent_charges" on public.rent_charges
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own rent_charges" on public.rent_charges
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own rent_charges" on public.rent_charges
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all rent_charges" on public.rent_charges
  for select
  to public
  using (is_admin());

-- Payments RLS
create policy "Landlords can insert own payments" on public.payments
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own payments" on public.payments
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own payments" on public.payments
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own payments" on public.payments
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all payments" on public.payments
  for select
  to public
  using (is_admin());

-- Payment allocations RLS
create policy "Landlords can insert own allocations" on public.payment_allocations
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own allocations" on public.payment_allocations
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can delete own allocations" on public.payment_allocations
  for delete
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own allocations" on public.payment_allocations
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all allocations" on public.payment_allocations
  for select
  to public
  using (is_admin());

-- Landlord M-Pesa settings RLS
create policy "Landlords can insert own mpesa_settings" on public.mpesa_settings
  for insert
  to public
  with check (landlord_id = auth.uid());

create policy "Landlords can update own mpesa_settings" on public.mpesa_settings
  for update
  to public
  using (landlord_id = auth.uid());

create policy "Landlords can view own mpesa_settings" on public.mpesa_settings
  for select
  to public
  using (landlord_id = auth.uid());

create policy "Admins can view all mpesa_settings" on public.mpesa_settings
  for select
  to public
  using (is_admin());

-- Platform payments RLS
create policy "Admins can insert platform_payments" on public.platform_payments
  for insert
  to public
  with check (is_admin());

create policy "Admins can update platform_payments" on public.platform_payments
  for update
  to public
  using (is_admin());

create policy "Admins can view all platform_payments" on public.platform_payments
  for select
  to public
  using (is_admin());

create policy "Landlords can view own platform_payments" on public.platform_payments
  for select
  to public
  using (landlord_id = auth.uid());

-- Platform M-Pesa settings RLS
create policy "Admins can insert platform_mpesa_settings" on public.platform_mpesa_settings
  for insert
  to public
  with check (is_admin());

create policy "Admins can update platform_mpesa_settings" on public.platform_mpesa_settings
  for update
  to public
  using (is_admin());

create policy "Admins can view platform_mpesa_settings" on public.platform_mpesa_settings
  for select
  to public
  using (is_admin());

-- Plans RLS
create policy "Admins can insert plans" on public.plans
  for insert
  to public
  with check (is_admin());

create policy "Admins can update plans" on public.plans
  for update
  to public
  using (is_admin());

create policy "Admins can delete plans" on public.plans
  for delete
  to public
  using (is_admin());

create policy "Plans are readable by all authenticated users" on public.plans
  for select
  to public
  using (auth.role() = 'authenticated');
