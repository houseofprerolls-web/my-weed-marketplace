import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { zipPrefix3 } from '@/lib/zipUtils';

export const dynamic = 'force-dynamic';

function envTrim(k: string): string {
  return String(process.env[k] ?? '').trim();
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveMarketIdForZip(supabase: any, zip5: string): Promise<string | null> {
  const pref = zipPrefix3(zip5);
  if (!pref) return null;
  const { data: row } = await supabase.from('market_zip_prefixes').select('market_id').eq('prefix', pref).maybeSingle();
  if (row?.market_id) return String(row.market_id);
  const { data: fallback } = await supabase.from('listing_markets').select('id').eq('slug', 'california-other').maybeSingle();
  return fallback?.id ? String(fallback.id) : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const catalogProductId = (url.searchParams.get('catalog_product_id') ?? '').trim();
    const zip5 = (url.searchParams.get('zip') ?? '').trim();
    if (!catalogProductId) return jsonError(400, 'Missing catalog_product_id');
    if (!zip5 || zip5.length !== 5) return jsonError(400, 'Missing zip');

    const supabaseUrl = envTrim('NEXT_PUBLIC_SUPABASE_URL') || envTrim('SUPABASE_URL');
    const anonKey = envTrim('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) return jsonError(500, 'Supabase is not configured');

    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const marketId = await resolveMarketIdForZip(supabase, zip5);
    if (!marketId) return NextResponse.json({ found: false });

    const { data: ops, error: opErr } = await supabase
      .from('vendor_market_operations')
      .select('vendor_id')
      .eq('market_id', marketId)
      .eq('approved', true)
      .limit(5000);
    if (opErr) return NextResponse.json({ found: false });
    const vendorIds = Array.from(new Set((ops || []).map((r: any) => String(r.vendor_id)).filter(Boolean)));
    if (!vendorIds.length) return NextResponse.json({ found: false });

    const { data: rows, error } = await supabase
      .from('products')
      .select('id,vendor_id,price_cents,vendors!inner(id,slug,is_live,license_status,billing_delinquent)')
      .eq('catalog_product_id', catalogProductId)
      .eq('in_stock', true)
      .in('vendor_id', vendorIds)
      .order('price_cents', { ascending: true })
      .limit(25);

    if (error || !rows?.length) return NextResponse.json({ found: false });

    for (const r of rows as any[]) {
      const v = r.vendors;
      if (!v || v.is_live !== true) continue;
      if (String(v.license_status || '').trim() !== 'approved') continue;
      if (v.billing_delinquent === true) continue;
      const vslug = v.slug != null && String(v.slug).trim() !== '' ? String(v.slug) : null;
      return NextResponse.json({
        found: true,
        vendor_id: String(r.vendor_id),
        vendor_slug: vslug,
        product_id: String(r.id),
        price_cents: Number(r.price_cents) || 0,
      });
    }

    return NextResponse.json({ found: false });
  } catch (e) {
    console.error('GET /api/catalog-products/best-offer', e);
    return jsonError(500, e instanceof Error ? e.message : 'Best offer failed');
  }
}

