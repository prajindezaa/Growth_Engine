-- ============================================================
-- Migration 021: Subscriptions & Plans
-- ============================================================

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','growth','pro'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active','expired','cancelled'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS max_invoices_per_month INTEGER DEFAULT 50;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS max_staff_seats INTEGER DEFAULT 3;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS max_ai_messages_per_month INTEGER DEFAULT 100;

-- Track usage
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('invoice','ai_message','staff_seat')),
  period TEXT NOT NULL, -- e.g. '2025-01'
  count INTEGER DEFAULT 0,
  UNIQUE(business_id, metric_type, period)
);

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read usage" ON public.usage_metrics FOR SELECT USING (public.is_member_of(business_id));

-- Increment usage counter
CREATE OR REPLACE FUNCTION public.increment_usage(p_business_id UUID, p_metric TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usage_metrics (business_id, metric_type, period, count)
  VALUES (p_business_id, p_metric, to_char(CURRENT_DATE, 'YYYY-MM'), 1)
  ON CONFLICT (business_id, metric_type, period)
  DO UPDATE SET count = public.usage_metrics.count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage TO authenticated;

-- Check if business can perform action
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_business_id UUID, p_metric TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz RECORD;
  v_usage INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;

  SELECT COALESCE(count, 0) INTO v_usage FROM public.usage_metrics
  WHERE business_id = p_business_id AND metric_type = p_metric AND period = to_char(CURRENT_DATE, 'YYYY-MM');

  CASE p_metric
    WHEN 'invoice' THEN v_limit := v_biz.max_invoices_per_month;
    WHEN 'ai_message' THEN v_limit := v_biz.max_ai_messages_per_month;
    WHEN 'staff_seat' THEN v_limit := v_biz.max_staff_seats;
    ELSE v_limit := 999999;
  END CASE;

  -- Trial check
  IF v_biz.plan = 'trial' AND v_biz.trial_ends_at < now() THEN
    RETURN false;
  END IF;

  RETURN v_usage < v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_usage_limit TO authenticated;

-- ── Admin metrics view ──
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_businesses', (SELECT COUNT(*) FROM public.businesses),
    'active_trials', (SELECT COUNT(*) FROM public.businesses WHERE plan = 'trial' AND trial_ends_at > now()),
    'expired_trials', (SELECT COUNT(*) FROM public.businesses WHERE plan = 'trial' AND trial_ends_at <= now()),
    'paid_businesses', (SELECT COUNT(*) FROM public.businesses WHERE plan != 'trial'),
    'weekly_active', (SELECT COUNT(DISTINCT business_id) FROM public.invoices WHERE created_at > now() - interval '7 days'),
    'total_invoices_this_month', (SELECT COUNT(*) FROM public.invoices WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'total_ai_interactions', (SELECT COUNT(*) FROM public.ai_interactions WHERE created_at >= date_trunc('month', CURRENT_DATE))
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_metrics TO authenticated;
