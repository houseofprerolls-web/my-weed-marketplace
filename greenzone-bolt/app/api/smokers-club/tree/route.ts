import { NextRequest, NextResponse } from 'next/server';
import { extractZip5 } from '@/lib/zipUtils';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchLiveVendorsForSmokersClub } from '@/lib/vendorDeliveryList';
import { backfillSmokersClubTreehouseEmptySlots, buildSmokersClubTreehouseRow, smokersClubShopperFromZipHint } from '@/lib/smokersClub';
import { applySmokersClubTestPins } from '@/lib/smokersTestPins';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const vendors_schema = resolveUseVendorsTableForDiscovery();
    if (!vendors_schema) {
      return NextResponse.json({
        vendors_schema: false,
        market_name: null,
        zip: null,
        slots: [] as (PublicVendorCard | null)[],
      });
    }

    const rawZip = req.nextUrl.searchParams.get('zip');
    const z5 = rawZip ? extractZip5(rawZip) : null;
    const zip5 = z5 && z5.length === 5 ? z5 : FALLBACK_LA_ZIP;

    const latRaw = req.nextUrl.searchParams.get('lat');
    const lngRaw = req.nextUrl.searchParams.get('lng');
    const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : null;
    const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : null;
    const shopper = smokersClubShopperFromZipHint(zip5, lat, lng);

    const db = createSupabaseDirectoryClient();
    const market = await getMarketForSmokersClub(zip5, db);
    const [candidates, vendorIdsServingShopperZip] = await Promise.all([
      fetchLiveVendorsForSmokersClub(zip5, true, db),
      fetchVendorIdsServingZip5(zip5, db),
    ]);
    let row = await buildSmokersClubTreehouseRow(shopper, candidates, true, db, vendorIdsServingShopperZip);
    row = await applySmokersClubTestPins(row, candidates, true, db, shopper, vendorIdsServingShopperZip);
    row = await backfillSmokersClubTreehouseEmptySlots(
      shopper,
      row,
      candidates,
      true,
      db,
      vendorIdsServingShopperZip
    );

    return NextResponse.json(
      {
        vendors_schema: true,
        market_name: market?.name ?? null,
        zip: zip5,
        slots: row,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (e) {
    console.error('GET /api/smokers-club/tree', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Smokers Club tree failed' },
      { status: 500 }
    );
  }
}
