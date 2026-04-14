import { NextRequest, NextResponse } from "next/server";
import { createCatalogSupabase } from "@/lib/supabase/catalogClient";
import { haversineMiles } from "@/lib/geo/distance";

export type CatalogVendorMarker = {
  vendorId: string;
  name: string;
  slug: string;
  /** Map pin / marker asset */
  mapMarkerImageUrl: string | null;
  /** Storefront profile / logo for listings */
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  distanceMiles: number | null;
};

function normalizeZip(z: string | null | undefined): string | null {
  if (!z) return null;
  const d = z.replace(/\D/g, "");
  return d.length >= 5 ? d.slice(0, 5) : null;
}

function buildMarker(
  vendorId: string,
  v: {
    name: string;
    slug: string;
    map_marker_image_url: string | null;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  },
  best: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: number;
    lng: number;
  },
  bestDist: number | null
): CatalogVendorMarker {
  return {
    vendorId,
    name: v.name,
    slug: v.slug,
    mapMarkerImageUrl: v.map_marker_image_url,
    logoUrl: v.logo_url,
    address: best.address ?? v.address,
    city: best.city ?? v.city,
    state: best.state ?? v.state,
    zip: best.zip ?? v.zip,
    lat: best.lat,
    lng: best.lng,
    distanceMiles: bestDist,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createCatalogSupabase();
    const sp = req.nextUrl.searchParams;
    const latParam = sp.get("lat");
    const lngParam = sp.get("lng");
    const zipFilter = normalizeZip(sp.get("zip"));
    const radiusMiles = Math.min(
      200,
      Math.max(5, Number(sp.get("radiusMiles")) || 75)
    );

    const originLat =
      latParam != null && Number.isFinite(Number(latParam))
        ? Number(latParam)
        : null;
    const originLng =
      lngParam != null && Number.isFinite(Number(lngParam))
        ? Number(lngParam)
        : null;
    const hasOrigin =
      originLat != null &&
      originLng != null &&
      originLat >= -90 &&
      originLat <= 90 &&
      originLng >= -180 &&
      originLng <= 180;

    const { data: locations, error: locErr } = await supabase
      .from("vendor_locations")
      .select(
        "vendor_id, lat, lng, address, city, state, zip, created_at"
      )
      .order("created_at", { ascending: true })
      .limit(800);

    if (locErr) throw locErr;

    type LocRow = NonNullable<typeof locations>[number];
    const byVendor = new Map<string, LocRow[]>();
    for (const loc of locations ?? []) {
      if (!loc || loc.lat == null || loc.lng == null) continue;
      const list = byVendor.get(loc.vendor_id) ?? [];
      list.push(loc);
      byVendor.set(loc.vendor_id, list);
    }

    const vendorIds = Array.from(byVendor.keys());
    if (vendorIds.length === 0) {
      return NextResponse.json({
        premium: [],
        nearby: [],
        vendors: [],
        market: null as { id: string; slug: string; name: string } | null,
      });
    }

    const { data: vendors, error: venErr } = await supabase
      .from("vendors")
      .select(
        "id, name, slug, map_marker_image_url, logo_url, address, city, state, zip"
      )
      .in("id", vendorIds);

    if (venErr) throw venErr;

    const vendorById = new Map((vendors ?? []).map((v) => [v.id, v] as const));

    const inRadius: CatalogVendorMarker[] = [];

    for (const [vendorId, locs] of byVendor.entries()) {
      const v = vendorById.get(vendorId);
      if (!v) continue;

      let best = locs[0]!;
      let bestDist = hasOrigin
        ? haversineMiles(
            originLat!,
            originLng!,
            Number(best.lat),
            Number(best.lng)
          )
        : null;

      for (const loc of locs) {
        if (!hasOrigin) continue;
        const d = haversineMiles(
          originLat!,
          originLng!,
          Number(loc.lat),
          Number(loc.lng)
        );
        if (bestDist == null || d < bestDist) {
          bestDist = d;
          best = loc;
        }
      }

      const locZip = normalizeZip(best.zip ?? undefined);
      const vendorZip = normalizeZip(v.zip ?? undefined);
      const zipMatch =
        zipFilter &&
        (locZip === zipFilter ||
          vendorZip === zipFilter ||
          locs.some((l) => normalizeZip(l.zip ?? undefined) === zipFilter));

      if (zipFilter && !zipMatch) continue;

      if (hasOrigin && bestDist != null && bestDist > radiusMiles) continue;

      inRadius.push(
        buildMarker(
          vendorId,
          v,
          {
            address: best.address,
            city: best.city,
            state: best.state,
            zip: best.zip,
            lat: Number(best.lat),
            lng: Number(best.lng),
          },
          bestDist
        )
      );
    }

    if (hasOrigin) {
      inRadius.sort(
        (a, b) =>
          (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9) ||
          a.name.localeCompare(b.name)
      );
    } else {
      inRadius.sort((a, b) => a.name.localeCompare(b.name));
    }

    const byMarkerId = new Map(inRadius.map((m) => [m.vendorId, m] as const));

    let premium: CatalogVendorMarker[] = [];
    const premiumIdSet = new Set<string>();
    let marketMeta: { id: string; slug: string; name: string } | null = null;

    if (zipFilter) {
      const prefix = zipFilter.slice(0, 3);
      const { data: prefRow, error: prefErr } = await supabase
        .from("market_zip_prefixes")
        .select("market_id, listing_markets ( id, slug, name )")
        .eq("prefix", prefix)
        .maybeSingle();

      let marketId: string | null = null;
      if (!prefErr && prefRow?.market_id) {
        marketId = prefRow.market_id;
        const lmRaw = prefRow.listing_markets as
          | { id: string; slug: string; name: string }
          | { id: string; slug: string; name: string }[]
          | null;
        const lm = Array.isArray(lmRaw) ? lmRaw[0] : lmRaw;
        if (lm) marketMeta = { id: lm.id, slug: lm.slug, name: lm.name };
      }

      if (!marketId) {
        const { data: other } = await supabase
          .from("listing_markets")
          .select("id, slug, name")
          .eq("slug", "california-other")
          .maybeSingle();
        if (other) {
          marketId = other.id;
          marketMeta = { id: other.id, slug: other.slug, name: other.name };
        }
      }

      if (marketId) {
        const { data: placements, error: plErr } = await supabase
          .from("vendor_market_listings")
          .select("vendor_id, slot_rank")
          .eq("market_id", marketId)
          .eq("active", true)
          .eq("is_premium", true)
          .lte("slot_rank", 9)
          .order("slot_rank", { ascending: true });

        if (!plErr && placements?.length) {
          const orderedIds = placements.map((p) => p.vendor_id);
          const missing = orderedIds.filter((id) => !byMarkerId.has(id));

          const extraById = new Map<string, CatalogVendorMarker>();

          if (missing.length > 0) {
            const { data: missLocs } = await supabase
              .from("vendor_locations")
              .select(
                "vendor_id, lat, lng, address, city, state, zip, created_at"
              )
              .in("vendor_id", missing)
              .order("created_at", { ascending: true });

            const { data: missVen } = await supabase
              .from("vendors")
              .select(
                "id, name, slug, map_marker_image_url, logo_url, address, city, state, zip"
              )
              .in("id", missing)
              .eq("is_live", true)
              .eq("license_status", "approved");

            const venMap = new Map(
              (missVen ?? []).map((x) => [x.id, x] as const)
            );
            const locByVendor = new Map<string, LocRow[]>();
            for (const row of missLocs ?? []) {
              if (row.lat == null || row.lng == null) continue;
              const arr = locByVendor.get(row.vendor_id) ?? [];
              arr.push(row);
              locByVendor.set(row.vendor_id, arr);
            }

            for (const vid of missing) {
              const v = venMap.get(vid);
              const locs = locByVendor.get(vid);
              if (!v || !locs?.length) continue;
              let best = locs[0]!;
              let bestDist = hasOrigin
                ? haversineMiles(
                    originLat!,
                    originLng!,
                    Number(best.lat),
                    Number(best.lng)
                  )
                : null;
              for (const loc of locs) {
                if (!hasOrigin) continue;
                const d = haversineMiles(
                  originLat!,
                  originLng!,
                  Number(loc.lat),
                  Number(loc.lng)
                );
                if (bestDist == null || d < bestDist) {
                  bestDist = d;
                  best = loc;
                }
              }
              extraById.set(
                vid,
                buildMarker(
                  vid,
                  v,
                  {
                    address: best.address,
                    city: best.city,
                    state: best.state,
                    zip: best.zip,
                    lat: Number(best.lat),
                    lng: Number(best.lng),
                  },
                  bestDist
                )
              );
            }
          }

          for (const vid of orderedIds) {
            const m = byMarkerId.get(vid) ?? extraById.get(vid);
            if (m) {
              premium.push(m);
              premiumIdSet.add(m.vendorId);
            }
          }
        }
      }
    }

    const nearby = inRadius.filter((m) => !premiumIdSet.has(m.vendorId));

    const seen = new Set<string>();
    const vendorsFlat: CatalogVendorMarker[] = [];
    for (const m of premium) {
      if (!seen.has(m.vendorId)) {
        seen.add(m.vendorId);
        vendorsFlat.push(m);
      }
    }
    for (const m of nearby) {
      if (!seen.has(m.vendorId)) {
        seen.add(m.vendorId);
        vendorsFlat.push(m);
      }
    }

    return NextResponse.json({
      premium,
      nearby,
      vendors: vendorsFlat,
      market: marketMeta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
