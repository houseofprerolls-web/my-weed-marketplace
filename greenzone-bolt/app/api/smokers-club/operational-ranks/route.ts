import { NextRequest, NextResponse } from 'next/server';
import { extractZip5 } from '@/lib/zipUtils';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { fetchLiveVendorsForSmokersClub } from '@/lib/vendorDeliveryList';
import { computeSmokersClubDiscoverPriorityMap, smokersClubShopperFromZipHint } from '@/lib/smokersClub';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';

export const dynamic = 'force-dynamic';

/** Map vendor_id → operational ladder rank (1–7) for Discover / client sort. */
export async function GET(req: NextRequest) {
  try {
    if (!resolveUseVendorsTableForDiscovery()) {
      return NextResponse.json({ vendors_schema: false, ranks: {} as Record<string, number> });
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
    const ranks: Record<string, number> = {};
    map.forEach((rank, id) => {
      ranks[id] = rank;
    });

    return NextResponse.json({ vendors_schema: true, ranks });
  } catch (e) {
    console.error('GET /api/smokers-club/operational-ranks', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'operational ranks failed' },
      { status: 500 }
    );
  }
}
