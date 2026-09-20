import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Insert an audit log entry for a business-scoped action.
 *
 * Uses the database `insert_audit_log()` SECURITY DEFINER function,
 * which automatically captures auth.uid() as the acting user.
 *
 * @example
 * ```ts
 * await insertAuditLog(supabase, {
 *   businessId: '...',
 *   action: 'update',
 *   entityType: 'invoice',
 *   entityId: '...',
 *   before: oldInvoice,
 *   after: newInvoice,
 * })
 * ```
 */
export async function insertAuditLog(
  supabase: SupabaseClient,
  params: {
    businessId: string
    action: 'create' | 'update' | 'delete' | string
    entityType: string
    entityId?: string
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  }
) {
  const { data, error } = await supabase.rpc('insert_audit_log', {
    p_business_id: params.businessId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_before: params.before ?? null,
    p_after: params.after ?? null,
    p_metadata: params.metadata ?? {},
  })

  if (error) {
    console.error('Failed to insert audit log:', error.message)
  }

  return { logId: data, error }
}

// ── Audit log type ──

export interface AuditLog {
  id: string
  business_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}
