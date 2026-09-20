-- ============================================================
-- Migration 020: Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('overdue_invoice','due_today','due_this_week','low_stock','payment_received','staff_joined','general')),
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app','whatsapp','email')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_business ON public.notifications(business_id, is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read notifications" ON public.notifications FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can update notifications" ON public.notifications FOR UPDATE USING (public.is_member_of(business_id));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_member_of(business_id));

-- ── Notification preferences ──
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  overdue_alerts BOOLEAN DEFAULT true,
  due_reminders BOOLEAN DEFAULT true,
  low_stock_alerts BOOLEAN DEFAULT true,
  payment_alerts BOOLEAN DEFAULT true,
  whatsapp_reminders BOOLEAN DEFAULT false,
  email_reminders BOOLEAN DEFAULT false,
  UNIQUE(business_id, user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prefs" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

-- ── Generate daily notifications ──
CREATE OR REPLACE FUNCTION public.generate_daily_notifications(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  v_inv RECORD;
  v_prod RECORD;
BEGIN
  -- Overdue invoices
  FOR v_inv IN
    SELECT i.id, i.invoice_number, i.grand_total, i.amount_paid, c.name as customer_name
    FROM public.invoices i JOIN public.customers c ON c.id = i.customer_id
    WHERE i.business_id = p_business_id AND i.due_date < CURRENT_DATE
      AND i.payment_status != 'paid' AND i.status NOT IN ('cancelled','draft')
  LOOP
    INSERT INTO public.notifications (business_id, type, title, body, reference_type, reference_id)
    VALUES (p_business_id, 'overdue_invoice',
      'Overdue: ' || v_inv.invoice_number,
      v_inv.customer_name || ' owes ₹' || (v_inv.grand_total - v_inv.amount_paid)::TEXT,
      'invoice', v_inv.id)
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- Due today
  FOR v_inv IN
    SELECT i.id, i.invoice_number, i.grand_total, c.name as customer_name
    FROM public.invoices i JOIN public.customers c ON c.id = i.customer_id
    WHERE i.business_id = p_business_id AND i.due_date = CURRENT_DATE
      AND i.payment_status != 'paid' AND i.status NOT IN ('cancelled','draft')
  LOOP
    INSERT INTO public.notifications (business_id, type, title, body, reference_type, reference_id)
    VALUES (p_business_id, 'due_today',
      'Due Today: ' || v_inv.invoice_number,
      '₹' || v_inv.grand_total::TEXT || ' from ' || v_inv.customer_name,
      'invoice', v_inv.id);
    v_count := v_count + 1;
  END LOOP;

  -- Low stock
  FOR v_prod IN
    SELECT id, name, current_stock, min_stock
    FROM public.products
    WHERE business_id = p_business_id AND is_active = true AND current_stock <= min_stock
  LOOP
    INSERT INTO public.notifications (business_id, type, title, body, reference_type, reference_id)
    VALUES (p_business_id, 'low_stock',
      'Low Stock: ' || v_prod.name,
      'Only ' || v_prod.current_stock || ' left (min: ' || v_prod.min_stock || ')',
      'product', v_prod.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_notifications TO authenticated;
