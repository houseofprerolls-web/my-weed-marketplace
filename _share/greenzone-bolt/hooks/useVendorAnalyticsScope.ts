'use client';

import { useEffect, useMemo, useState } from 'react';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import { formatVendorArea } from '@/lib/vendorDisplay';

/**
 * When a user owns multiple `vendors` rows, they can view combined analytics or one location at a time.
 */
export function useVendorAnalyticsScope(
  vendor: VendorBusinessRow | null,
  ownedVendors: VendorBusinessRow[]
) {
  const [scope, setScope] = useState<'all' | string>('all');

  useEffect(() => {
    if (ownedVendors.length === 0) return;
    if (ownedVendors.length === 1) {
      setScope(ownedVendors[0]!.id);
      return;
    }
    setScope((prev) => {
      if (prev !== 'all' && ownedVendors.some((v) => v.id === prev)) return prev;
      return 'all';
    });
  }, [ownedVendors]);

  const effectiveVendorIds = useMemo(() => {
    if (ownedVendors.length === 0) return [];
    if (scope === 'all') return ownedVendors.map((v) => v.id);
    return ownedVendors.some((v) => v.id === scope) ? [scope] : ownedVendors.map((v) => v.id);
  }, [scope, ownedVendors]);

  const resolvedVendor = useMemo(() => {
    if (!vendor) return null;
    if (scope === 'all') return vendor;
    return ownedVendors.find((v) => v.id === scope) ?? vendor;
  }, [scope, ownedVendors, vendor]);

  const dashboardTitle = useMemo(() => {
    if (!vendor) return '';
    if (scope === 'all' && ownedVendors.length > 1) {
      return `${vendor.name} · ${ownedVendors.length} locations`;
    }
    return (resolvedVendor ?? vendor).name;
  }, [vendor, ownedVendors.length, scope, resolvedVendor]);

  const analyticsSubtitle = useMemo(() => {
    if (!vendor || ownedVendors.length === 0) return '';
    if (scope === 'all' && ownedVendors.length > 1) {
      return `Analytics · Combined across all linked shops (${ownedVendors.length})`;
    }
    const v = resolvedVendor ?? vendor;
    return `Analytics · ${formatVendorArea(v)}`;
  }, [vendor, ownedVendors.length, scope, resolvedVendor]);

  const showScopePicker = ownedVendors.length > 1;

  return {
    analyticsScope: scope,
    setAnalyticsScope: setScope,
    effectiveVendorIds,
    resolvedVendor,
    dashboardTitle,
    analyticsSubtitle,
    showScopePicker,
  };
}
