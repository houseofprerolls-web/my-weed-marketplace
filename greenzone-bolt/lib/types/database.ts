export interface DeliveryService {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  min_order: number | null;
  delivery_fee: number | null;
  average_delivery_time: number | null;
  rating: number | null;
  total_reviews: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  photos: string[] | null;
  is_verified: boolean | null;
  is_approved: boolean | null;
  approval_status: string | null;
  plan_type: string | null;
  profile_views: number | null;
  listing_views: number | null;
  deal_clicks: number | null;
  website_clicks: number | null;
  direction_clicks: number | null;
  phone_clicks: number | null;
  favorites_count: number | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_products: number | null;
  active_deals_count: number | null;
  featured_until: string | null;
  promoted_until: string | null;
  minimum_order: number | null;
  average_delivery_time: number | null;
  delivery_fee: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  offers_delivery: boolean | null;
  offers_pickup: boolean | null;
  /** CannaHub `vendors.online_menu_enabled` — live cart / ordering on site */
  online_menu_enabled?: boolean | null;
  /** CannaHub `vendors.slug` — used in directory search */
  slug?: string | null;
  /** CannaHub `vendors.social_equity_badge_visible` — public Social equity badge */
  social_equity_badge_visible?: boolean | null;
  /** CannaHub `vendors.smokers_club_eligible` — directory / discover visibility (optional on legacy profiles). */
  smokers_club_eligible?: boolean | null;
  /** CannaHub `vendors.map_visible_override` — show in directory/map without Smokers Club / distance gate. */
  map_visible_override?: boolean | null;
}

export interface Product {
  id: string;
  service_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  weight: string | null;
  strain_type: string | null;
  in_stock: boolean | null;
  is_featured: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface Deal {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  code: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  service_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
}
