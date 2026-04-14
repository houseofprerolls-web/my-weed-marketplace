import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import type { VendorProfile } from '@/lib/types/database';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';
import { publicVendorDisplayName, resolveSocialEquityBadgeVisible } from '@/lib/vendorDisplayName';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { dealIsActiveNow } from '@/lib/dealSchedule';
import { resolvePublicVendorServiceModes } from '@/lib/vendorStorefrontDelivery';
import { filterDiscoveryVendorsForLaunch, vendorSlugAllowedForPublicLaunch } from '@/lib/launchPublicSurface';

function throwIfSupabasePageError(error: unknown): void {
  if (!error) return;
  if (error instanceof Error) throw error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m) throw new Error(m);
  }
  throw new Error(typeof error === 'string' ? error : 'Supabase query failed');
}

/** `discovery` = map/home/Smokers Club (listing photo required). `directory` = full dispensary browse. */
export type DiscoveryVendorsAudience = 'discovery' | 'directory';

function vendorRawRowHasListingPhoto(v: Record<string, unknown>): boolean {
  const logo = String(v.logo_url ?? '').trim();
  const banner = String(v.banner_url ?? '').trim();
  return logo.length > 0 || banner.length > 0;
}

function vendorProfileRowHasListingPhoto(v: Record<string, unknown>): boolean {
  const logo = String(v.logo_url ?? '').trim();
  const cover = String(v.cover_photo_url ?? '').trim();
  const photos = v.photos;
  if (Array.isArray(photos) && photos.some((x) => typeof x === 'string' && String(x).trim() !== '')) {
    return true;
  }
  return logo.length > 0 || cover.length > 0;
}

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
  /** Present on some `vendor_profiles` rows (maps to shopper-facing ZIP). */
  zip_code?: string;
  logo_url?: string;
  /** CannaHub `vendors.banner_url` — fallback for map pins when logo is empty or low-signal. */
  banner_url?: string | null;
  map_marker_image_url?: string | null;
  /** From vendors.location via vendors_public_coords when available */
  geo_lat?: number | null;
  geo_lng?: number | null;
  /** Extra storefront pins from `vendor_locations` (primary remains geo_lat/geo_lng). */
  map_geo_extra_points?: ReadonlyArray<{ lat: number; lng: number }>;
  smokers_club_eligible?: boolean;
  map_visible_override?: boolean;
  /** Vendor opt-in: show Social equity badge (name should not include equity retailer wording). */
  social_equity_badge_visible?: boolean;
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
  /** Hidden from discovery when platform billing is overdue */
  billing_delinquent?: boolean;
  /** CannaHub `vendors.license_status` when using vendors schema */
  license_status?: string;
  website?: string | null;
  sku_card_preset?: string | null;
  sku_card_background_url?: string | null;
  sku_card_overlay_opacity?: number | null;
  store_listing_card_preset?: string | null;
  store_listing_card_background_url?: string | null;
  store_listing_card_overlay_opacity?: number | null;
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
  const rawName = v.name as string | null | undefined;
  const modes = resolvePublicVendorServiceModes({
    address: typeof v.address === 'string' ? v.address : null,
    city: typeof v.city === 'string' ? v.city : null,
    state: typeof v.state === 'string' ? v.state : null,
    zip: typeof v.zip === 'string' ? v.zip : null,
    offers_delivery: v.offers_delivery as boolean | null | undefined,
    offers_storefront: v.offers_storefront as boolean | null | undefined,
    allow_both_storefront_and_delivery: v.allow_both_storefront_and_delivery as boolean | null | undefined,
    admin_service_mode: typeof v.admin_service_mode === 'string' ? v.admin_service_mode : null,
  });
  const { offers_delivery, offers_storefront } = modes;
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
    business_name: publicVendorDisplayName(rawName),
    address:
      typeof v.address === 'string' && v.address.trim() !== '' ? v.address.trim() : undefined,
    city: String(v.city ?? ''),
    state: String(v.state ?? ''),
    zip: String(v.zip ?? '') || undefined,
    logo_url: (v.logo_url as string | undefined) ?? undefined,
    banner_url:
      typeof v.banner_url === 'string' && v.banner_url.trim() !== '' ? v.banner_url.trim() : undefined,
    map_marker_image_url: (v.map_marker_image_url as string | null | undefined) ?? null,
    geo_lat: geoLat,
    geo_lng: geoLng,
    smokers_club_eligible: v.smokers_club_eligible === true,
    map_visible_override: v.map_visible_override === true,
    social_equity_badge_visible: resolveSocialEquityBadgeVisible(
      rawName,
      v.social_equity_badge_visible === true
    ),
    average_rating: 0,
    total_reviews: 0,
    total_products: 0,
    active_deals_count: 0,
    minimum_order: 0,
    delivery_fee: (() => {
      const d = numOrNull(v.delivery_fee);
      return d != null && Number.isFinite(d) ? Math.max(0, d) : 0;
    })(),
    average_delivery_time: 45,
    offers_delivery: offers_delivery,
    offers_storefront,
    offers_pickup: offers_storefront,
    online_menu_enabled: onlineMenu,
    created_at: String(v.created_at ?? ''),
    is_live: Boolean(v.is_live),
    license_status:
      typeof v.license_status === 'string' && v.license_status.trim() !== ''
        ? v.license_status.trim()
        : undefined,
    website: typeof v.website === 'string' && v.website.trim() !== '' ? v.website.trim() : null,
    sku_card_preset: (v.sku_card_preset as string | null | undefined) ?? null,
    sku_card_background_url: (v.sku_card_background_url as string | null | undefined) ?? null,
    sku_card_overlay_opacity:
      v.sku_card_overlay_opacity != null && Number.isFinite(Number(v.sku_card_overlay_opacity))
        ? Number(v.sku_card_overlay_opacity)
        : null,
    store_listing_card_preset: (v.store_listing_card_preset as string | null | undefined) ?? null,
    store_listing_card_background_url:
      (v.store_listing_card_background_url as string | null | undefined) ?? null,
    store_listing_card_overlay_opacity:
      v.store_listing_card_overlay_opacity != null &&
      Number.isFinite(Number(v.store_listing_card_overlay_opacity))
        ? Number(v.store_listing_card_overlay_opacity)
        : null,
  };
}

