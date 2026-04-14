export type UserRole = 'customer' | 'vendor' | 'admin' | 'admin_jr';

export interface PermissionCheck {
  roles: UserRole[];
  requireAll?: boolean;
}

export const PERMISSIONS = {
  // Customer permissions
  PLACE_ORDER: { roles: ['customer'] },
  VIEW_OWN_ORDERS: { roles: ['customer'] },
  LEAVE_REVIEW: { roles: ['customer'] },
  SAVE_FAVORITE: { roles: ['customer'] },
  FOLLOW_VENDOR: { roles: ['customer'] },

  // Vendor permissions
  MANAGE_MENU: { roles: ['vendor'] },
  MANAGE_PRODUCTS: { roles: ['vendor'] },
  VIEW_VENDOR_ORDERS: { roles: ['vendor'] },
  UPDATE_ORDER_STATUS: { roles: ['vendor'] },
  MANAGE_DEALS: { roles: ['vendor'] },
  VIEW_VENDOR_ANALYTICS: { roles: ['vendor'] },
  MANAGE_VENDOR_PROFILE: { roles: ['vendor'] },

  // Admin permissions
  APPROVE_VENDORS: { roles: ['admin'] },
  MODERATE_CONTENT: { roles: ['admin'] },
  VIEW_ALL_ANALYTICS: { roles: ['admin'] },
  MANAGE_USERS: { roles: ['admin'] },
  MANAGE_PLACEMENTS: { roles: ['admin'] },
  VIEW_ALL_ORDERS: { roles: ['admin'] },
  MANAGE_INCIDENTS: { roles: ['admin'] },
  MANAGE_TASKS: { roles: ['admin'] },

  // Mixed permissions
  VIEW_PUBLIC_CONTENT: { roles: ['customer', 'vendor', 'admin', 'admin_jr'] },
  SEARCH: { roles: ['customer', 'vendor', 'admin', 'admin_jr'] },
} as const;

export function hasPermission(
  userRole: UserRole,
  permission: PermissionCheck
): boolean {
  if (!userRole) {
    return false;
  }

  return permission.roles.some((required) => {
    if (required === 'admin') {
      return userRole === 'admin' || userRole === 'admin_jr';
    }
    return userRole === required;
  });
}

export function hasRole(userRole: UserRole, role: UserRole): boolean {
  return userRole === role;
}

export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'admin_jr';
}

export function isVendor(userRole: UserRole): boolean {
  return userRole === 'vendor';
}

export function isCustomer(userRole: UserRole): boolean {
  return userRole === 'customer';
}

export function canAccessVendorDashboard(userRole: UserRole): boolean {
  return isVendor(userRole) || isAdmin(userRole);
}

export function canAccessAdminDashboard(userRole: UserRole): boolean {
  return isAdmin(userRole);
}

export const PROTECTED_ROUTES = {
  CUSTOMER: [
    '/account',
    '/account/orders',
    '/account/favorites',
    '/account/settings',
    '/account/invites',
    '/checkout',
  ],
  VENDOR: [
    '/vendor/dashboard',
    '/vendor/menu',
    '/vendor/supply',
    '/vendor/orders',
    '/vendor/deals',
    '/vendor/profile',
    '/vendor/analytics',
    '/vendor/advertising',
    '/vendor/customers',
    '/vendor/billing',
    '/vendor/settings',
    '/vendor/team',
    '/vendor/store-qr',
  ],
  ADMIN: [
    '/admin',
    '/admin/supply',
    '/admin/dashboard',
    '/admin/placements',
    '/admin/sales-dashboard',
    '/admin/vendors',
    '/admin/customers',
    '/admin/orders',
    '/admin/content',
    '/admin/incidents',
    '/admin/tasks',
    '/admin/reports',
    '/admin/billing',
    '/admin/settings',
    '/admin/strains',
  ],
} as const;

export function getRequiredRoleForRoute(path: string): UserRole | null {
  if (PROTECTED_ROUTES.ADMIN.some(route => path.startsWith(route))) {
    return 'admin';
  }
  if (PROTECTED_ROUTES.VENDOR.some(route => path.startsWith(route))) {
    return 'vendor';
  }
  if (PROTECTED_ROUTES.CUSTOMER.some(route => path.startsWith(route))) {
    return 'customer';
  }
  return null;
}

export function canAccessRoute(
  path: string,
  userRole: UserRole,
  /** When true, allow /vendor/* for users who have team access without profiles.role = vendor */
  vendorPortalOverride?: boolean
): boolean {
  const requiredRole = getRequiredRoleForRoute(path);

  if (!requiredRole) {
    return true;
  }

  if (requiredRole === 'admin') {
    return isAdmin(userRole);
  }

  if (requiredRole === 'vendor') {
    return canAccessVendorDashboard(userRole) || Boolean(vendorPortalOverride);
  }

  if (requiredRole === 'customer') {
    return hasRole(userRole, 'customer') || isAdmin(userRole);
  }

  return false;
}

export function getRedirectForUnauthorized(path: string, userRole: UserRole): string {
  const requiredRole = getRequiredRoleForRoute(path);

  if (!requiredRole) {
    return '/';
  }

  if (!userRole) {
    return `/?login=true&redirect=${encodeURIComponent(path)}`;
  }

  if (isAdmin(userRole)) {
    return '/admin/dashboard';
  }

  if (isVendor(userRole)) {
    return '/vendor/dashboard';
  }

  if (isCustomer(userRole)) {
    return '/account';
  }

  return '/';
}
