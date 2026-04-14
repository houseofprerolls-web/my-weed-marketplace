import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';

export const dynamic = 'force-dynamic';

type SearchVendor = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
};

type SearchBrand = { id: string; name: string; slug: string };

type SearchStrain = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  image_url: string | null;
  has_hero_image: boolean | null;
  rating: number | null;
  review_count: number | null;
};

type SearchProduct = {
  id: string;
  name: string;
  category: string;
  brand_id: string;
  brand_name: string | null;
  image_url: string | null;
};

function envTrim(k: string): string {
  return String(process.env[k] ?? '').trim();
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qRaw = (url.searchParams.get('q') ?? '').trim();
    const q = qRaw.replace(/\s+/g, ' ').slice(0, 80);
    const limit = Math.max(1, Math.min(12, Number.parseInt(url.searchParams.get('limit') ?? '8', 10) || 8));

    if (!q) {
      return NextResponse.json({ q: '', vendors: [], brands: [], strains: [], products: [] });
    }
    if (q.length < 2) {
      return NextResponse.json({ q, vendors: [], brands: [], strains: [], products: [] });
    }

    const supabaseUrl = envTrim('NEXT_PUBLIC_SUPABASE_URL') || envTrim('SUPABASE_URL');
    const anonKey = envTrim('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      return jsonError(500, 'Supabase is not configured');
    }

    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const vendorsSchema = resolveUseVendorsTableForDiscovery();
    const pattern = `%${q}%`;

    const vendorsPromise = vendorsSchema
      ? supabase
          .from('vendors')
          .select('id,name,slug,city,state,logo_url')
          .eq('license_status', 'approved')
          .eq('billing_delinquent', false)
          .or('is_live.eq.true,user_id.not.is.null')
          .ilike('name', pattern)
          .order('name')
          .limit(limit)
      : supabase
          .from('vendor_profiles')
          .select('id,business_name,city,state,logo_url')
          .eq('is_approved', true)
          .eq('approval_status', 'approved')
          .eq('is_live', true)
          .ilike('business_name', pattern)
          .order('business_name')
          .limit(limit);

    const brandsPromise = supabase
      .from('brands')
      .select('id,name,slug')
      .eq('verified', true)
      .ilike('name', pattern)
      .order('name')
      .limit(limit);

    const strainsPromise = supabase
      .from('strains')
      .select('id,name,slug,type,image_url,has_hero_image,rating,review_count')
      .ilike('name', pattern)
      .order('name')
      .limit(limit);

    const productsPromise = supabase
      .from('catalog_products')
      .select('id,name,category,brand_id,images,brands(name)')
      .ilike('name', pattern)
      .limit(limit);

    const [vendorsRes, brandsRes, strainsRes, productsRes] = await Promise.all([
      vendorsPromise,
      brandsPromise,
      strainsPromise,
      productsPromise,
    ]);

    if (vendorsRes.error) return jsonError(500, vendorsRes.error.message);
    if (brandsRes.error) return jsonError(500, brandsRes.error.message);
    if (strainsRes.error) return jsonError(500, strainsRes.error.message);
    if (productsRes.error) return jsonError(500, productsRes.error.message);

    const vendors: SearchVendor[] = (vendorsRes.data || []).map((r: any) => {
      if (vendorsSchema) {
        return {
          id: String(r.id),
          name: String(r.name ?? ''),
          slug: r.slug != null ? String(r.slug) : null,
          city: r.city != null ? String(r.city) : null,
          state: r.state != null ? String(r.state) : null,
          logo_url: r.logo_url != null ? String(r.logo_url) : null,
        };
      }
      return {
        id: String(r.id),
        name: String(r.business_name ?? ''),
        slug: null,
        city: r.city != null ? String(r.city) : null,
        state: r.state != null ? String(r.state) : null,
        logo_url: r.logo_url != null ? String(r.logo_url) : null,
      };
    });

    const brands: SearchBrand[] = ((brandsRes.data || []) as any[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
    }));

    const strains: SearchStrain[] = ((strainsRes.data || []) as any[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
      type: r.type != null ? String(r.type) : null,
      image_url: r.image_url != null ? String(r.image_url) : null,
      has_hero_image: r.has_hero_image === true ? true : r.has_hero_image === false ? false : null,
      rating: r.rating != null && Number.isFinite(Number(r.rating)) ? Number(r.rating) : null,
      review_count:
        r.review_count != null && Number.isFinite(Number(r.review_count))
          ? Math.floor(Number(r.review_count))
          : null,
    }));

    const products: SearchProduct[] = ((productsRes.data || []) as any[]).map((r) => {
      const imgs = Array.isArray(r.images) ? r.images : [];
      const first =
        imgs.map((x: any) => String(x || '').trim()).find((u: string) => /^https?:\/\//i.test(u)) || null;
      const bn =
        r.brands && typeof r.brands === 'object' && (r.brands.name != null)
          ? String(r.brands.name)
          : null;
      return {
        id: String(r.id),
        name: String(r.name ?? ''),
        category: String(r.category ?? 'other'),
        brand_id: String(r.brand_id ?? ''),
        brand_name: bn,
        image_url: first,
      };
    });

    return NextResponse.json({ q, vendors_schema: vendorsSchema, vendors, brands, strains, products });
  } catch (e) {
    console.error('GET /api/search', e);
    return jsonError(500, e instanceof Error ? e.message : 'Search failed');
  }
}

