import type { SupabaseClient } from '@supabase/supabase-js';

/** Standard hook for admin/jr-admin mutations — call after a successful write (same Supabase client as the user JWT). */
export type AdminAuditPayload = {
  actionKey: string;
  summary: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAdminAuditEvent(
  supabase: SupabaseClient,
  payload: AdminAuditPayload
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    console.warn('[adminAudit] skipped (no user)', payload.actionKey);
    return;
  }
  const { error } = await supabase.from('admin_audit_events').insert({
    actor_id: user.id,
    action_key: payload.actionKey,
    summary: payload.summary,
    resource_type: payload.resourceType ?? null,
    resource_id: payload.resourceId != null ? String(payload.resourceId) : null,
    metadata: payload.metadata ?? {},
  });
  if (error) {
    console.warn('[adminAudit] insert failed', payload.actionKey, error.message);
  }
}
