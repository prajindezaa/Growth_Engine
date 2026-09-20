-- ============================================================
-- Migration 024: Automation Rules & Approval Center
-- ============================================================

-- 1. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('invoice_overdue', 'low_stock', 'payment_received', 'large_order', 'high_discount')),
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL CHECK (action_type IN ('notify_owner', 'notify_manager', 'require_approval', 'send_reminder')),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_biz ON public.automation_rules(business_id, is_active);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation rules" ON public.automation_rules FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Admins can insert automation rules" ON public.automation_rules FOR INSERT WITH CHECK (public.is_admin_or_owner_of(business_id));
CREATE POLICY "Admins can update automation rules" ON public.automation_rules FOR UPDATE USING (public.is_admin_or_owner_of(business_id));
CREATE POLICY "Admins can delete automation rules" ON public.automation_rules FOR DELETE USING (public.is_admin_or_owner_of(business_id));

-- 2. Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  event_payload JSONB DEFAULT '{}'::jsonb,
  action_taken TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending_approval')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_biz ON public.automation_logs(business_id, created_at DESC);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation logs" ON public.automation_logs FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "System can insert automation logs" ON public.automation_logs FOR INSERT WITH CHECK (public.is_member_of(business_id));

-- 3. Approval Requests Table
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('high_discount', 'large_order', 'large_quotation', 'refund', 'stock_adjustment')),
  title TEXT NOT NULL,
  description TEXT,
  requester_name TEXT NOT NULL DEFAULT 'Staff Member',
  requester_id UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES auth.users(id),
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_biz ON public.approval_requests(business_id, status);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view approval requests" ON public.approval_requests FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create approval requests" ON public.approval_requests FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Admins can update approval requests" ON public.approval_requests FOR UPDATE USING (public.is_member_of(business_id));

-- 4. RPC for deciding an approval request
CREATE OR REPLACE FUNCTION public.decide_approval_request(
  p_request_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision status';
  END IF;

  SELECT * INTO v_req FROM public.approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'Request is already decided';
  END IF;

  UPDATE public.approval_requests
  SET
    status = p_decision,
    decided_by = auth.uid(),
    decision_note = p_note,
    decided_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'id', p_request_id,
    'status', p_decision,
    'decided_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.decide_approval_request TO authenticated;
