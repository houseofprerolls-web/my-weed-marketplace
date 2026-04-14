import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Stub POS sync — updates connection metadata. Real Blaze / Dutchie / Treez flows
 * require partner credentials, OAuth, and provider-specific mapping (see docs in-app).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const vendorId = typeof body.vendorId === 'string' ? body.vendorId : '';
    const provider = typeof body.provider === 'string' ? body.provider : '';
    if (!vendorId || !provider) {
      return NextResponse.json({ error: 'vendorId and provider required' }, { status: 400 });
    }

    const { data: v, error: vErr } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (vErr || !v) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from('vendor_pos_connections').upsert(
      {
        vendor_id: vendorId,
        provider,
        status: 'connected',
        last_sync_at: now,
        last_error: null,
        config: typeof body.config === 'object' && body.config !== null ? body.config : {},
      },
      { onConflict: 'vendor_id,provider' }
    );

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      lastSyncAt: now,
      message:
        'Sync recorded. Full catalog pull for Blaze, Dutchie, Treez, and others requires provider API keys and a server-side worker — use this endpoint once credentials are configured.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
