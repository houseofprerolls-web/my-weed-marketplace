import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMasterAdminEmail } from '@/lib/admin';

/**
 * Match client-side `useRole().isAdmin`: master admin email, `profiles.role`, or `user_roles`.
 */
export async function requestUserIsAdmin(supabaseAuthed: SupabaseClient, user: User): Promise<boolean> {
  if (isMasterAdminEmail(user.email)) return true;

  const { data: rpcData, error: rpcErr } = await supabaseAuthed.rpc('customer_get_profile', {
    p_user_id: user.id,
  });
  if (!rpcErr && rpcData != null && typeof rpcData === 'object' && !Array.isArray(rpcData)) {
    const role = (rpcData as Record<string, unknown>).role;
    if (String(role) === 'admin' || String(role) === 'admin_jr') return true;
  }

  const { data: roleRows } = await supabaseAuthed
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .limit(10);

  return (roleRows || []).some((r: { role: string }) => String(r.role) === 'admin');
}
