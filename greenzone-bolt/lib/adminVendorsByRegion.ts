import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';

/** PostgREST `.in('id', …)` stays comfortably under URL limits. */
export const ADMIN_VENDOR_ID_IN_CHUNK = 200;

/** Supabase client errors are often plain objects with `message`, not `Error` instances. */
export function supabaseThrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return 'Unknown error';
}

export function hintForMissingAdminRegionRpc(message: string): string {
  if (/admin_vendor_ids_for_region|could not find the function|does not exist/i.test(message)) {
    return `${message} Apply Supabase migration 0158_admin_vendor_ids_for_region.sql if you have not yet.`;
  }
  return message;
}

export async function fetchAdminVendorIdsForRegion(
  db: SupabaseClient,
  region: AdminWorkspaceRegion
): Promise<string[] | null> {
  if (region === 'all') return null;
  const { data, error } = await db.rpc('admin_vendor_ids_for_region', { p_region: region });
  if (error) throw error;
  const rows = (data || []) as { id?: string }[];
  return rows.map((r) => String(r.id ?? '').trim()).filter((id) => id.length > 0);
}

export function chunkIds<T>(ids: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
