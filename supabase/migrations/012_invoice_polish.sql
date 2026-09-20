-- ============================================================
-- Migration 012: Invoice Polish + Payments
-- ============================================================

-- ── Payments table ──
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT DEFAULT 'cash' NOT NULL CHECK (method IN ('cash','bank','upi','cheque','other')),
  reference TEXT,
  paid_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read payments" ON public.payments FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create payments" ON public.payments FOR INSERT WITH CHECK (public.is_member_of(business_id));

-- ── Expand invoice status + payment_status ──
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','finalized','paid','partially_paid','overdue','cancelled'));

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_status_check
  CHECK (payment_status IN ('unpaid','partial','paid'));

-- ── Record payment function ──
CREATE OR REPLACE FUNCTION public.record_payment(
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
  v_invoice RECORD;
  v_payment_id UUID;
  v_new_paid NUMERIC;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot pay a cancelled invoice'; END IF;

  INSERT INTO public.payments (business_id, invoice_id, amount, method, reference, note, created_by)
  VALUES (v_invoice.business_id, p_invoice_id, p_amount, p_method, p_reference, p_note, auth.uid())
  RETURNING id INTO v_payment_id;

  -- Update invoice
  v_new_paid := v_invoice.amount_paid + p_amount;
  UPDATE public.invoices SET
    amount_paid = v_new_paid,
    payment_status = CASE
      WHEN v_new_paid >= grand_total THEN 'paid'
      WHEN v_new_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    status = CASE
      WHEN v_new_paid >= grand_total THEN 'paid'
      WHEN v_new_paid > 0 AND status NOT IN ('cancelled') THEN 'partially_paid'
      ELSE status
    END
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment TO authenticated;

-- ── Cancel invoice (reverse stock) ──
CREATE OR REPLACE FUNCTION public.cancel_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id AND status != 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found or already cancelled'; END IF;

  -- Reverse stock movements: insert positive quantities for each line item
  IF v_invoice.status IN ('finalized','paid','partially_paid','sent') THEN
    FOR v_item IN
      SELECT * FROM public.line_items WHERE parent_type = 'invoice' AND parent_id = p_invoice_id AND product_id IS NOT NULL
    LOOP
      INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reference_type, reference_id, note, created_by)
      VALUES (v_invoice.business_id, v_item.product_id, 'in', v_item.quantity, 'invoice_cancel', p_invoice_id, 'Cancelled: ' || v_invoice.invoice_number, auth.uid());
    END LOOP;
  END IF;

  UPDATE public.invoices SET status = 'cancelled' WHERE id = p_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_invoice TO authenticated;
