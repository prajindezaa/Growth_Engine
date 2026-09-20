-- ============================================================
-- Migration 022: Expand Role Set to 7 Roles
-- ============================================================

-- 1. Migrate legacy role names in business_members and invites
UPDATE public.business_members
  SET role = 'sales'
  WHERE role IN ('staff', 'viewer');

UPDATE public.invites
  SET role = 'sales'
  WHERE role IN ('staff', 'viewer');

-- 2. Update check constraint on business_members
ALTER TABLE public.business_members
  DROP CONSTRAINT IF EXISTS business_members_role_check;

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'accountant', 'delivery', 'cashier'));

-- 3. Update check constraint on invites
ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_role_check;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_role_check
  CHECK (role IN ('admin', 'manager', 'sales', 'accountant', 'delivery', 'cashier'));

-- 4. Helper function to check specific roles securely without recursion
CREATE OR REPLACE FUNCTION public.has_role(biz_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = biz_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

-- 5. Granular permission helper functions
CREATE OR REPLACE FUNCTION public.can_manage_sales(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.has_role(biz_id, ARRAY['owner', 'admin', 'manager', 'sales', 'cashier']);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_inventory(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.has_role(biz_id, ARRAY['owner', 'admin', 'manager']);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_purchases(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.has_role(biz_id, ARRAY['owner', 'admin', 'manager', 'accountant']);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_payments(biz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.has_role(biz_id, ARRAY['owner', 'admin', 'manager', 'accountant', 'cashier']);
$$;
