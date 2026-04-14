import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';

type Body = {
  vendor_id?: string;
  lat?: unknown;
  lng?: unknown;
};

export async function POST(request: NextRequest) {
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

    if (!resolveUseVendorsTableForDiscovery()) {
      return NextResponse.json({ error: 'Vendor map point is only used with CannaHub vendors schema' }, { status: 400 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Body;
    const vendorId = typeof body.vendor_id === 'string' ? body.vendor_id.trim() : '';
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendor_id' }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid lat or lng' }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 });
    }

    const db = createServiceRoleClient();
    const { error } = await db.rpc('set_vendor_geog_point', {
      p_vendor_id: vendorId,
      p_lng: lng,
      p_lat: lat,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logAdminAuditEvent(supabaseAuthed, {
      actionKey: 'vendor.map_point',
      summary: `Set map geopoint for vendor ${vendorId}`,
      resourceType: 'vendor',
      resourceId: vendorId,
      metadata: { lat, lng },
    });

    return NextResponse.json({ ok: true, vendor_id: vendorId, lat, lng });
  } catch (e) {
    console.error('POST /api/admin/vendor-set-map-point', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
