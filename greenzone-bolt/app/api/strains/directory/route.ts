import { NextResponse } from 'next/server';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { loadStrainsDirectoryPage } from '@/lib/strainsDirectoryLoad';

export const dynamic = 'force-dynamic';

/**
 * Strain directory for `/strains` — uses the same server Supabase client as discovery
 * (prefers SUPABASE_SERVICE_ROLE_KEY) and GET-based counts (no PostgREST HEAD).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
    const selectedType = (url.searchParams.get('type') || 'all').trim() || 'all';
    const debouncedSearch = (url.searchParams.get('q') || '').trim();
    const client = createSupabaseDirectoryClient();
    const result = await loadStrainsDirectoryPage(client, { page, selectedType, debouncedSearch });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false as const, error: msg }, { status: 503 });
  }
}
