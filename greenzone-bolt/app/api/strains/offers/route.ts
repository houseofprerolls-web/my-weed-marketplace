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

type OfferRow = {
  product_id: string;
  vendor_id: string;
  vendor_slug: string | null;
  vendor_name: string;
  vendor_city: string | null;
  vendor_state: string | null;
  price_cents: number;
};

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
    const slug = (url.searchParams.get('slug') ?? '').trim();
    const zip5 = (url.searchParams.get('zip') ?? '').trim();

    if (!slug) return jsonError(400, 'Missing slug');
    if (!zip5 || zip5.length !== 5) return jsonError(400, 'Missing zip');

    const supabaseUrl = envTrim('NEXT_PUBLIC_SUPABASE_URL') || envTrim('SUPABASE_URL');
    const anonKey = envTrim('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) return jsonError(500, 'Supabase is not configured');

    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const { data: strain, error: sErr } = await supabase
      .from('strains')
      .select('id,slug,name')
      .eq('slug', slug)
      .maybeSingle();
    if (sErr || !strain?.id) return NextResponse.json({ slug, zip5, offers: [] satisfies OfferRow[] });

    const marketId = await resolveMarketIdForZip(supabase, zip5);
    if (!marketId) return NextResponse.json({ slug, zip5, offers: [] satisfies OfferRow[] });

    const { data: ops, error: opErr } = await supabase
      .from('vendor_market_operations')
      .select('vendor_id')
      .eq('market_id', marketId)
      .eq('approved', true)
      .limit(5000);
    if (opErr) return NextResponse.json({ slug, zip5, offers: [] satisfies OfferRow[] });

    const vendorIds = Array.from(new Set((ops || []).map((r: any) => String(r.vendor_id)).filter(Boolean)));
    if (!vendorIds.length) return NextResponse.json({ slug, zip5, offers: [] satisfies OfferRow[] });

    const { data: products, error: pErr } = await supabase
      .from('products')
      .select(
        'id,vendor_id,price_cents,vendors!inner(id,slug,name,city,state,is_live,license_status,billing_delinquent)'
      )
      .eq('strain_id', strain.id)
      .eq('in_stock', true)
      .in('vendor_id', vendorIds)
      .order('price_cents', { ascending: true })
      .limit(50);
    if (pErr || !products?.length) return NextResponse.json({ slug, zip5, offers: [] satisfies OfferRow[] });

    const offers: OfferRow[] = [];
    for (const r of products as any[]) {
      const v = r.vendors;
      if (!v || v.is_live !== true) continue;
      if (String(v.license_status || '').trim() !== 'approved') continue;
      if (v.billing_delinquent === true) continue;
      const vslug = v.slug != null && String(v.slug).trim() !== '' ? String(v.slug) : null;
      offers.push({
        product_id: String(r.id),
        vendor_id: String(r.vendor_id),
        vendor_slug: vslug,
        vendor_name: String(v.name ?? ''),
        vendor_city: v.city != null ? String(v.city) : null,
        vendor_state: v.state != null ? String(v.state) : null,
        price_cents: Number(r.price_cents) || 0,
      });
      if (offers.length >= 7) break;
    }

    return NextResponse.json({ slug, zip5, offers });
  } catch (e) {
    console.error('GET /api/strains/offers', e);
    return jsonError(500, e instanceof Error ? e.message : 'Offers failed');
  }
}

