# RentMkononi Security Guidelines

## Critical Security Rules

### 1. Environment Variables & API Keys

#### SAFE for Frontend (.env with VITE_ prefix)
These are **publishable keys** designed to be public:
- `VITE_SUPABASE_URL` - Public Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key (RLS protects data)

#### NEVER in Frontend (server-side only)
These must **ONLY** exist in Supabase Edge Function environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, admin access
- M-Pesa Daraja credentials (Consumer Key, Consumer Secret, Passkey)
- Encryption keys for M-Pesa credential storage
- Any database admin passwords

### 2. .env Files
- `.env` files are in `.gitignore` - NEVER commit them
- Use `.env.example` as a template (no real values)
- Each developer/environment has their own `.env`

### 3. M-Pesa Credentials Security

Per the design specification:
- M-Pesa keys are **encrypted at rest** in the database
- Keys are **only decrypted in Edge Functions** (server-side)
- Frontend **never** sees raw M-Pesa credentials
- Landlord settings page shows only masked values (e.g., `***********1234`)

**Server-side only rule:**
> Secrets are used only in server-side code paths such as API routes, 
> route handlers, server components, edge functions, scheduled jobs/cron, 
> and other backend logic. Secrets are never imported, referenced, or 
> accessed in any client-side code path.

### 4. Row Level Security (RLS)

All tenant-specific tables have RLS enabled:
- Each landlord can only see/modify their own data
- RLS policies check `auth.uid() = landlord_id`
- Admin users have override policies via `is_admin()` function

**Tables with RLS:**
- landlords, properties, units, tenants, tenancies
- rent_charges, payments, payment_allocations
- mpesa_settings, platform_payments

### 5. Authentication

- Supabase Auth handles user sessions securely
- Passwords are hashed (bcrypt) by Supabase
- Google OAuth tokens are managed by Supabase
- Session tokens are HTTP-only where possible

### 6. Data Protection

- All API calls use HTTPS
- Supabase project is in a secure region (EU Central)
- Database backups are encrypted
- Sensitive fields (M-Pesa keys) use application-level encryption

### 7. Code Review Checklist

Before committing, verify:
- [ ] No API keys or secrets in code files
- [ ] No `.env` files committed
- [ ] M-Pesa logic only in Edge Functions
- [ ] RLS policies not bypassed in frontend
- [ ] No `service_role` key usage in frontend

### 8. Reporting Security Issues

If you discover a security vulnerability:
1. Do NOT open a public issue
2. Contact the platform owner directly
3. Provide details privately

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React App (Browser)                                        │
│  - Uses ONLY anon key                                       │
│  - All data filtered by RLS                                 │
│  - NO secrets, NO M-Pesa keys                               │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (anon key in header)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                  │
├─────────────────────────────────────────────────────────────┤
│  Auth Service          │  Row Level Security enforced       │
├─────────────────────────────────────────────────────────────┤
│  Edge Functions (Deno) │  ← M-Pesa API calls happen here    │
│  - Has SERVICE_ROLE    │  ← Encryption/decryption here      │
│  - Has M-Pesa secrets  │  ← Callbacks processed here        │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database   │  M-Pesa keys stored ENCRYPTED      │
└─────────────────────────────────────────────────────────────┘
```

This ensures that even if someone inspects frontend code or network traffic,
they cannot access M-Pesa credentials or bypass multi-tenant isolation.
