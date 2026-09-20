-- ============================================================
-- Migration 009: Stock Movements + Atomic Stock Trigger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity NUMERIC NOT NULL,  -- positive = increase, negative = decrease
  reference_type TEXT DEFAULT 'manual' NOT NULL,  -- manual/invoice/purchase/return
  reference_id UUID,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON public.stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON public.stock_movements(reference_type, reference_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read stock movements"
  ON public.stock_movements FOR SELECT
  USING (public.is_member_of(business_id));

CREATE POLICY "Members can create stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

-- ── Atomic stock update trigger ──
-- Every INSERT into stock_movements automatically updates products.current_stock
CREATE OR REPLACE FUNCTION public.after_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock + NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.after_stock_movement();
