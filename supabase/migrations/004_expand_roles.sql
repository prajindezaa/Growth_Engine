-- ============================================================
-- Migration 004: Expand Role Set
-- ============================================================

-- Drop old constraint and add expanded role set
ALTER TABLE public.business_members
  DROP CONSTRAINT IF EXISTS business_members_role_check;

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'viewer'));
