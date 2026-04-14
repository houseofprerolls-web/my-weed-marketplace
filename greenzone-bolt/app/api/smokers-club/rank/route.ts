import { NextRequest, NextResponse } from 'next/server';
import { extractZip5 } from '@/lib/zipUtils';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { fetchLiveVendorsForSmokersClub } from '@/lib/vendorDeliveryList';
import { computeSmokersClubDiscoverPriorityMap, smokersClubShopperFromZipHint } from '@/lib/smokersClub';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';

export const dynamic = 'force-dynamic';

/**
 * Listing badge: operational rank when in top 3 for shopper ZIP market (UTC-day ladder).
 * `rank` is null when not #1–#3 on today’s ladder.
 */
export async function GET(req: NextRequest) {
  try {
    if (!resolveUseVendorsTableForDiscovery()) {
      return NextResponse.json({ vendors_schema: false, rank: null as number | null });
    }

    const vendorId = req.nextUrl.searchParams.get('vendorId')?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
    }

    const raw = req.nextUrl.searchParams.get('zip');
    const z5 = raw ? extractZip5(raw) : null;
    const zip5 = z5 && z5.length === 5 ? z5 : FALLBACK_LA_ZIP;
    const latRaw = req.nextUrl.searchParams.get('lat');
    const lngRaw = req.nextUrl.searchParams.get('lng');
    const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : null;
    const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : null;
    const shopper = smokersClubShopperFromZipHint(zip5, lat, lng);

    const db = createSupabaseDirectoryClient();
    const [candidates, vendorIdsServingShopperZip] = await Promise.all([
      fetchLiveVendorsForSmokersClub(zip5, true, db),
      fetchVendorIdsServingZip5(zip5, db),
    ]);
    const map = await computeSmokersClubDiscoverPriorityMap(
      shopper,
      candidates,
      true,
      db,
      vendorIdsServingShopperZip
    );
    const r = map.get(vendorId);
    const trophy_tier = r != null && r >= 1 && r <= 3 ? r : null;

    return NextResponse.json({ vendors_schema: true, trophy_tier });
  } catch (e) {
    console.error('GET /api/smokers-club/rank', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'rank failed' },
      { status: 500 }
    );
  }
}
