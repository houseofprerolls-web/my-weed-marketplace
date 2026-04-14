import { useAuth, UserRole } from '@/contexts/AuthContext';
import { isMasterAdminEmail } from '@/lib/admin';

export function useRole() {
  const { profile, user, loading } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    if (!profile) return false;
    return profile.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isCustomer = profile?.role === 'customer';
  const isVendor = profile?.role === 'vendor';
  const isMasterAdmin = isMasterAdminEmail(user?.email ?? profile?.email);
  const isAdmin = profile?.role === 'admin' || isMasterAdmin;

  const canAccessVendorDashboard = isVendor || isAdmin;
  const canAccessAdminDashboard = isAdmin;

  return {
    role: profile?.role,
    hasRole,
    hasAnyRole,
    isCustomer,
    isVendor,
    isAdmin,
    isMasterAdmin,
    canAccessVendorDashboard,
    canAccessAdminDashboard,
    loading,
  };
}
