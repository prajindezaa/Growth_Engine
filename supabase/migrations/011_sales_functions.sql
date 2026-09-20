-- ============================================================
-- Migration 011: Sales Functions
-- ============================================================

-- ── Auto-numbering ──
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
  v_number TEXT;
BEGIN
  -- Count existing documents for this business
  IF p_table = 'quotations' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.quotations WHERE business_id = p_business_id;
  ELSIF p_table = 'sales_orders' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.sales_orders WHERE business_id = p_business_id;
  ELSIF p_table = 'invoices' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM public.invoices WHERE business_id = p_business_id;
  ELSE
    v_count := 1;
  END IF;

  v_number := p_prefix || '-' || lpad(v_count::text, 4, '0');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_document_number TO authenticated;

-- ── Compute document totals from line items ──
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
  -- Compute from line items
  SELECT
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(quantity * unit_price * tax_rate / 100), 0),
    COALESCE(SUM(discount), 0),
    COALESCE(SUM(line_total), 0)
  INTO v_subtotal, v_tax_total, v_discount_total, v_grand_total
  FROM public.line_items
  WHERE parent_type = p_parent_type AND parent_id = p_parent_id;

  -- Update the parent document
  IF p_parent_type = 'quotation' THEN
    UPDATE public.quotations SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'sales_order' THEN
    UPDATE public.sales_orders SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  ELSIF p_parent_type = 'invoice' THEN
    UPDATE public.invoices SET subtotal = v_subtotal, tax_total = v_tax_total, discount_total = v_discount_total, grand_total = v_grand_total WHERE id = p_parent_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_document_totals TO authenticated;

-- ── Convert quotation to sales order ──
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(p_quotation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quot RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_prefix TEXT;
BEGIN
  SELECT q.*, b.invoice_prefix INTO v_quot
  FROM public.quotations q
  JOIN public.businesses b ON b.id = q.business_id
  WHERE q.id = p_quotation_id AND q.status NOT IN ('converted','rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found or already converted';
  END IF;

  v_prefix := v_quot.invoice_prefix;
  v_order_number := public.next_document_number(v_quot.business_id, v_prefix || '-SO', 'sales_orders');

  INSERT INTO public.sales_orders (business_id, customer_id, quotation_id, order_number, status, notes, created_by)
  VALUES (v_quot.business_id, v_quot.customer_id, p_quotation_id, v_order_number, 'confirmed', v_quot.notes, auth.uid())
  RETURNING id INTO v_order_id;

  -- Copy line items
  INSERT INTO public.line_items (business_id, parent_type, parent_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order)
  SELECT business_id, 'sales_order', v_order_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order
  FROM public.line_items WHERE parent_type = 'quotation' AND parent_id = p_quotation_id;

  -- Update totals
  PERFORM public.compute_document_totals('sales_order', v_order_id);

  -- Mark quotation as converted
  UPDATE public.quotations SET status = 'converted' WHERE id = p_quotation_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quotation_to_order TO authenticated;

-- ── Convert sales order to invoice ──
CREATE OR REPLACE FUNCTION public.convert_order_to_invoice(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_invoice_id UUID;
  v_inv_number TEXT;
  v_prefix TEXT;
BEGIN
  SELECT o.*, b.invoice_prefix INTO v_order
  FROM public.sales_orders o
  JOIN public.businesses b ON b.id = o.business_id
  WHERE o.id = p_order_id AND o.status NOT IN ('converted','cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already converted';
  END IF;

  v_prefix := v_order.invoice_prefix;
  v_inv_number := public.next_document_number(v_order.business_id, v_prefix || '-INV', 'invoices');

  INSERT INTO public.invoices (business_id, customer_id, sales_order_id, invoice_number, status, due_date, notes, created_by)
  VALUES (v_order.business_id, v_order.customer_id, p_order_id, v_inv_number, 'draft', CURRENT_DATE + 30, v_order.notes, auth.uid())
  RETURNING id INTO v_invoice_id;

  -- Copy line items
  INSERT INTO public.line_items (business_id, parent_type, parent_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order)
  SELECT business_id, 'invoice', v_invoice_id, product_id, product_name, quantity, unit_price, tax_rate, discount, line_total, sort_order
  FROM public.line_items WHERE parent_type = 'sales_order' AND parent_id = p_order_id;

  PERFORM public.compute_document_totals('invoice', v_invoice_id);

  UPDATE public.sales_orders SET status = 'converted' WHERE id = p_order_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_order_to_invoice TO authenticated;

-- ── Finalize invoice (deduct stock) ──
CREATE OR REPLACE FUNCTION public.finalize_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or already finalized';
  END IF;

  -- For each line item, create a stock movement
  FOR v_item IN
    SELECT * FROM public.line_items WHERE parent_type = 'invoice' AND parent_id = p_invoice_id AND product_id IS NOT NULL
  LOOP
    INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reference_type, reference_id, note, created_by)
    VALUES (v_invoice.business_id, v_item.product_id, 'out', -v_item.quantity, 'invoice', p_invoice_id, 'Invoice ' || v_invoice.invoice_number, auth.uid());
  END LOOP;

  -- Mark as finalized
  UPDATE public.invoices SET status = 'finalized' WHERE id = p_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_invoice TO authenticated;
