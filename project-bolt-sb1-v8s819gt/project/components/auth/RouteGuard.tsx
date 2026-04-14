'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, getRedirectForUnauthorized, type UserRole } from '@/lib/permissions';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const userRole: UserRole = profile?.role || 'customer';

  useEffect(() => {
    if (loading) return;

    const canAccess = canAccessRoute(pathname, userRole);

    if (!canAccess) {
      const redirectPath = getRedirectForUnauthorized(pathname, userRole);
      router.push(redirectPath);
    }
  }, [pathname, userRole, loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const canAccess = canAccessRoute(pathname, userRole);

  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
