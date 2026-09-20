-- ============================================================
-- Migration 007: Suppliers Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  credit_terms INTEGER DEFAULT 30 NOT NULL,
  opening_balance NUMERIC DEFAULT 0 NOT NULL,
  outstanding_balance NUMERIC DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read suppliers"
  ON public.suppliers FOR SELECT
  USING (public.is_member_of(business_id));

CREATE POLICY "Members can create suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

CREATE POLICY "Members can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (public.is_member_of(business_id));

CREATE POLICY "Admins can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (public.is_admin_or_owner_of(business_id));

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
