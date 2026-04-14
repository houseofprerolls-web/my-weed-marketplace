'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { isVendorsSchema } from '@/lib/vendorSchema';

const VENDOR_SELECT =
  'id,user_id,name,tagline,description,logo_url,banner_url,slug,address,city,state,zip,phone,website,license_status,is_live,verified,subscription_tier,location,created_at,smokers_club_eligible';

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
  verified: boolean;
  /** Admin opt-in for homepage Smokers Club tree + vendor club tools */
  smokers_club_eligible?: boolean | null;
  subscription_tier?: string | null;
  /** PostGIS geography / GeoJSON from Supabase */
  location?: unknown;
  created_at?: string;
};

function pickPrimaryVendor(rows: VendorBusinessRow[], userId: string): VendorBusinessRow | null {
  if (!rows.length) return null;
  const owned = rows.filter((r) => r.user_id === userId);
  const pool = owned.length ? owned : rows;
  const saferock = pool.find((r) => r.slug === 'saferock');
  if (saferock) return saferock;
  const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return sorted[0] ?? null;
}

export function useVendorBusiness(options?: UseVendorBusinessOptions) {
  const adminMenuVendorId = options?.adminMenuVendorId ?? null;
  const { user, loading: authLoading } = useAuth();
  const { canAccessVendorDashboard, loading: roleLoading, isAdmin } = useRole();
  const vendorsMode = isVendorsSchema();
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
    /** True when the user may open vendor routes: admin/vendor role, or any linked `vendors.user_id` row. */
    mayEnterVendorShell,
    /** True when the active `vendor` row lists this user as `user_id` (not manager-only). */
    isOwnerOfCurrentVendor,
  };
}
