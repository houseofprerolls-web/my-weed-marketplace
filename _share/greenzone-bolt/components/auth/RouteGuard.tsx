'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { canAccessRoute, getRedirectForUnauthorized, type UserRole } from '@/lib/permissions';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const { isAdmin, isVendor } = useRole();
  const userRole: UserRole = profile?.role || 'customer';
  const [vendorPortalOverride, setVendorPortalOverride] = useState<boolean | null>(null);

  const vendorPath = pathname.startsWith('/vendor');

  useEffect(() => {
    if (!vendorPath || loading) {
      setVendorPortalOverride(null);
      return;
    }
    if (isAdmin || isVendor) {
      setVendorPortalOverride(true);
      return;
    }
    if (!user) {
      setVendorPortalOverride(false);
      return;
    }
    let cancelled = false;
    void supabase.rpc('auth_has_any_vendor_access').then(({ data, error }) => {
      if (cancelled) return;
      setVendorPortalOverride(Boolean(data) && !error);
    });
    return () => {
      cancelled = true;
    };
  }, [vendorPath, loading, user, isAdmin, isVendor]);

  useEffect(() => {
    if (loading) return;
    if (vendorPath && vendorPortalOverride === null && userRole === 'customer' && user) {
      return;
    }
    const canAccess = canAccessRoute(pathname, userRole, Boolean(vendorPortalOverride));

    if (!canAccess) {
      const redirectPath = getRedirectForUnauthorized(pathname, userRole);
      router.push(redirectPath);
    }
  }, [pathname, userRole, loading, router, user, vendorPath, vendorPortalOverride]);

  if (loading || (vendorPath && vendorPortalOverride === null && userRole === 'customer' && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const canAccess = canAccessRoute(pathname, userRole, Boolean(vendorPortalOverride));

  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
