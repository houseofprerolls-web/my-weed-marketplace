import { supabase } from '@/lib/supabase';

export type VendorAdminStats = {
  vendorId: string;
  name: string;
  slug: string;
  isLive: boolean;
  userId: string | null;
  isDirectoryListing: boolean | null;
  orderCount: number;
  orderRevenueCents: number;
  reviewCount: number;
  avgRating: number | null;
  analyticsEventCount: number;
};

export async function fetchVendorAdminStats(vendorId: string): Promise<VendorAdminStats | null> {
  const { data: v, error: ve } = await supabase
    .from('vendors')
    .select('id,name,slug,is_live,user_id,is_directory_listing')
    .eq('id', vendorId)
    .maybeSingle();

  if (ve || !v) return null;

  const row = v as Record<string, unknown>;

  const { data: orders, error: oe } = await supabase
    .from('orders')
    .select('total_cents')
    .eq('vendor_id', vendorId);

  let orderCount = 0;
  let orderRevenueCents = 0;
  if (!oe && orders?.length) {
    orderCount = orders.length;
    orderRevenueCents = (orders as { total_cents: number }[]).reduce((s, o) => s + (o.total_cents || 0), 0);
  }

  const { data: reviews, error: re } = await supabase
    .from('reviews')
    .select('rating')
    .eq('entity_type', 'vendor')
    .eq('entity_id', vendorId);

  let reviewCount = 0;
  let avgRating: number | null = null;
  if (!re && reviews?.length) {
    const rs = (reviews as { rating: number }[]).map((x) => x.rating).filter((n) => typeof n === 'number');
    reviewCount = rs.length;
    if (reviewCount > 0) {
      avgRating = Math.round((rs.reduce((a, b) => a + b, 0) / reviewCount) * 10) / 10;
    }
  }

  let analyticsEventCount = 0;
  const ev = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId);
  if (!ev.error && typeof ev.count === 'number') {
    analyticsEventCount = ev.count;
  }

  return {
    vendorId: row.id as string,
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    isLive: Boolean(row.is_live),
    userId: (row.user_id as string | null) ?? null,
    isDirectoryListing: (row.is_directory_listing as boolean | null | undefined) ?? null,
    orderCount,
    orderRevenueCents,
    reviewCount,
    avgRating,
    analyticsEventCount,
  };
}

export async function fetchVendorAdminStatsMany(ids: string[]): Promise<VendorAdminStats[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean).slice(0, 3);
  const out: VendorAdminStats[] = [];
  for (const id of unique) {
    const s = await fetchVendorAdminStats(id);
    if (s) out.push(s);
  }
  return out;
}
