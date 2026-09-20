-- ============================================================
-- Migration 018: AI Action Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_preview JSONB NOT NULL,
  action_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','executed','failed','cancelled')),
  ai_interaction_id UUID REFERENCES public.ai_interactions(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_action_audit_business ON public.ai_action_audit(business_id);
ALTER TABLE public.ai_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI actions" ON public.ai_action_audit FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create AI actions" ON public.ai_action_audit FOR INSERT WITH CHECK (public.is_member_of(business_id));
CREATE POLICY "Members can update AI actions" ON public.ai_action_audit FOR UPDATE USING (public.is_member_of(business_id));
