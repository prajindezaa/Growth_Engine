-- ============================================================
-- Migration 013: Purchase Orders + Purchases
-- ============================================================

-- ── Purchase Orders ──
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft','confirmed','converted','cancelled')),
  subtotal NUMERIC DEFAULT 0 NOT NULL,
  tax_total NUMERIC DEFAULT 0 NOT NULL,
  discount_total NUMERIC DEFAULT 0 NOT NULL,
  grand_total NUMERIC DEFAULT 0 NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders(business_id, order_number);
CREATE INDEX IF NOT EXISTS idx_po_business ON public.purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.purchase_orders(supplier_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read POs" ON public.purchase_orders FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create POs" ON public.purchase_orders FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update POs" ON public.purchase_orders FOR UPDATE USING (public.is_member_of(business_id));

CREATE TRIGGER po_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Purchases ──
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  purchase_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft','finalized','cancelled')),
  subtotal NUMERIC DEFAULT 0 NOT NULL,
  tax_total NUMERIC DEFAULT 0 NOT NULL,
  discount_total NUMERIC DEFAULT 0 NOT NULL,
  grand_total NUMERIC DEFAULT 0 NOT NULL,
  amount_paid NUMERIC DEFAULT 0 NOT NULL,
  payment_status TEXT DEFAULT 'unpaid' NOT NULL CHECK (payment_status IN ('unpaid','partial','paid')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_number ON public.purchases(business_id, purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON public.purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read purchases" ON public.purchases FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create purchases" ON public.purchases FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update purchases" ON public.purchases FOR UPDATE USING (public.is_member_of(business_id));

CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Extend line_items for purchase types ──
ALTER TABLE public.line_items DROP CONSTRAINT IF EXISTS line_items_parent_type_check;
ALTER TABLE public.line_items ADD CONSTRAINT line_items_parent_type_check
  CHECK (parent_type IN ('quotation','sales_order','invoice','purchase_order','purchase'));
