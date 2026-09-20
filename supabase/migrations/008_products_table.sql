-- ============================================================
-- Migration 008: Products Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs' NOT NULL,
  purchase_price NUMERIC DEFAULT 0 NOT NULL,
  selling_price NUMERIC DEFAULT 0 NOT NULL,
  tax_rate NUMERIC DEFAULT 18 NOT NULL,
  current_stock NUMERIC DEFAULT 0 NOT NULL,
  min_stock NUMERIC DEFAULT 0 NOT NULL,
  max_stock NUMERIC DEFAULT 0 NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  hsn_sac TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- SKU + barcode unique per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON public.products(business_id, sku) WHERE sku IS NOT NULL AND sku != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON public.products(business_id, barcode) WHERE barcode IS NOT NULL AND barcode != '';

CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read products"
  ON public.products FOR SELECT
  USING (public.is_member_of(business_id));

CREATE POLICY "Members can create products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_member_of(business_id));

CREATE POLICY "Members can update products"
  ON public.products FOR UPDATE
  USING (public.is_member_of(business_id));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin_or_owner_of(business_id));

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Storage policies for product images
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
