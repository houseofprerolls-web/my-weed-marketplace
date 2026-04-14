import { supabase } from './supabase';

export type EventType =
  | 'listing_view'
  | 'map_pin_click'
  | 'phone_click'
  | 'website_click'
  | 'directions_click'
  | 'deal_click'
  | 'favorite_saved'
  | 'favorite_removed'
  | 'search_performed'
  | 'review_submitted'
  | 'page_view'
  /** Strain encyclopedia detail page opened (used for /strains trending). */
  | 'strain_page_view'
  /** Shoppers saw your shop card on the homepage Smokers Club tree (per tree load). */
  | 'smokers_club_tree_impression'
  /** Shoppers clicked your card on the tree to open your listing. */
  | 'smokers_club_tree_click';

interface TrackEventParams {
  eventType: EventType;
  vendorId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export async function trackEvent({
  eventType,
  vendorId,
  userId,
  metadata = {}
}: TrackEventParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      vendor_id: vendorId,
      user_id: userId || user?.id,
      metadata
    });

    if (vendorId && ['website_click', 'phone_click', 'directions_click', 'listing_view'].includes(eventType)) {
      const updateField = eventType === 'listing_view' ? 'listing_views' :
                         eventType === 'website_click' ? 'website_clicks' :
                         eventType === 'phone_click' ? 'phone_clicks' :
                         'direction_clicks';

      await supabase.rpc('increment_vendor_metric', {
        vendor_id: vendorId,
        metric_name: updateField
      });
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function trackClickEvent(
  vendorId: string,
  clickType: 'website' | 'phone' | 'directions' | 'deal' | 'menu',
  metadata: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('click_events').insert({
      vendor_id: vendorId,
      user_id: user?.id,
      click_type: clickType,
      metadata
    });
  } catch (error) {
    console.error('Click tracking error:', error);
  }
}

export async function trackSearch(
  query: string,
  searchType: string,
  location?: string,
  filters: Record<string, any> = {},
  resultsCount: number = 0
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('search_logs').insert({
      user_id: user?.id,
      search_query: query,
      search_type: searchType,
      location,
      filters,
      results_count: resultsCount
    });
  } catch (error) {
    console.error('Search tracking error:', error);
  }
}
