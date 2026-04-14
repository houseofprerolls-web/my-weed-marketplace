import { UserRole } from '@/lib/permissions';
import { AssistantType } from './types';

export function canAccessAssistant(
  userRoles: UserRole[],
  assistantType: AssistantType
): boolean {
  switch (assistantType) {
    case 'customer':
      return userRoles.includes('customer') || userRoles.includes('admin');

    case 'vendor':
      return userRoles.includes('vendor') || userRoles.includes('admin');

    case 'admin':
      return userRoles.includes('admin');

    default:
      return false;
  }
}

export function getAvailableAssistants(userRoles: UserRole[]): AssistantType[] {
  const assistants: AssistantType[] = [];

  if (userRoles.includes('customer') || userRoles.includes('admin')) {
    assistants.push('customer');
  }

  if (userRoles.includes('vendor') || userRoles.includes('admin')) {
    assistants.push('vendor');
  }

  if (userRoles.includes('admin')) {
    assistants.push('admin');
  }

  return assistants;
}

export function canAccessContext(
  userRoles: UserRole[],
  contextType: string,
  assistantType: AssistantType
): boolean {
  if (!canAccessAssistant(userRoles, assistantType)) {
    return false;
  }

  switch (assistantType) {
    case 'customer':
      return [
        'orders',
        'favorites',
        'search_history',
        'reviews',
        'profile'
      ].includes(contextType);

    case 'vendor':
      return [
        'vendor_profile',
        'products',
        'menu',
        'orders',
        'analytics',
        'reviews',
        'deals'
      ].includes(contextType);

    case 'admin':
      return [
        'platform_metrics',
        'vendor_performance',
        'moderation_queue',
        'incidents',
        'sales_opportunities',
        'market_insights'
      ].includes(contextType);

    default:
      return false;
  }
}

export const ASSISTANT_PERMISSIONS = {
  customer: {
    canAccessOwnOrders: true,
    canAccessOwnProfile: true,
    canAccessPublicVendors: true,
    canAccessPublicProducts: true,
    canAccessOwnReviews: true,
    canAccessPlatformData: false,
    canAccessOtherUsers: false,
  },
  vendor: {
    canAccessOwnVendorProfile: true,
    canAccessOwnProducts: true,
    canAccessOwnOrders: true,
    canAccessOwnAnalytics: true,
    canAccessOwnReviews: true,
    canAccessCustomerData: false,
    canAccessPlatformData: false,
  },
  admin: {
    canAccessAllVendors: true,
    canAccessPlatformMetrics: true,
    canAccessModerationQueue: true,
    canAccessIncidents: true,
    canAccessAllOrders: false,
    canAccessAllUsers: false,
    canAccessFinancialData: false,
  },
} as const;

export function sanitizeDataForAssistant(
  data: any,
  assistantType: AssistantType,
  userRoles: UserRole[]
): any {
  if (!canAccessAssistant(userRoles, assistantType)) {
    return null;
  }

  const sanitized = { ...data };

  switch (assistantType) {
    case 'customer':
      delete sanitized.admin_notes;
      delete sanitized.internal_notes;
      delete sanitized.vendor_cost;
      delete sanitized.profit_margin;
      break;

    case 'vendor':
      delete sanitized.customer_email;
      delete sanitized.customer_phone;
      delete sanitized.customer_address;
      delete sanitized.payment_details;
      delete sanitized.internal_notes;
      break;

    case 'admin':
      delete sanitized.payment_details;
      delete sanitized.full_credit_card;
      delete sanitized.ssn;
      break;
  }

  return sanitized;
}
