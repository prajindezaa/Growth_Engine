-- ============================================================
-- Migration 023: POS Sale RPC
-- Unified POS sale transaction executing invoice creation,
-- line items, payment record, and stock deduction.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pos_sale(
  p_business_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_subtotal NUMERIC DEFAULT 0,
  p_tax_total NUMERIC DEFAULT 0,
  p_discount_total NUMERIC DEFAULT 0,
  p_grand_total NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'cash',
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT 'POS Counter Sale',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix TEXT;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_payment_id UUID;
  v_cust_id UUID := p_customer_id;
  v_item JSONB;
  v_prod_id UUID;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_tax NUMERIC;
  v_discount NUMERIC;
  v_total NUMERIC;
  v_prod_name TEXT;
  v_idx INTEGER := 0;
BEGIN
  -- 1. Ensure a customer exists (if null, find or create Walk-in Customer)
  IF v_cust_id IS NULL THEN
    SELECT id INTO v_cust_id FROM public.customers
    WHERE business_id = p_business_id AND (name = 'Walk-in Customer' OR phone = '0000000000')
    LIMIT 1;

    IF v_cust_id IS NULL THEN
      INSERT INTO public.customers (business_id, name, phone, notes)
      VALUES (p_business_id, 'Walk-in Customer', '0000000000', 'Auto-generated for POS sales')
      RETURNING id INTO v_cust_id;
    END IF;
  END IF;

  -- 2. Generate invoice number
  SELECT invoice_prefix INTO v_prefix FROM public.businesses WHERE id = p_business_id;
  IF v_prefix IS NULL OR v_prefix = '' THEN v_prefix := 'INV'; END IF;
  v_invoice_number := public.next_document_number(p_business_id, v_prefix || '-POS', 'invoices');

  -- 3. Insert finalized invoice
  INSERT INTO public.invoices (
    business_id,
    customer_id,
    invoice_number,
    status,
    subtotal,
    tax_total,
    discount_total,
    grand_total,
    amount_paid,
    payment_status,
    due_date,
    notes,
    created_by
  )
  VALUES (
    p_business_id,
    v_cust_id,
    v_invoice_number,
    'finalized',
    p_subtotal,
    p_tax_total,
    p_discount_total,
    p_grand_total,
    p_grand_total,
    'paid',
    CURRENT_DATE,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- 4. Insert line items and record stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::uuid;
    v_prod_name := v_item->>'product_name';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_price := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_tax := COALESCE((v_item->>'tax_rate')::numeric, 0);
    v_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_total := COALESCE((v_item->>'line_total')::numeric, (v_qty * v_price));

    INSERT INTO public.line_items (
      business_id,
      parent_type,
      parent_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      tax_rate,
      discount,
      line_total,
      sort_order
    )
    VALUES (
      p_business_id,
      'invoice',
      v_invoice_id,
      v_prod_id,
      v_prod_name,
      v_qty,
      v_price,
      v_tax,
      v_discount,
      v_total,
      v_idx
    );

    -- Stock deduction
    IF v_prod_id IS NOT NULL THEN
      INSERT INTO public.stock_movements (
        business_id,
        product_id,
        type,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      VALUES (
        p_business_id,
        v_prod_id,
        'out',
        -v_qty,
        'invoice',
        v_invoice_id,
        'POS Sale ' || v_invoice_number,
        auth.uid()
      );
    END IF;

    v_idx := v_idx + 1;
  END LOOP;

  -- 5. Record payment
  INSERT INTO public.payments (
    business_id,
    invoice_id,
    party_type,
    party_id,
    direction,
    amount,
    method,
    reference,
    note,
    created_by
  )
  VALUES (
    p_business_id,
    v_invoice_id,
    'customer',
    v_cust_id,
    'in',
    p_grand_total,
    p_payment_method,
    p_payment_reference,
    'Paid at POS counter',
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'payment_id', v_payment_id,
    'grand_total', p_grand_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_sale TO authenticated;
