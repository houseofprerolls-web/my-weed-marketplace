import type { SupabaseClient } from '@supabase/supabase-js';

/** Feed / comments: treat platform admins from profiles.role or legacy user_roles.admin as moderators. */
export async function viewerIsPlatformAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId).limit(10);
  if ((roles || []).some((r: { role: string }) => String(r.role) === 'admin')) return true;

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  const r = prof?.role;
  return r === 'admin' || r === 'admin_jr';
}
