-- ============================================================
-- Migration 006: Customers Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  state TEXT,
  credit_limit NUMERIC DEFAULT 0 NOT NULL,
  payment_terms INTEGER DEFAULT 30 NOT NULL,
  opening_balance NUMERIC DEFAULT 0 NOT NULL,
  outstanding_balance NUMERIC DEFAULT 0 NOT NULL,
  customer_type TEXT DEFAULT 'regular' NOT NULL CHECK (customer_type IN ('regular', 'wholesale', 'distributor')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Members can read customers from their business
CREATE POLICY "Members can read customers"
  ON public.customers FOR SELECT
  USING (public.is_member_of(business_id));

-- Members (except viewer) can create customers
-- Enforced at app level; RLS allows all members to insert
CREATE POLICY "Members can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

-- Members can update customers (viewer restriction at app level)
CREATE POLICY "Members can update customers"
  ON public.customers FOR UPDATE
  USING (public.is_member_of(business_id));

-- Admins/owners can delete customers
CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.is_admin_or_owner_of(business_id));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
