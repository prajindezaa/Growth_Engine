-- ============================================================
-- Migration 014: Purchase Functions
-- ============================================================

-- ── Convert PO to Purchase ──
CREATE OR REPLACE FUNCTION public.convert_po_to_purchase(p_po_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_po RECORD;
  v_purchase_id UUID;
  v_purchase_number TEXT;
BEGIN
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id AND status NOT IN ('converted','cancelled');
  IF NOT FOUND THEN RAISE EXCEPTION 'PO not found or already converted'; END IF;

  v_purchase_number := public.next_document_number(v_po.business_id, 'PUR', 'purchases');

  INSERT INTO public.purchases (business_id, supplier_id, purchase_order_id, purchase_number, status, notes, created_by)
  VALUES (v_po.business_id, v_po.supplier_id, p_po_id, v_purchase_number, 'draft', v_po.notes, auth.uid())
  RETURNING id INTO v_purchase_id;

  -- Copy line items
  INSERT INTO public.line_items (business_id, parent_type, parent_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order)
  SELECT business_id, 'purchase', v_purchase_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order
  FROM public.line_items WHERE parent_type = 'purchase_order' AND parent_id = p_po_id;

  PERFORM public.compute_document_totals('purchase', v_purchase_id);
  UPDATE public.purchase_orders SET status = 'converted' WHERE id = p_po_id;

  RETURN v_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_po_to_purchase TO authenticated;

-- ── Finalize purchase (stock in + update purchase price) ──
CREATE OR REPLACE FUNCTION public.finalize_purchase(p_purchase_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found or already finalized'; END IF;

  FOR v_item IN
    SELECT * FROM public.line_items WHERE parent_type = 'purchase' AND parent_id = p_purchase_id AND product_id IS NOT NULL
  LOOP
    -- Stock in
    INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reference_type, reference_id, note, created_by)
    VALUES (v_purchase.business_id, v_item.product_id, 'in', v_item.quantity, 'purchase', p_purchase_id, 'Purchase ' || v_purchase.purchase_number, auth.uid());

    -- Update purchase price on product
    UPDATE public.products SET purchase_price = v_item.unit_price WHERE id = v_item.product_id;
  END LOOP;

  UPDATE public.purchases SET status = 'finalized' WHERE id = p_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_purchase TO authenticated;

-- ── Extend next_document_number for purchase tables ──
CREATE OR REPLACE FUNCTION public.next_document_number(
  p_business_id UUID,
  p_prefix TEXT,
  p_table TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_table = 'quotations' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.quotations WHERE business_id = p_business_id;
  ELSIF p_table = 'sales_orders' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.sales_orders WHERE business_id = p_business_id;
  ELSIF p_table = 'invoices' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.invoices WHERE business_id = p_business_id;
  ELSIF p_table = 'purchase_orders' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.purchase_orders WHERE business_id = p_business_id;
  ELSIF p_table = 'purchases' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.purchases WHERE business_id = p_business_id;
  ELSE
    v_count := 1;
  END IF;

  RETURN p_prefix || '-' || lpad(v_count::text, 4, '0');
END;
$$;

-- ── Extend compute_document_totals for purchase types ──
CREATE OR REPLACE FUNCTION public.compute_document_totals(
  p_parent_type TEXT,
  p_parent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_total NUMERIC;
  v_discount_total NUMERIC;
  v_grand_total NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(quantity * unit_price * tax_rate / 100), 0),
    COALESCE(SUM(discount), 0),
    COALESCE(SUM(line_total), 0)
  INTO v_subtotal, v_tax_total, v_discount_total, v_grand_total
  FROM public.line_items
  WHERE parent_type = p_parent_type AND parent_id = p_parent_id;

  IF p_parent_type = 'quotation' THEN
    UPDATE public.quotations SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'sales_order' THEN
    UPDATE public.sales_orders SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'invoice' THEN
    UPDATE public.invoices SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'purchase_order' THEN
    UPDATE public.purchase_orders SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'purchase' THEN
    UPDATE public.purchases SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  END IF;
END;
$$;
