/** URL + anon key only — safe to import from pages that must not load `@/lib/supabase` (avoids bundling the browser client). */

export const supabasePublicUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
export const supabasePublicAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabasePublicUrl && supabasePublicAnonKey);
