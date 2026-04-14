import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Server-only anon client for sitemaps, SEO metadata, etc. (respects RLS). */
export function createSupabaseAnonServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}
