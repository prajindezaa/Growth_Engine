-- ============================================================
-- Migration 017: AI Interactions Log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  matched_intent TEXT,
  tools_called JSONB DEFAULT '[]',
  response TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_business ON public.ai_interactions(business_id);
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read AI interactions" ON public.ai_interactions FOR SELECT USING (public.is_member_of(business_id));
CREATE POLICY "Members can create AI interactions" ON public.ai_interactions FOR INSERT WITH CHECK (public.is_member_of(business_id));
