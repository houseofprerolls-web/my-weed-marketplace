import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon) {
    return { error: NextResponse.json({ error: 'Server missing Supabase env' }, { status: 500 }) };
  }
  const supabaseAuthed = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabaseAuthed.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!hasServiceRoleKey()) {
    return {
      error: NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY for admin billing API.' },
        { status: 503 }
      ),
    };
  }
  return { ok: true as const };
}

type BrandCountRow = {
  id: string;
  name: string;
  slug: string;
  brand_page_managers?: { count: number } | { count: number }[] | null;
};

function managerCountFromRow(row: BrandCountRow): number {
  const m = row.brand_page_managers;
  if (m == null) return 0;
  if (Array.isArray(m)) return Number(m[0]?.count) || 0;
  return Number((m as { count: number }).count) || 0;
}

/**
 * Search verified brands or list managers for platform billing internal_profile linking.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ('error' in gate && gate.error) return gate.error;

  const db = createServiceRoleClient();
  const sp = request.nextUrl.searchParams;
  const brandId = (sp.get('brand_id') ?? '').trim();

  if (brandId) {
    if (!isUuid(brandId)) {
      return NextResponse.json({ error: 'Invalid brand_id' }, { status: 400 });
    }
    const { data: rows, error: mErr } = await db
      .from('brand_page_managers')
      .select('user_id, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true });
    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }
    const list = (rows || []) as { user_id: string; created_at: string }[];
    const uids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    const emailById = new Map<string, { email: string | null; full_name: string | null }>();
    if (uids.length) {
      const { data: profs, error: pErr } = await db
        .from('profiles')
        .select('id, email, full_name')
        .in('id', uids);
      if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
      }
      for (const p of profs || []) {
        const row = p as { id: string; email: string | null; full_name: string | null };
        emailById.set(row.id, { email: row.email, full_name: row.full_name });
      }
    }
    const managers = list.map((r) => {
      const pr = emailById.get(r.user_id);
      return {
        user_id: r.user_id,
        created_at: r.created_at,
        email: pr?.email ?? null,
        full_name: pr?.full_name ?? null,
      };
    });
    return NextResponse.json({ managers });
  }

  const rawQ = (sp.get('q') ?? '').trim();
  const safe = rawQ.replace(/%/g, '').replace(/,/g, '').slice(0, 120);

  let query = db
    .from('brands')
    .select('id, name, slug, brand_page_managers(count)')
    .order('name', { ascending: true })
    .limit(40);

  if (safe.length >= 1) {
    query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }

  const { data: brands, error: bErr } = await query;
  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  const items = ((brands || []) as BrandCountRow[]).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    manager_count: managerCountFromRow(b),
  }));

  return NextResponse.json({ brands: items });
}
