-- ============================================================
-- Migration 002: Audit Log Helper Function
-- Call this from application code or triggers to log changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_business_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    business_id, user_id, action, entity_type, entity_id, before, after, metadata
  )
  VALUES (
    p_business_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_before,
    p_after,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_audit_log TO authenticated;
