import { useAuth, UserRole } from '@/contexts/AuthContext';

export function useRole() {
  const { profile, loading } = useAuth();

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
  const isAdmin = profile?.role === 'admin';

  const canAccessVendorDashboard = isVendor || isAdmin;
  const canAccessAdminDashboard = isAdmin;

  return {
    role: profile?.role,
    hasRole,
    hasAnyRole,
    isCustomer,
    isVendor,
    isAdmin,
    canAccessVendorDashboard,
    canAccessAdminDashboard,
    loading,
  };
}
