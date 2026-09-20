-- ============================================================
-- Migration 005: Invites Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_business_id ON public.invites(business_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins/owners can read invites for their business
CREATE POLICY "Admins can read invites"
  ON public.invites FOR SELECT
  USING (public.is_admin_or_owner_of(business_id));

-- Admins/owners can create invites
CREATE POLICY "Admins can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (public.is_admin_or_owner_of(business_id));

-- Admins/owners can update invites (e.g. cancel)
CREATE POLICY "Admins can update invites"
  ON public.invites FOR UPDATE
  USING (public.is_admin_or_owner_of(business_id));

-- Anyone can read invite by token (for the public accept page)
-- We handle this via a SECURITY DEFINER function instead
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  business_name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    i.id,
    i.business_id,
    b.name AS business_name,
    i.email,
    i.role,
    i.status,
    i.expires_at
  FROM public.invites i
  JOIN public.businesses b ON b.id = i.business_id
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > now();
$$;

-- Accept invite function
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.invites
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Add user to business
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_invite.business_id, v_user_id, v_invite.role)
  ON CONFLICT (business_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE public.invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN v_invite.business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite TO authenticated;
