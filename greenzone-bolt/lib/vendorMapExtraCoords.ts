import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';

export type VendorExtraLocationCoord = {
  id: string;
  vendor_id: string;
  lat: number;
  lng: number;
  label: string | null;
};

/**
 * Extra storefront pins (`vendor_locations`) visible to anon via RLS when the vendor is public.
 * Paginated for large directories.
 */
export async function fetchVendorExtraLocationCoordsByVendorId(
  client: SupabaseClient = supabase
): Promise<Map<string, VendorExtraLocationCoord[]>> {
  const byVendor = new Map<string, VendorExtraLocationCoord[]>();

  const { rows, error } = await fetchAllSupabasePages<{
    id: string;
    vendor_id: string;
    lat: number | null;
    lng: number | null;
    label: string | null;
  }>(async (from, to) => {
    const res = await client
      .from('vendor_locations')
      .select('id,vendor_id,lat,lng,label')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('vendor_id')
      .order('id')
      .range(from, to);

    return {
      data: (res.data ?? []) as {
        id: string;
        vendor_id: string;
        lat: number | null;
        lng: number | null;
        label: string | null;
      }[],
      error: res.error,
    };
  });

  if (error) {
    console.warn('fetchVendorExtraLocationCoordsByVendorId:', error.message);
    return byVendor;
  }

  for (const row of rows) {
    if (
      typeof row.lat !== 'number' ||
      typeof row.lng !== 'number' ||
      !Number.isFinite(row.lat) ||
      !Number.isFinite(row.lng)
    ) {
      continue;
    }
    const loc: VendorExtraLocationCoord = {
      id: row.id,
      vendor_id: row.vendor_id,
      lat: row.lat,
      lng: row.lng,
      label: row.label,
    };
    const arr = byVendor.get(row.vendor_id);
    if (arr) arr.push(loc);
    else byVendor.set(row.vendor_id, [loc]);
  }
  return byVendor;
}
