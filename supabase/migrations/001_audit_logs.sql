-- ============================================================
-- Migration 001: Audit Logs Table
-- Every business-scoped table MUST include business_id.
-- ============================================================

-- Audit logs table — business-scoped
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                        -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL,                   -- 'business', 'invoice', 'client', etc.
  entity_id UUID,                              -- ID of the affected row
  before JSONB DEFAULT NULL,                   -- snapshot before change
  after JSONB DEFAULT NULL,                    -- snapshot after change
  metadata JSONB DEFAULT '{}',                 -- extra context (IP, user-agent, etc.)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by business
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
