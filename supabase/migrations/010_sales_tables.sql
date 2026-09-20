-- ============================================================
-- Migration 010: Sales Tables
-- ============================================================

-- ── Quotations ──
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  quotation_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft','sent','accepted','rejected','converted')),
  subtotal NUMERIC DEFAULT 0 NOT NULL,
  tax_total NUMERIC DEFAULT 0 NOT NULL,
  discount_total NUMERIC DEFAULT 0 NOT NULL,
  grand_total NUMERIC DEFAULT 0 NOT NULL,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_number ON public.quotations(business_id, quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_business ON public.quotations(business_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read quotations" ON public.quotations FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create quotations" ON public.quotations FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update quotations" ON public.quotations FOR UPDATE USING (public.is_member_of(business_id));

CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Sales Orders ──
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  quotation_id UUID REFERENCES public.quotations(id),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_number ON public.sales_orders(business_id, order_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_business ON public.sales_orders(business_id);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read sales_orders" ON public.sales_orders FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create sales_orders" ON public.sales_orders FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update sales_orders" ON public.sales_orders FOR UPDATE USING (public.is_member_of(business_id));

CREATE TRIGGER sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Invoices ──
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft','finalized','cancelled')),
  subtotal NUMERIC DEFAULT 0 NOT NULL,
  tax_total NUMERIC DEFAULT 0 NOT NULL,
  discount_total NUMERIC DEFAULT 0 NOT NULL,
  grand_total NUMERIC DEFAULT 0 NOT NULL,
  amount_paid NUMERIC DEFAULT 0 NOT NULL,
  payment_status TEXT DEFAULT 'unpaid' NOT NULL CHECK (payment_status IN ('unpaid','partial','paid')),
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(business_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(business_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read invoices" ON public.invoices FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create invoices" ON public.invoices FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update invoices" ON public.invoices FOR UPDATE USING (public.is_member_of(business_id));

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Line Items (shared) ──
CREATE TABLE IF NOT EXISTS public.line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('quotation','sales_order','invoice')),
  parent_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1 NOT NULL,
  unit_price NUMERIC DEFAULT 0 NOT NULL,
  tax_rate NUMERIC DEFAULT 0 NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  line_total NUMERIC DEFAULT 0 NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_line_items_parent ON public.line_items(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_line_items_business ON public.line_items(business_id);

ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read line_items" ON public.line_items FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create line_items" ON public.line_items FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update line_items" ON public.line_items FOR UPDATE USING (public.is_member_of(business_id));
CREATE POLICY "Members can delete line_items" ON public.line_items FOR DELETE USING (public.is_member_of(business_id));
