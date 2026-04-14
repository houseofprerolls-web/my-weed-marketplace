import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketingBannerSlides } from '@/lib/marketingBanners/fetchSlides';
import { isAllowedMarketingPlacementKey } from '@/lib/marketingBanners/placements';

export const dynamic = 'force-dynamic';

/**
 * Public marketing carousel slides. Single fetch path; service role when set.
 */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceKey || anonKey;

  if (!url || !key) {
    return NextResponse.json({ rows: [], error: 'supabase_not_configured' }, { status: 503 });
  }

  const placementRaw = req.nextUrl.searchParams.get('placement')?.trim() || 'homepage_hero';
  const placement = isAllowedMarketingPlacementKey(placementRaw) ? placementRaw : null;
  if (!placement) {
    return NextResponse.json({ rows: [], error: 'invalid_placement' }, { status: 400 });
  }

  const zip5Raw = req.nextUrl.searchParams.get('zip5')?.trim();
  const zip5 = zip5Raw && zip5Raw.length === 5 ? zip5Raw : null;

  const client = createClient(url, key);
  try {
    const rows = await fetchMarketingBannerSlides(placement, { shopperZip5: zip5, supabaseClient: client });
    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fetch_failed';
    return NextResponse.json({ rows: [], error: message }, { status: 500 });
  }
}
