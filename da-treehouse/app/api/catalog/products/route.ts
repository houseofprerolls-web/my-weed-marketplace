import { NextResponse } from "next/server";
import { createCatalogSupabase } from "@/lib/supabase/catalogClient";

type CatalogProduct = {
  productId: string;
  name: string;
  category: string;
  priceCents: number;
  inventoryCount: number;
  inStock: boolean;
  createdAt: string;
  /** First menu image URL when present */
  imageUrl: string | null;
  vendor: { id: string; name: string; slug: string } | null;
  strain: { id: string; name: string; slug: string; type: string } | null;
};

export async function GET(req: Request) {
  try {
    const supabase = createCatalogSupabase();

    const url = new URL(req.url);
    const vendorId = url.searchParams.get("vendorId");

    let q = supabase
      .from("products")
      .select(
        "id, name, category, price_cents, inventory_count, in_stock, created_at, vendor_id, strain_id, images"
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (vendorId) q = q.eq("vendor_id", vendorId);

    const { data: products, error: prodErr } = await q;
    if (prodErr) throw prodErr;

    const productRows = products ?? [];
    if (productRows.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const vendorIds = Array.from(
      new Set(productRows.map((p) => p.vendor_id).filter(Boolean))
    ) as string[];
    const strainIds = Array.from(
      new Set(productRows.map((p) => p.strain_id).filter(Boolean))
    ) as string[];

    const [vendorsRes, strainsRes] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, name, slug")
        .in("id", vendorIds),
      supabase
        .from("strains")
        .select("id, name, slug, type")
        .in("id", strainIds),
    ]);

    if (vendorsRes.error) throw vendorsRes.error;
    if (strainsRes.error) throw strainsRes.error;

    const vendorById = new Map(
      (vendorsRes.data ?? []).map((v) => [v.id, v] as const)
    );
    const strainById = new Map(
      (strainsRes.data ?? []).map((s) => [s.id, s] as const)
    );

    const result: CatalogProduct[] = productRows.map((p) => {
      const imgs = p.images as string[] | null;
      const imageUrl =
        Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === "string"
          ? imgs[0]
          : null;
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        priceCents: Number(p.price_cents),
        inventoryCount: Number(p.inventory_count),
        inStock: p.in_stock,
        createdAt: p.created_at,
        imageUrl,
        vendor: p.vendor_id ? vendorById.get(p.vendor_id) ?? null : null,
        strain: p.strain_id ? strainById.get(p.strain_id) ?? null : null,
      };
    });

    return NextResponse.json({ products: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

