import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import type { VendorProfile } from '@/lib/types/database';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';

export type DiscoveryVendor = {
  id: string;
  /** CannaHub `vendors.slug` — used for Smokers Club test pins / deep links */
  slug?: string;
  user_id?: string;
  business_name: string;
  /** Street line when present on `vendors` */
  address?: string;
  city: string;
  state: string;
  zip?: string;
  logo_url?: string;
  map_marker_image_url?: string | null;
  /** From vendors.location via vendors_public_coords when available */
  geo_lat?: number | null;
  geo_lng?: number | null;
  smokers_club_eligible?: boolean;
  average_rating: number;
  total_reviews: number;
  total_products: number;
  active_deals_count: number;
  minimum_order: number;
  delivery_fee: number;
  average_delivery_time: number;
  offers_delivery: boolean;
  /** True when vendor has a physical storefront / pickup (vendors.offers_storefront). */
  offers_storefront: boolean;
  /** @deprecated use offers_storefront */
  offers_pickup: boolean;
  /** Public online menu + cart (vendors.online_menu_enabled). */
  online_menu_enabled: boolean;
  featured_until?: string;
  promoted_until?: string;
  created_at: string;
  is_live?: boolean;
};

function numOrNull(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function vendorsRowToDiscovery(v: Record<string, unknown>): DiscoveryVendor {
  const offersDelivery = (v.offers_delivery as boolean | undefined) !== false;
  const offersStorefront = (v.offers_storefront as boolean | undefined) !== false;
  const onlineMenu =
    v.online_menu_enabled === undefined || v.online_menu_enabled === null
      ? true
      : Boolean(v.online_menu_enabled);
  const geoLat =
    numOrNull(v.geo_lat) ??
    numOrNull(v.lat) ??
    numOrNull(v.latitude);
  const geoLng =
    numOrNull(v.geo_lng) ??
    numOrNull(v.lng) ??
    numOrNull(v.longitude);
  return {
    id: v.id as string,
    slug: (v.slug as string | undefined) ? String(v.slug) : undefined,
    user_id: (v.user_id as string | undefined) ?? undefined,
    business_name: String(v.name ?? ''),
    address:
      typeof v.address === 'string' && v.address.trim() !== '' ? v.address.trim() : undefined,
    city: String(v.city ?? ''),
    state: String(v.state ?? ''),
    zip: String(v.zip ?? '') || undefined,
    logo_url: (v.logo_url as string | undefined) ?? undefined,
    map_marker_image_url: (v.map_marker_image_url as string | null | undefined) ?? null,
    geo_lat: geoLat,
    geo_lng: geoLng,
    smokers_club_eligible: v.smokers_club_eligible === true,
    average_rating: 0,
    total_reviews: 0,
    total_products: 0,
    active_deals_count: 0,
    minimum_order: 0,
    delivery_fee: 0,
    average_delivery_time: 45,
    offers_delivery: offersDelivery,
    offers_storefront: offersStorefront,
    offers_pickup: offersStorefront,
    online_menu_enabled: onlineMenu,
    created_at: String(v.created_at ?? ''),
    is_live: Boolean(v.is_live),
  };
}

/** Listings / discover / map — public, live + approved only. */
export async function fetchDiscoveryVendors(): Promise<DiscoveryVendor[]> {
  if (isVendorsSchema()) {
    const { rows, error } = await fetchAllSupabasePages<Record<string, unknown>>(async (from, to) => {
      const res = await supabase
        .from('vendors')
        .select('*')
        .eq('is_live', true)
        .eq('license_status', 'approved')
        .order('name')
        .range(from, to);

      return { data: (res.data ?? []) as Record<string, unknown>[], error: res.error };
    });

    if (error) throw error;
    return rows.map((row) => vendorsRowToDiscovery(row));
  }

  const { rows, error } = await fetchAllSupabasePages<DiscoveryVendor>(async (from, to) => {
    const res = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('is_approved', true)
      .eq('approval_status', 'approved')
      .eq('is_live', true)
      .order('average_rating', { ascending: false })
      .range(from, to);

    // vendor_profiles is shaped like VendorProfile; DiscoverVendor matches a subset.
    return { data: (res.data ?? []) as unknown as DiscoveryVendor[], error: res.error };
  });

  if (error) throw error;
  return rows.map((row) => {
    const v = row as unknown as DiscoveryVendor;
    return {
      ...v,
      online_menu_enabled: v.online_menu_enabled !== false,
    };
  });
}

/** Dispensaries page uses VendorProfile-shaped rows. */
export async function fetchVendorsAsVendorProfiles(): Promise<VendorProfile[]> {
  if (isVendorsSchema()) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_live', true)
      .eq('license_status', 'approved')
      .order('name');

    if (error) throw error;
    return (data || []).map((row) => {
      const v = row as Record<string, unknown>;
      const approved = v.license_status === 'approved';
      return {
        id: v.id as string,
        user_id: (v.user_id as string) ?? '',
        business_name: String(v.name ?? ''),
        business_type: 'dispensary',
        description: (v.description as string | null) ?? null,
        address: (v.address as string | null) ?? null,
        city: (v.city as string | null) ?? null,
        state: (v.state as string | null) ?? null,
        zip_code: (v.zip as string | null) ?? null,
        phone: (v.phone as string | null) ?? null,
        website: (v.website as string | null) ?? null,
        email: null,
        logo_url: (v.logo_url as string | null) ?? null,
        cover_photo_url: (v.banner_url as string | null) ?? null,
        photos: null,
        is_verified: Boolean(v.verified),
        is_approved: approved,
        approval_status: String(v.license_status ?? 'pending'),
        plan_type: String(v.subscription_tier ?? 'basic'),
        profile_views: null,
        listing_views: null,
        deal_clicks: null,
        website_clicks: null,
        direction_clicks: null,
        phone_clicks: null,
        favorites_count: null,
        approved_at: null,
        approved_by: null,
        created_at: (v.created_at as string | null) ?? null,
        updated_at: null,
        total_products: null,
        active_deals_count: null,
        featured_until: null,
        promoted_until: null,
        minimum_order: null,
        average_delivery_time: null,
        delivery_fee: null,
        average_rating: null,
        total_reviews: null,
        offers_delivery: null,
        offers_pickup: null,
      };
    });
  }

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('is_approved', true)
    .eq('is_live', true)
    .order('average_rating', { ascending: false });

  if (error) throw error;
  return (data || []) as VendorProfile[];
}