const DEAL_COUNT_IN_CHUNK = 150;

async function fetchActiveDealCountsByVendorId(
  vendorIds: string[],
  db: SupabaseClient
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (vendorIds.length === 0) return out;

  for (let i = 0; i < vendorIds.length; i += DEAL_COUNT_IN_CHUNK) {
    const slice = vendorIds.slice(i, i + DEAL_COUNT_IN_CHUNK);
    const { data, error } = await db
      .from('deals')
      .select(
        'vendor_id, start_date, end_date, starts_at, ends_at, active_days, daily_start_time, daily_end_time'
      )
      .in('vendor_id', slice);

    if (error) {
      console.error('fetchActiveDealCountsByVendorId:', error);
      continue;
    }

    for (const row of data ?? []) {
      const r = row as {
        vendor_id: string;
        start_date: string;
        end_date: string;
        starts_at?: string | null;
        ends_at?: string | null;
        active_days?: number[] | null;
        daily_start_time?: string | null;
        daily_end_time?: string | null;
      };
      if (!dealIsActiveNow(r)) continue;
      const id = String(r.vendor_id);
      out.set(id, (out.get(id) ?? 0) + 1);
    }
  }

  return out;
}

/** Listings / discover / map — public, live + approved only (direct Supabase; server or scripts). */
export async function fetchDiscoveryVendorsCore(
  useVendorsTable: boolean,
  db: SupabaseClient = supabase,
  opts?: { audience?: DiscoveryVendorsAudience }
): Promise<DiscoveryVendor[]> {
  const audience: DiscoveryVendorsAudience = opts?.audience ?? 'discovery';

  if (useVendorsTable) {
    const { rows, error } = await fetchAllSupabasePages<Record<string, unknown>>(async (from, to) => {
      const res = await db
        .from('vendors')
        .select('*')
        .eq('is_live', true)
        .eq('license_status', 'approved')
        .order('name')
        .range(from, to);

      return { data: (res.data ?? []) as Record<string, unknown>[], error: res.error };
    });

    if (error) throwIfSupabasePageError(error);
    const rowsForMap =
      audience === 'discovery' ? rows.filter(vendorRawRowHasListingPhoto) : rows;
    let vendors = rowsForMap.map((row) => vendorsRowToDiscovery(row));
    const counts = await fetchActiveDealCountsByVendorId(
      vendors.map((v) => v.id),
      db
    );
    vendors = vendors.map((v) => ({
      ...v,
      active_deals_count: counts.get(v.id) ?? 0,
    }));
    return filterDiscoveryVendorsForLaunch(vendors);
  }

  const { rows, error } = await fetchAllSupabasePages<DiscoveryVendor>(async (from, to) => {
    const res = await db
      .from('vendor_profiles')
      .select('*')
      .eq('is_approved', true)
      .eq('approval_status', 'approved')
      .eq('is_live', true)
      .order('average_rating', { ascending: false })
      .range(from, to);

    return { data: (res.data ?? []) as unknown as DiscoveryVendor[], error: res.error };
  });

  if (error) throwIfSupabasePageError(error);
  const rawProfileRows = rows as unknown as Record<string, unknown>[];
  const profileRowsForMap =
    audience === 'discovery'
      ? rawProfileRows.filter(vendorProfileRowHasListingPhoto)
      : rawProfileRows;
  let vendors = profileRowsForMap.map((row) => {
    const v = row as unknown as DiscoveryVendor & { offers_pickup?: boolean | null };
    const modes = resolvePublicVendorServiceModes({
      address: v.address,
      city: v.city,
      state: v.state,
      zip: v.zip ?? v.zip_code,
      offers_delivery: v.offers_delivery,
      offers_storefront: v.offers_storefront,
      offers_pickup: v.offers_pickup,
      admin_service_mode: null,
    });
    return {
      ...v,
      online_menu_enabled: v.online_menu_enabled !== false,
      offers_delivery: modes.offers_delivery,
      offers_storefront: modes.offers_storefront,
      offers_pickup: modes.offers_storefront,
    };
  });
  const counts = await fetchActiveDealCountsByVendorId(
    vendors.map((v) => v.id),
    db
  );
  return filterDiscoveryVendorsForLaunch(
    vendors.map((v) => ({
      ...v,
      active_deals_count: counts.get(v.id) ?? v.active_deals_count ?? 0,
    }))
  );
}

