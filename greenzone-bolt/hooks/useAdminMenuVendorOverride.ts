'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';

const VENDOR_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read `?vendor=<uuid>` from the URL without `useSearchParams` so static prerender does not
 * deopt entire `/vendor/*` pages (see Next.js `deopted-into-client-rendering`).
 */
function parseVendorFromWindow(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('vendor')?.trim();
    if (!raw || !VENDOR_UUID.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * Admins can open `/vendor/*?vendor=<uuid>` to act in that store's vendor portal (dashboard,
 * profile, menu, etc.). Non-admins never receive an override id.
 */
export function useAdminMenuVendorOverride(): string | null {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const [queryTick, setQueryTick] = useState(0);

  useEffect(() => {
    const onPopState = () => setQueryTick((t) => t + 1);
    window.addEventListener('popstate', onPopState);
    setQueryTick((t) => t + 1);
    return () => window.removeEventListener('popstate', onPopState);
  }, [pathname]);

  return useMemo(() => {
    if (!isAdmin) return null;
    if (!pathname?.startsWith('/vendor')) return null;
    void queryTick;
    return parseVendorFromWindow();
  }, [isAdmin, pathname, queryTick]);
}
