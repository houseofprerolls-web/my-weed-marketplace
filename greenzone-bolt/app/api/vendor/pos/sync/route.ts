import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POS_PROVIDER_OPTIONS } from '@/lib/posProviders';
import { getPosCatalogImporter } from '@/lib/pos/registry';
import { upsertPosCatalog } from '@/lib/pos/upsertPosCatalog';

const ALLOWED_PROVIDERS = new Set(POS_PROVIDER_OPTIONS.map((p) => p.id));

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

    if (!ALLOWED_PROVIDERS.has(provider as (typeof POS_PROVIDER_OPTIONS)[number]['id'])) {
      return NextResponse.json({ error: 'Unknown POS provider' }, { status: 400 });
    }

    const { data: mayManage, error: rpcErr } = await supabase.rpc('vendor_staff_may_manage', {
      p_vendor_id: vendorId,
    });
    const { data: isAdmin, error: adminRpcErr } = await supabase.rpc('auth_is_profile_admin');

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }
    if (adminRpcErr) {
      return NextResponse.json({ error: adminRpcErr.message }, { status: 400 });
    }
    if (mayManage !== true && isAdmin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: connRow } = await supabase
      .from('vendor_pos_connections')
      .select('config')
      .eq('vendor_id', vendorId)
      .eq('provider', provider)
      .maybeSingle();

    const prevCfg =
      connRow?.config && typeof connRow.config === 'object' && connRow.config !== null
        ? (connRow.config as Record<string, unknown>)
        : {};
    const bodyCfg =
      typeof body.config === 'object' && body.config !== null ? (body.config as Record<string, unknown>) : {};
    const mergedConfig: Record<string, unknown> = { ...prevCfg, ...bodyCfg };

    const now = new Date().toISOString();
    const importer = getPosCatalogImporter(provider);
    if (!importer) {
      return NextResponse.json({ error: 'Unknown POS provider' }, { status: 400 });
    }

    await supabase.from('vendor_pos_connections').upsert(
      {
        vendor_id: vendorId,
        provider,
        status: 'syncing',
        last_sync_at: now,
        last_error: null,
        config: mergedConfig,
      },
      { onConflict: 'vendor_id,provider' }
    );

    try {
      const { items, fullSync, warning } = await importer({
        config: mergedConfig,
        baseUrlOverride: typeof mergedConfig.api_base_url === 'string' ? mergedConfig.api_base_url : null,
      });

      const stats = await upsertPosCatalog(supabase, vendorId, provider, items, {
        fullSync,
      });

      const doneAt = new Date().toISOString();
      await supabase.from('vendor_pos_connections').upsert(
        {
          vendor_id: vendorId,
          provider,
          status: 'connected',
          last_sync_at: doneAt,
          last_error: null,
          config: mergedConfig,
        },
        { onConflict: 'vendor_id,provider' }
      );

      const productsImported = stats.inserted;
      const productsUpdated = stats.updated;

      const baseMessage = `Imported ${productsImported} new and updated ${productsUpdated} existing product(s).${
        stats.markedOutOfStock ? ` Marked ${stats.markedOutOfStock} prior POS SKU(s) out of stock (no longer in POS feed).` : ''
      }`;

      return NextResponse.json({
        ok: true,
        lastSyncAt: doneAt,
        catalogPullEnabled: true,
        productsImported,
        productsUpdated,
        markedOutOfStock: stats.markedOutOfStock,
        warning: warning ?? null,
        message: warning ? `${baseMessage} ${warning}` : baseMessage,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      const failAt = new Date().toISOString();
      await supabase.from('vendor_pos_connections').upsert(
        {
          vendor_id: vendorId,
          provider,
          status: 'error',
          last_sync_at: failAt,
          last_error: msg,
          config: mergedConfig,
        },
        { onConflict: 'vendor_id,provider' }
      );

      const notImplemented = /not implemented yet/i.test(msg);
      return NextResponse.json(
        {
          ok: false,
          error: msg,
          catalogPullEnabled: false,
          productsImported: 0,
          productsUpdated: 0,
        },
        { status: notImplemented ? 501 : 422 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