export type DiscoveryVendorsPayload = {
  vendors_schema: boolean;
  vendors: DiscoveryVendor[];
};

/**
 * Browser: GET `/api/discovery/vendors` so `USE_VENDORS_TABLE=1` works without a client rebuild.
 * Server: resolves schema from env and queries Supabase directly.
 */
export async function fetchDiscoveryVendorsPayload(opts?: {
  audience?: DiscoveryVendorsAudience;
}): Promise<DiscoveryVendorsPayload> {
  const audience: DiscoveryVendorsAudience = opts?.audience ?? 'discovery';
  if (typeof window !== 'undefined') {
    const u = new URL('/api/discovery/vendors', window.location.origin);
    u.searchParams.set('audience', audience);
    const res = await fetch(u.toString(), { cache: 'no-store' });
    if (!res.ok) {
      const errText = await res.text();
      let msg = errText || `Discovery vendors failed (${res.status})`;
      try {
        const j = JSON.parse(errText) as { error?: string };
        if (typeof j?.error === 'string' && j.error.trim()) msg = j.error.trim();
      } catch {
        /* plain text body */
      }
      throw new Error(msg);
    }
    return (await res.json()) as DiscoveryVendorsPayload;
  }

  const vendors_schema = resolveUseVendorsTableForDiscovery();
  const directoryClient = createSupabaseDirectoryClient();
  const vendors = await fetchDiscoveryVendorsCore(vendors_schema, directoryClient, { audience });
  return { vendors_schema, vendors };
}

/** Listings / discover / map — public, live + approved only. */
export async function fetchDiscoveryVendors(): Promise<DiscoveryVendor[]> {
  const { vendors } = await fetchDiscoveryVendorsPayload();
  return vendors;
}

