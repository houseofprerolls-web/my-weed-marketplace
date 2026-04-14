'use client';

import { isSupabaseConfigured } from '@/lib/supabasePublicEnv';

export function ConfigWarning() {
  if (isSupabaseConfigured) return null;

  return (
    <div
      className="relative z-[300] bg-amber-500 px-4 py-3 text-center text-sm font-medium text-black"
      role="alert"
    >
      Supabase env vars are missing. Add{' '}
      <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
      <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your host
      (e.g. Vercel → Project → Settings → Environment Variables), then redeploy.
    </div>
  );
}
