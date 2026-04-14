import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonServer } from '@/lib/supabaseServerAnon';

function parseVendorIds(raw: string | null): string[] {
  if (!raw) return [];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // basic UUID-ish guard (avoid huge/invalid payloads)
  const uuids = parts.filter((p) => /^[0-9a-fA-F-]{16,64}$/.test(p)).slice(0, 200);
  return Array.from(new Set(uuids));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAnonServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const vendorIds = parseVendorIds(req.nextUrl.searchParams.get('vendor_ids'));
    if (vendorIds.length === 0) return NextResponse.json({ ok: true, vendorIds: [] });

    // Happy hour = has a daily time window (not all day) AND is live now (policy enforces now/day/time).
    // RLS policy `deals_public_select` ensures only publicly visible + currently live deals are returned.
    const { data, error } = await supabase
      .from('deals')
      .select('vendor_id')
      .in('vendor_id', vendorIds)
      .not('daily_start_time', 'is', null)
      .not('daily_end_time', 'is', null)
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const out = Array.from(
      new Set((data || []).map((r: { vendor_id?: string | null }) => String(r.vendor_id || '')).filter(Boolean))
    );

    return NextResponse.json({ ok: true, vendorIds: out });
  } catch (e) {
    console.error('GET /api/public/happy-hour-vendors', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

