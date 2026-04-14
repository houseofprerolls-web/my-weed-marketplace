import { supabase } from '@/lib/supabase';
import { AssistantType, ContextBuilderOptions } from './types';
import { sanitizeDataForAssistant } from './permissions';
import { UserRole } from '@/lib/permissions';

export class AIContextBuilder {
  private userId: string;
  private assistantType: AssistantType;
  private userRoles: UserRole[];

  constructor(userId: string, assistantType: AssistantType, userRoles: UserRole[]) {
    this.userId = userId;
    this.assistantType = assistantType;
    this.userRoles = userRoles;
  }

  async buildContext(options: Partial<ContextBuilderOptions> = {}): Promise<string> {
    const contexts: string[] = [];

    try {
      switch (this.assistantType) {
        case 'customer':
          contexts.push(await this.buildCustomerContext(options));
          break;
        case 'vendor':
          contexts.push(await this.buildVendorContext(options));
          break;
        case 'admin':
          contexts.push(await this.buildAdminContext(options));
          break;
      }

      return contexts.filter(c => c).join('\n\n');
    } catch (error) {
      console.error('Error building context:', error);
      return '';
    }
  }

  private async buildCustomerContext(options: Partial<ContextBuilderOptions>): Promise<string> {
    const context: string[] = [];

    if (options.includeOrders !== false) {
      const orders = await this.getCustomerOrders();
      if (orders.length > 0) {
        context.push(`Recent Orders (${orders.length}):\n${JSON.stringify(orders, null, 2)}`);
      }
    }

    const favorites = await this.getCustomerFavorites();
    if (favorites.length > 0) {
      context.push(`Saved Favorites: ${favorites.length} vendors`);
    }

    return context.join('\n\n');
  }

  private async buildVendorContext(options: Partial<ContextBuilderOptions>): Promise<string> {
    const context: string[] = [];

    const vendorProfile = await this.getVendorProfile();
    if (vendorProfile) {
      context.push(`Vendor Profile:\n${JSON.stringify(
        sanitizeDataForAssistant(vendorProfile, this.assistantType, this.userRoles),
        null,
        2
      )}`);
    }

    if (options.includeProducts !== false) {
      const products = await this.getVendorProducts();
      if (products.length > 0) {
        context.push(`Product Catalog (${products.length} products):\n${JSON.stringify(
          products.slice(0, options.limit || 20),
          null,
          2
        )}`);
      }
    }

    if (options.includeOrders !== false) {
      const orders = await this.getVendorOrders();
      if (orders.length > 0) {
        context.push(`Recent Orders (${orders.length}):\n${JSON.stringify(
          orders.slice(0, options.limit || 10),
          null,
          2
        )}`);
      }
    }

    if (options.includeAnalytics !== false) {
      const analytics = await this.getVendorAnalytics();
      if (analytics) {
        context.push(`Performance Metrics:\n${JSON.stringify(analytics, null, 2)}`);
      }
    }

    return context.join('\n\n');
  }

  private async buildAdminContext(options: Partial<ContextBuilderOptions>): Promise<string> {
    const context: string[] = [];

    const platformMetrics = await this.getPlatformMetrics();
    if (platformMetrics) {
      context.push(`Platform Overview:\n${JSON.stringify(platformMetrics, null, 2)}`);
    }

    const pendingVendors = await this.getPendingVendors();
    if (pendingVendors.length > 0) {
      context.push(`Pending Vendor Approvals: ${pendingVendors.length}`);
    }

    const incidents = await this.getRecentIncidents();
    if (incidents.length > 0) {
      context.push(`Active Incidents: ${incidents.length}`);
    }

    return context.join('\n\n');
  }

  private async getCustomerOrders() {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, created_at, vendor_id')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    return data || [];
  }

  private async getCustomerFavorites() {
    const { data } = await supabase
      .from('favorites')
      .select('vendor_id')
      .eq('user_id', this.userId);

    return data || [];
  }

  private async getVendorProfile() {
    const { data } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    return data;
  }

  private async getVendorProducts() {
    const vendorProfile = await this.getVendorProfile();
    if (!vendorProfile) return [];

    const { data } = await supabase
      .from('vendor_products')
      .select('id, name, brand, description, price, stock_status, thc_percentage')
      .eq('vendor_id', vendorProfile.id)
      .limit(20);

    return data || [];
  }

  private async getVendorOrders() {
    const vendorProfile = await this.getVendorProfile();
    if (!vendorProfile) return [];

    const { data } = await supabase
      .from('orders')
      .select('id, status, total, created_at')
      .eq('vendor_id', vendorProfile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  private async getVendorAnalytics() {
    const vendorProfile = await this.getVendorProfile();
    if (!vendorProfile) return null;

    const { data: metrics } = await supabase
      .from('vendor_daily_metrics')
      .select('*')
      .eq('vendor_id', vendorProfile.id)
      .order('date', { ascending: false })
      .limit(7);

    return metrics?.[0] || null;
  }

  private async getPlatformMetrics() {
    const { data } = await supabase
      .from('platform_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }

  private async getPendingVendors() {
    const { data } = await supabase
      .from('vendor_profiles')
      .select('id, business_name, approval_status')
      .eq('approval_status', 'pending')
      .limit(10);

    return data || [];
  }

  private async getRecentIncidents() {
    const { data } = await supabase
      .from('incident_reports')
      .select('id, title, severity, status')
      .in('status', ['new', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }
}

export async function buildAIContext(
  userId: string,
  assistantType: AssistantType,
  userRoles: UserRole[],
  options: Partial<ContextBuilderOptions> = {}
): Promise<string> {
  const builder = new AIContextBuilder(userId, assistantType, userRoles);
  return builder.buildContext(options);
}
