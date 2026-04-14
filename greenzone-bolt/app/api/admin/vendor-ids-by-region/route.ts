import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { parseAdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';
import {
  fetchAdminVendorIdsForRegion,
  hintForMissingAdminRegionRpc,
  supabaseThrownMessage,
} from '@/lib/adminVendorsByRegion';

/**
 * Returns vendor UUIDs in the CA or NY workspace (for client-side filtering when service role is server-only).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase URL or anon key' }, { status: 500 });
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
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      );
    }

    const region = parseAdminWorkspaceRegion(request.nextUrl.searchParams.get('region'));
    if (region === 'all') {
      return NextResponse.json({ ok: true, region, ids: null });
    }

    const db = createServiceRoleClient();
    const ids = await fetchAdminVendorIdsForRegion(db, region);
    return NextResponse.json({ ok: true, region, ids: ids ?? [] });
  } catch (e) {
    console.error('GET /api/admin/vendor-ids-by-region', e);
    const raw = supabaseThrownMessage(e);
    const msg = hintForMissingAdminRegionRpc(raw);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
