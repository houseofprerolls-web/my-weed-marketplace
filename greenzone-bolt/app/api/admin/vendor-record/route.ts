import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';

/** Single vendor / vendor_profiles row for admin detail (bypasses RLS). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendorId = request.nextUrl.searchParams.get('vendor_id')?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendor_id' }, { status: 400 });
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

    const db = createServiceRoleClient();
    const vendorsSchema = resolveUseVendorsTableForDiscovery();
    const table = vendorsSchema ? 'vendors' : 'vendor_profiles';

    const { data, error } = await db.from(table).select('*').eq('id', vendorId).maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    let mapPoint: { lat: number; lng: number } | null = null;
    if (vendorsSchema) {
      const { data: mp, error: mpErr } = await db.rpc('vendor_stored_map_point', {
        p_vendor_id: vendorId,
      });
      if (!mpErr && mp != null && typeof mp === 'object' && !Array.isArray(mp)) {
        const o = mp as Record<string, unknown>;
        const plat = Number(o.lat);
        const plng = Number(o.lng);
        if (Number.isFinite(plat) && Number.isFinite(plng)) {
          mapPoint = { lat: plat, lng: plng };
        }
      }
    }

    return NextResponse.json({ ok: true, vendorsSchema, vendor: data, map_point: mapPoint });
  } catch (e) {
    console.error('GET /api/admin/vendor-record', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
