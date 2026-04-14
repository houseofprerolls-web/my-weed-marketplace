'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';

const VENDOR_SELECT =
  'id,user_id,name,tagline,description,logo_url,banner_url,slug,address,city,state,zip,phone,website,license_status,is_live,verified,subscription_tier,location,created_at,smokers_club_eligible,social_equity_badge_visible,smokers_club_tab_background_url,sku_card_preset,sku_card_background_url,sku_card_overlay_opacity,store_listing_card_preset,store_listing_card_background_url,store_listing_card_overlay_opacity,offers_delivery,offers_storefront,allow_both_storefront_and_delivery,admin_service_mode,delivery_fee,deal_datetime_scheduling_enabled,order_notification_emails,extra_map_pins_allowed';

export type UseVendorBusinessOptions = {
  /** Set by menu routes when an admin uses `?vendor=` to manage another store. */
  adminMenuVendorId?: string | null;
};

export type VendorBusinessRow = {
  id: string;
  user_id: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  license_status: string;
  is_live: boolean;
  billing_delinquent?: boolean | null;
  verified: boolean;
  /** Admin opt-in for homepage Smokers Club tree + vendor club tools */
  smokers_club_eligible?: boolean | null;
  /** Vendor opt-in: Social equity badge on public listing/discover */
  social_equity_badge_visible?: boolean | null;
  /** Smokers Club tree card backdrop image URL */
  smokers_club_tab_background_url?: string | null;
  /** Public menu / listing SKU card theme */
  sku_card_preset?: string | null;
  sku_card_background_url?: string | null;
  sku_card_overlay_opacity?: number | null;
  store_listing_card_preset?: string | null;
  store_listing_card_background_url?: string | null;
  store_listing_card_overlay_opacity?: number | null;
  subscription_tier?: string | null;
  /** PostGIS geography / GeoJSON from Supabase */
  location?: unknown;
  created_at?: string;
  offers_delivery?: boolean | null;
  /** In-store / pickup (requires full street + city + state for public storefront mode). */
  offers_storefront?: boolean | null;
  /** When true, DB allows both delivery and storefront together. */
  allow_both_storefront_and_delivery?: boolean | null;
  /** Admin override: auto | force_delivery | force_storefront */
  admin_service_mode?: string | null;
  /** USD; checkout / discover display */
  delivery_fee?: number | string | null;
  /** Admin opt-in: precise deal start/end times + daily time windows in vendor deal editor */
  deal_datetime_scheduling_enabled?: boolean | null;
  /** Outbound addresses for automatic new-order alert emails (empty = none sent). */
  order_notification_emails?: string[] | null;
  /** Admin cap on `vendor_locations` rows; vendors cannot raise this. */
  extra_map_pins_allowed?: number | null;
};

function pickPrimaryVendor(rows: VendorBusinessRow[], userId: string): VendorBusinessRow | null {
  if (!rows.length) return null;
  const owned = rows.filter((r) => r.user_id === userId);
  const pool = owned.length ? owned : rows;
  const hop = pool.find((r) => r.slug === 'house-of-prerolls' || r.slug === 'saferock');
  if (hop) return hop;
  const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return sorted[0] ?? null;
}

export function useVendorBusiness(options?: UseVendorBusinessOptions) {
  const adminMenuVendorId = options?.adminMenuVendorId ?? null;
  const { user, loading: authLoading } = useAuth();
  const { canAccessVendorDashboard, loading: roleLoading, isAdmin, isVendor } = useRole();
  const vendorsMode = useVendorsSchema();
  const [vendor, setVendor] = useState<VendorBusinessRow | null>(null);
  const [ownedVendors, setOwnedVendors] = useState<VendorBusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!vendorsMode || !user?.id) {
      setVendor(null);
      setOwnedVendors([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    if (adminMenuVendorId) {
      const { data, error: qErr } = await supabase
        .from('vendors')
        .select(VENDOR_SELECT)
        .eq('id', adminMenuVendorId)
        .maybeSingle();

      if (qErr) {
        setError(qErr.message);
        setVendor(null);
        setOwnedVendors([]);
      } else if (!data) {
        setError('Vendor not found or not accessible.');
        setVendor(null);
        setOwnedVendors([]);
      } else {
        const row = data as VendorBusinessRow;
        setVendor(row);
        setOwnedVendors([row]);
        setError(null);
      }
      setLoading(false);
      return;
    }

    const { data, error: qErr } = await supabase
      .from('vendors')
      .select(VENDOR_SELECT)
      .eq('user_id', user.id)
      .order('slug', { ascending: true });

    if (qErr) {
      setError(qErr.message);
      setVendor(null);
      setOwnedVendors([]);
      setLoading(false);
      return;
    }

    const ownedList = (data || []) as VendorBusinessRow[];
    const ownedIds = new Set(ownedList.map((r) => r.id));

    const { data: memberRows, error: memErr } = await supabase
      .from('vendor_team_members')
      .select('vendor_id')
      .eq('user_id', user.id);

    if (memErr) {
      setError(memErr.message);
      setVendor(null);
      setOwnedVendors([]);
      setLoading(false);
      return;
    }

    const managedIds = Array.from(new Set((memberRows || []).map((r) => r.vendor_id as string))).filter(
      (id) => !ownedIds.has(id)
    );

    let managedList: VendorBusinessRow[] = [];
    if (managedIds.length > 0) {
      const { data: mv, error: mvErr } = await supabase
        .from('vendors')
        .select(VENDOR_SELECT)
        .in('id', managedIds)
        .order('slug', { ascending: true });
      if (mvErr) {
        setError(mvErr.message);
        setVendor(null);
        setOwnedVendors([]);
        setLoading(false);
        return;
      }
      managedList = (mv || []) as VendorBusinessRow[];
    }

    const combined = [...ownedList, ...managedList];
    setOwnedVendors(combined);
    setVendor(pickPrimaryVendor(combined, user.id));
    setError(null);
    setLoading(false);
  }, [user?.id, vendorsMode, adminMenuVendorId]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const gateLoading = authLoading || loading || roleLoading;

  const hasAccessibleVendor = ownedVendors.length > 0;

  const mayEnterVendorShell = Boolean(
    user &&
      vendorsMode &&
      !gateLoading &&
      (isAdmin || hasAccessibleVendor || (canAccessVendorDashboard && vendor))
  );

  const isOwnerOfCurrentVendor = Boolean(
    vendor && user?.id && vendor.user_id != null && vendor.user_id === user.id
  );

  return {
    vendor,
    ownedVendors,
    loading: gateLoading,
    error,
    refresh,
    vendorsMode,
    isAdminManagingOtherVendor: Boolean(adminMenuVendorId),
    /** True when the user may open vendor routes: admin, linked vendor rows, or vendor-role preview (no store yet). */
    mayEnterVendorShell,
    hasAccessibleVendor,
    /** True when the active `vendor` row lists this user as `user_id` (not manager-only). */
    isOwnerOfCurrentVendor,
  };
}