/** Map discovery payload rows to dispensary directory shape. */
export function discoveryVendorToVendorProfile(v: DiscoveryVendor): VendorProfile {
  return {
    id: v.id,
    user_id: v.user_id ?? '',
    business_name: v.business_name,
    business_type: 'dispensary',
    description: null,
    address: v.address ?? null,
    city: v.city || null,
    state: v.state || null,
    zip_code: v.zip ?? null,
    phone: null,
    website: v.website ?? null,
    email: null,
    logo_url: v.logo_url ?? null,
    cover_photo_url: null,
    photos: v.logo_url ? [v.logo_url] : null,
    is_verified: true,
    is_approved: v.license_status === 'approved',
    approval_status: v.license_status ?? 'approved',
    plan_type: 'basic',
    profile_views: null,
    listing_views: null,
    deal_clicks: null,
    website_clicks: null,
    direction_clicks: null,
    phone_clicks: null,
    favorites_count: null,
    approved_at: null,
    approved_by: null,
    created_at: v.created_at ?? null,
    updated_at: null,
    total_products: v.total_products ?? null,
    active_deals_count: v.active_deals_count ?? null,
    featured_until: v.featured_until ?? null,
    promoted_until: v.promoted_until ?? null,
    minimum_order: v.minimum_order ?? null,
    average_delivery_time: v.average_delivery_time ?? null,
    delivery_fee: v.delivery_fee ?? null,
    average_rating: v.average_rating ?? null,
    total_reviews: v.total_reviews ?? null,
    offers_delivery: v.offers_delivery,
    offers_pickup: v.offers_storefront,
    online_menu_enabled: v.online_menu_enabled,
    slug: v.slug ?? null,
    social_equity_badge_visible: v.social_equity_badge_visible,
    smokers_club_eligible: v.smokers_club_eligible === true,
    map_visible_override: v.map_visible_override === true,
  };
}

/** Dispensaries page uses VendorProfile-shaped rows. */
export async function fetchVendorsAsVendorProfiles(): Promise<VendorProfile[]> {
  if (typeof window !== 'undefined') {
    const { vendors, vendors_schema } = await fetchDiscoveryVendorsPayload({ audience: 'directory' });
    if (vendors_schema) {
      return vendors.map(discoveryVendorToVendorProfile);
    }
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('is_approved', true)
      .eq('is_live', true)
      .order('average_rating', { ascending: false });

    if (error) throw error;
    return ((data || []) as VendorProfile[]).filter((p) => vendorSlugAllowedForPublicLaunch(p.slug));
  }

  const useVendors = resolveUseVendorsTableForDiscovery();
  if (useVendors) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_live', true)
      .eq('license_status', 'approved')
      .eq('billing_delinquent', false)
      .order('name');

    if (error) throw error;
    return (data || []).map((row) => {
      const v = row as Record<string, unknown>;
      const approved = v.license_status === 'approved';
      const rawName = v.name as string | null | undefined;
      const modes = resolvePublicVendorServiceModes({
        address: (v.address as string | null) ?? null,
        city: (v.city as string | null) ?? null,
        state: (v.state as string | null) ?? null,
        zip: (v.zip as string | null) ?? null,
        offers_delivery: v.offers_delivery as boolean | null | undefined,
        offers_storefront: v.offers_storefront as boolean | null | undefined,
        allow_both_storefront_and_delivery: v.allow_both_storefront_and_delivery as boolean | null | undefined,
        admin_service_mode: typeof v.admin_service_mode === 'string' ? v.admin_service_mode : null,
      });
      return {
        id: v.id as string,
        user_id: (v.user_id as string) ?? '',
        business_name: publicVendorDisplayName(rawName),
        social_equity_badge_visible: resolveSocialEquityBadgeVisible(
          rawName,
          v.social_equity_badge_visible === true
        ),
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
        photos: (() => {
          const logo = (v.logo_url as string | null) ?? null;
          const ban = (v.banner_url as string | null) ?? null;
          const out: string[] = [];
          if (logo?.trim()) out.push(logo.trim());
          if (ban?.trim() && !out.includes(ban.trim())) out.push(ban.trim());
          return out.length ? out : null;
        })(),
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
        active_deals_count: (v.active_deals_count as number | null) ?? null,
        featured_until: (v.featured_until as string | null) ?? null,
        promoted_until: (v.promoted_until as string | null) ?? null,
        minimum_order: (v.minimum_order as number | null) ?? null,
        average_delivery_time: (v.average_delivery_time as number | null) ?? null,
        delivery_fee: (v.delivery_fee as number | null) ?? null,
        average_rating: (v.average_rating as number | null) ?? null,
        total_reviews: (v.total_reviews as number | null) ?? null,
        offers_delivery: modes.offers_delivery,
        offers_pickup: modes.offers_storefront,
        online_menu_enabled: v.online_menu_enabled === true,
        slug:
          v.slug != null && String(v.slug).trim() !== '' ? String(v.slug) : null,
        smokers_club_eligible: v.smokers_club_eligible === true,
      };
    }).filter((p) => vendorSlugAllowedForPublicLaunch(p.slug));
  }

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('is_approved', true)
    .eq('is_live', true)
    .order('average_rating', { ascending: false });

  if (error) throw error;
  return ((data || []) as VendorProfile[]).filter((p) => vendorSlugAllowedForPublicLaunch(p.slug));
}
