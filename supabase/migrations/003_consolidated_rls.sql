-- ============================================================
-- Migration 003: Consolidated RLS Policies
-- Ensures deny-by-default for all business-scoped tables.
-- Uses SECURITY DEFINER helper functions to avoid recursion.
-- ============================================================

-- ── Helper functions (idempotent) ──

CREATE OR REPLACE FUNCTION public.is_member_of(biz_id UUID)
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
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of(biz_id UUID)
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
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_of(biz_id UUID)
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
      AND role IN ('owner', 'admin')
  );
$$;

-- ── profiles ──
-- (Already has RLS enabled from Phase 1)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── businesses ──
DROP POLICY IF EXISTS "Members can read own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete own businesses" ON public.businesses;

CREATE POLICY "Members can read own businesses"
  ON public.businesses FOR SELECT
  USING (public.is_member_of(id));

CREATE POLICY "Authenticated users can create businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update own businesses"
  ON public.businesses FOR UPDATE
  USING (public.is_owner_of(id));

CREATE POLICY "Owners can delete own businesses"
  ON public.businesses FOR DELETE
  USING (public.is_owner_of(id));

-- ── business_members ──
DROP POLICY IF EXISTS "Members can read memberships" ON public.business_members;
DROP POLICY IF EXISTS "Users can add themselves as owner" ON public.business_members;
DROP POLICY IF EXISTS "Owners can add members" ON public.business_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.business_members;

CREATE POLICY "Members can read memberships"
  ON public.business_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_owner_of(business_id)
  );

CREATE POLICY "Users can add themselves as owner"
  ON public.business_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'owner');

CREATE POLICY "Owners can add members"
  ON public.business_members FOR INSERT
  WITH CHECK (public.is_owner_of(business_id));

CREATE POLICY "Owners can remove members"
  ON public.business_members FOR DELETE
  USING (public.is_owner_of(business_id));

-- ── audit_logs ──
DROP POLICY IF EXISTS "Members can read own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;

-- Only admins/owners can read audit logs for their business
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin_or_owner_of(business_id));

-- Insert is handled via the SECURITY DEFINER insert_audit_log() function,
-- but we also allow direct insert for members (for app-level logging)
CREATE POLICY "Members can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

-- No UPDATE or DELETE policies — audit logs are immutable
