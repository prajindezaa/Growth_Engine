-- ============================================================
-- Migration 019: Create Quotation RPC (for AI actions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_quotation(
  p_business_id UUID,
  p_customer_id UUID,
  p_subtotal NUMERIC,
  p_tax_total NUMERIC,
  p_discount_total NUMERIC,
  p_grand_total NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quotation_id UUID;
  v_biz RECORD;
  v_seq INTEGER;
  v_number TEXT;
  v_item JSONB;
BEGIN
  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;

  -- Generate sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_seq FROM public.quotations WHERE business_id = p_business_id;

  v_number := COALESCE(v_biz.invoice_prefix, 'QT') || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.quotations (business_id, customer_id, quotation_number, status, subtotal, tax_total, discount_total, grand_total, notes, created_by)
  VALUES (p_business_id, p_customer_id, v_number, 'draft', p_subtotal, p_tax_total, p_discount_total, p_grand_total, p_notes, auth.uid())
  RETURNING id INTO v_quotation_id;

  -- Insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.line_items (business_id, parent_type, parent_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order)
    VALUES (
      p_business_id, 'quotation', v_quotation_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'tax_rate')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      (v_item->>'line_total')::NUMERIC,
      COALESCE((v_item->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  RETURN v_quotation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quotation TO authenticated;
