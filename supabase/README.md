# Multi-Tenancy & RLS Convention

## The Rule

> **Every business-scoped table MUST include a `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE` column.**

This is enforced by convention. When adding any new table (clients, invoices, products, etc.), always include `business_id`.

## RLS Pattern

Every new business-scoped table should follow this pattern:

```sql
-- 1. Create the table
CREATE TABLE public.my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- ... your columns ...
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- 3. Add policies using the helper functions

-- Members can read rows from their businesses
CREATE POLICY "Members can read own my_table"
  ON public.my_table FOR SELECT
  USING (public.is_member_of(business_id));

-- Members can insert rows for their businesses
CREATE POLICY "Members can insert my_table"
  ON public.my_table FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

-- Admins/owners can update
CREATE POLICY "Admins can update my_table"
  ON public.my_table FOR UPDATE
  USING (public.is_admin_or_owner_of(business_id));

-- Admins/owners can delete
CREATE POLICY "Admins can delete my_table"
  ON public.my_table FOR DELETE
  USING (public.is_admin_or_owner_of(business_id));
```

## Helper Functions

These `SECURITY DEFINER` functions bypass RLS to check membership, avoiding infinite recursion:

| Function | Returns `true` when... |
|---|---|
| `public.is_member_of(biz_id)` | Current user is any member of the business |
| `public.is_owner_of(biz_id)` | Current user is the owner |
| `public.is_admin_or_owner_of(biz_id)` | Current user is admin or owner |

## Audit Logging

Use the `insert_audit_log()` function from app code:

```typescript
// In a server action or API route
const { data: logId } = await supabase.rpc('insert_audit_log', {
  p_business_id: businessId,
  p_action: 'update',
  p_entity_type: 'invoice',
  p_entity_id: invoiceId,
  p_before: oldData,
  p_after: newData,
});
```

Or call it from SQL triggers:

```sql
PERFORM public.insert_audit_log(
  NEW.business_id, 'create', 'invoice', NEW.id, NULL, to_jsonb(NEW)
);
```

## Deny by Default

- If a table has RLS enabled but **no policies**, nobody (except service role) can access it
- This is the desired behavior — every table must have explicit policies
- Never add `ALTER TABLE ... FORCE ROW LEVEL SECURITY` for the service role unless required

## Testing

Run the isolation test:

```bash
npx tsx supabase/test-isolation.ts
```

This signs in as two demo users and verifies they cannot cross-read or cross-write each other's data.

## Migrations

Migrations live in `supabase/migrations/` and are numbered sequentially:

```
supabase/
├── migrations/
│   ├── 001_audit_logs.sql          # Audit logs table
│   ├── 002_audit_log_helper.sql    # insert_audit_log() function
│   └── 003_consolidated_rls.sql    # All RLS policies
├── seed.sql                        # Demo data (2 users, 2 businesses)
└── test-isolation.ts               # Tenant isolation tests
```

Run migrations in order in the Supabase SQL Editor. The seed script should be run last.
