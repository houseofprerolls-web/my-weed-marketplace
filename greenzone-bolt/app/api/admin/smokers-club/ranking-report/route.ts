import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractZip5 } from '@/lib/zipUtils';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { fetchLiveVendorsForSmokersClub } from '@/lib/vendorDeliveryList';
import {
  explainSmokersClubTreehouseRanking,
  smokersClubShopperFromZipHint,
  type SmokersClubEmptySlotFillMode,
} from '@/lib/smokersClub';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuthed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await requestUserIsAdmin(supabaseAuthed, user);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!resolveUseVendorsTableForDiscovery()) {
      return NextResponse.json({ error: 'Vendors schema not enabled' }, { status: 400 });
    }

    const rawZip = request.nextUrl.searchParams.get('zip');
    const rawDate = request.nextUrl.searchParams.get('date');
    const z5 = rawZip ? extractZip5(rawZip) : null;
    const zip5 = z5 && z5.length === 5 ? z5 : FALLBACK_LA_ZIP;

    const latRaw = request.nextUrl.searchParams.get('lat');
    const lngRaw = request.nextUrl.searchParams.get('lng');
    const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : null;
    const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : null;
    const shopper = smokersClubShopperFromZipHint(zip5, lat, lng);

    const orderedRaw = request.nextUrl.searchParams.get('ordered');
    const emptySlotFillMode: SmokersClubEmptySlotFillMode =
      orderedRaw === '1' || orderedRaw === 'true' ? 'ordered' : 'shuffle';

    let dateOverride: Date | undefined;
    if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const d = new Date(`${rawDate}T12:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) dateOverride = d;
    }

    const db = createSupabaseDirectoryClient();
    const [candidates, vendorIdsServingShopperZip] = await Promise.all([
      fetchLiveVendorsForSmokersClub(zip5, true, db),
      fetchVendorIdsServingZip5(zip5, db),
    ]);
    const report = await explainSmokersClubTreehouseRanking(
      shopper,
      candidates,
      true,
      dateOverride,
      db,
      emptySlotFillMode,
      vendorIdsServingShopperZip
    );

    return NextResponse.json({
      report,
      zipUsed: zip5,
      shopperGeoMode: shopper.geoMode,
      emptySlotFillMode,
    });
  } catch (e) {
    console.error('GET /api/admin/smokers-club/ranking-report', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ranking report failed' },
      { status: 500 }
    );
  }
}
