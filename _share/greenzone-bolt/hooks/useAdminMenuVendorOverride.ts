'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRole } from '@/hooks/useRole';

const VENDOR_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admins can open `/vendor/menu?vendor=<uuid>` (and product routes under `/vendor/menu/...`)
 * to manage that store's catalog. Non-admins never receive an override id.
 */
export function useAdminMenuVendorOverride(): string | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useRole();

  return useMemo(() => {
    if (!isAdmin) return null;
    if (!pathname?.startsWith('/vendor/menu')) return null;
    const raw = searchParams.get('vendor')?.trim();
    if (!raw || !VENDOR_UUID.test(raw)) return null;
    return raw;
  }, [isAdmin, pathname, searchParams]);
}
