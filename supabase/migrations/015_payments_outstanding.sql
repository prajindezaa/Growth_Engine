-- ============================================================
-- Migration 015: Payments & Outstanding
-- ============================================================

-- ── Extend payments table for supplier payments ──
-- Add party columns to existing payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS party_type TEXT DEFAULT 'customer' CHECK (party_type IN ('customer','supplier'));
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS party_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'in' CHECK (direction IN ('in','out'));
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id);

-- Make invoice_id nullable (supplier payments link to purchase_id instead)
ALTER TABLE public.payments ALTER COLUMN invoice_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_party ON public.payments(party_type, party_id);

-- ── Record customer payment (against invoices) ──
CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_business_id UUID,
  p_customer_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'cash',
  p_reference TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id UUID;
  v_invoice RECORD;
  v_new_paid NUMERIC;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id AND business_id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  INSERT INTO public.payments (business_id, invoice_id, party_type, party_id, direction, amount, method, reference, note, created_by)
  VALUES (p_business_id, p_invoice_id, 'customer', p_customer_id, 'in', p_amount, p_method, p_reference, p_note, auth.uid())
  RETURNING id INTO v_payment_id;

  v_new_paid := v_invoice.amount_paid + p_amount;
  UPDATE public.invoices SET
    amount_paid = v_new_paid,
    payment_status = CASE WHEN v_new_paid >= grand_total THEN 'paid' WHEN v_new_paid > 0 THEN 'partial' ELSE 'unpaid' END,
    status = CASE WHEN v_new_paid >= grand_total THEN 'paid' WHEN v_new_paid > 0 THEN 'partially_paid' ELSE status END
  WHERE id = p_invoice_id;

  -- Update customer outstanding
  UPDATE public.customers SET outstanding_balance = outstanding_balance - p_amount WHERE id = p_customer_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_customer_payment TO authenticated;

-- ── Record supplier payment (against purchases) ──
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_business_id UUID,
  p_supplier_id UUID,
  p_purchase_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'cash',
  p_reference TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id UUID;
  v_purchase RECORD;
  v_new_paid NUMERIC;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id AND business_id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;

  INSERT INTO public.payments (business_id, purchase_id, party_type, party_id, direction, amount, method, reference, note, created_by)
  VALUES (p_business_id, p_purchase_id, 'supplier', p_supplier_id, 'out', p_amount, p_method, p_reference, p_note, auth.uid())
  RETURNING id INTO v_payment_id;

  v_new_paid := v_purchase.amount_paid + p_amount;
  UPDATE public.purchases SET
    amount_paid = v_new_paid,
    payment_status = CASE WHEN v_new_paid >= grand_total THEN 'paid' WHEN v_new_paid > 0 THEN 'partial' ELSE 'unpaid' END
  WHERE id = p_purchase_id;

  -- Update supplier outstanding
  UPDATE public.suppliers SET outstanding_balance = outstanding_balance - p_amount WHERE id = p_supplier_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_supplier_payment TO authenticated;

-- ── Update outstanding when invoice is finalized ──
-- (Add grand_total to customer outstanding_balance)
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found or already finalized'; END IF;

  FOR v_item IN
    SELECT * FROM public.line_items WHERE parent_type = 'invoice' AND parent_id = p_invoice_id AND product_id IS NOT NULL
  LOOP
    INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reference_type, reference_id, note, created_by)
    VALUES (v_invoice.business_id, v_item.product_id, 'out', -v_item.quantity, 'invoice', p_invoice_id, 'Invoice ' || v_invoice.invoice_number, auth.uid());
  END LOOP;

  UPDATE public.invoices SET status = 'finalized' WHERE id = p_invoice_id;

  -- Add to customer outstanding
  UPDATE public.customers SET outstanding_balance = outstanding_balance + v_invoice.grand_total WHERE id = v_invoice.customer_id;
END;
$$;

-- ── Flag overdue invoices ──
CREATE OR REPLACE FUNCTION public.flag_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status IN ('finalized','sent','partially_paid')
    AND due_date < CURRENT_DATE
    AND payment_status != 'paid';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_overdue_invoices TO authenticated;
