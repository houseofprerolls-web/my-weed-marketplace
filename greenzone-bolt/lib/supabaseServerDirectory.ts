import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client for public directory / discovery queries.
 * Prefers `SUPABASE_SERVICE_ROLE_KEY` when set (Vercel) so `/api/discovery/vendors` keeps working
 * if anon JWT/RLS differs from what the browser uses; falls back to the anon key.
 */
export function createSupabaseDirectoryClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const key = serviceKey || anonKey;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on the host (Vercel: Project → Settings → Environment Variables). Add SUPABASE_SERVICE_ROLE_KEY there too so directory API reads stay reliable.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
