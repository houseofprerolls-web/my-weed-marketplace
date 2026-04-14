import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client that bypasses RLS. Use only after verifying the caller
 * is an admin (e.g. {@link requestUserIsAdmin}).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hasServiceRoleKey(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
}
