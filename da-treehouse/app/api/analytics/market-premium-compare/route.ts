import { NextRequest, NextResponse } from "next/server";
import { createCatalogSupabase } from "@/lib/supabase/catalogClient";

function normalizeZip(z: string | null): string | null {
  if (!z) return null;
  const d = z.replace(/\D/g, "");
  return d.length >= 5 ? d.slice(0, 5) : null;
}

export type PremiumCompareRow = {
  vendorId: string;
  name: string;
  slug: string;
  slotRank: number;
  productCount: number;
  avgPriceCents: number;
  reviewAvg: number | null;
  reviewCount: number;
};

/**
 * Compare analytics for up to 10 premium slots in a listing market (by market id or ZIP).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createCatalogSupabase();
    const sp = req.nextUrl.searchParams;
    let marketId = sp.get("marketId");
    const zip = normalizeZip(sp.get("zip"));

    if (!marketId && zip) {
      const prefix = zip.slice(0, 3);
      const { data: prefRow } = await supabase
        .from("market_zip_prefixes")
        .select("market_id")
        .eq("prefix", prefix)
        .maybeSingle();
      marketId = prefRow?.market_id ?? null;
      if (!marketId) {
        const { data: other } = await supabase
          .from("listing_markets")
          .select("id")
          .eq("slug", "california-other")
          .maybeSingle();
        marketId = other?.id ?? null;
      }
    }

    if (!marketId) {
      return NextResponse.json({ rows: [] as PremiumCompareRow[], market: null });
    }

    const { data: market } = await supabase
      .from("listing_markets")
      .select("id, slug, name")
      .eq("id", marketId)
      .maybeSingle();

    const { data: listings, error: lErr } = await supabase
      .from("vendor_market_listings")
      .select("vendor_id, slot_rank")
      .eq("market_id", marketId)
      .eq("active", true)
      .eq("is_premium", true)
      .lte("slot_rank", 9)
      .order("slot_rank", { ascending: true });

    if (lErr) throw lErr;

    const vendorIds = (listings ?? []).map((l) => l.vendor_id);
    if (vendorIds.length === 0) {
      return NextResponse.json({ rows: [], market });
    }

    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name, slug")
      .in("id", vendorIds);

    const vmap = new Map((vendors ?? []).map((v) => [v.id, v] as const));

    const rows: PremiumCompareRow[] = [];

    for (const row of listings ?? []) {
      const v = vmap.get(row.vendor_id);
      if (!v) continue;

      const { count: pc } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", row.vendor_id);

      const { data: prices } = await supabase
        .from("products")
        .select("price_cents")
        .eq("vendor_id", row.vendor_id);

      const { data: revs } = await supabase
        .from("reviews")
        .select("rating")
        .eq("entity_type", "vendor")
        .eq("entity_id", row.vendor_id);

      const priceList = prices ?? [];
      const avgPriceCents =
        priceList.length > 0
          ? Math.round(
              priceList.reduce((s, p) => s + Number(p.price_cents), 0) /
                priceList.length
            )
          : 0;

      const rlist = revs ?? [];
      const reviewCount = rlist.length;
      const reviewAvg =
        reviewCount > 0
          ? Math.round(
              (rlist.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10
            ) / 10
          : null;

      rows.push({
        vendorId: row.vendor_id,
        name: v.name,
        slug: v.slug,
        slotRank: row.slot_rank,
        productCount: pc ?? 0,
        avgPriceCents,
        reviewAvg,
        reviewCount,
      });
    }

    return NextResponse.json({ rows, market });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
