import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase env' }, { status: 500 });
    }
    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!hasServiceRoleKey()) {
      return NextResponse.json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as { period_ids?: unknown } | null;
    const raw = body?.period_ids;
    const period_ids = Array.isArray(raw)
      ? raw.map((x) => String(x).trim()).filter(Boolean)
      : [];
    if (!period_ids.length) {
      return NextResponse.json({ error: 'period_ids required' }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { error: updErr } = await db.from('platform_billing_periods').update({ paid_at: null }).in('id', period_ids);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    const { error: refErr } = await db.rpc('platform_billing_refresh_all_vendor_delinquency');
    if (refErr) {
      console.warn('platform_billing_refresh_all_vendor_delinquency', refErr.message);
    }

    return NextResponse.json({ ok: true, reopened: period_ids.length });
  } catch (e) {
    console.error('POST /api/admin/platform-billing/mark-unpaid', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
