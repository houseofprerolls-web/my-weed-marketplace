/*
  # GreenZone Platform - Complete Database Schema

  ## Overview
  Comprehensive nationwide cannabis directory platform with customer discovery,
  vendor management, and admin control.

  ## New Tables

  ### 1. `user_roles`
  - Track user roles (customer, vendor, admin)
  - Support multiple roles per user

  ### 2. `vendor_profiles`
  - Business information
  - License verification
  - Approval status
  - Plan type (basic, featured, premium)

  ### 3. `business_categories`
  - Dispensary, Delivery, Brand, etc.

  ### 4. `business_licenses`
  - License verification documents
  - Approval status

  ### 5. `business_hours`
  - Operating hours for each business

  ### 6. `placement_campaigns`
  - Featured placements
  - Homepage placement
  - Category placement
  - City placement

  ### 7. `analytics_events`
  - Track all user interactions
  - Page views, clicks, searches

  ### 8. `search_logs`
  - Track search queries and results

  ### 9. `click_events`
  - Track clicks on business actions

  ### 10. `reports`
  - User-submitted reports for moderation

  ### 11. `admin_notes`
  - Admin notes on vendors and listings

  ## Security
  - RLS policies for all tables
  - Role-based access control
  - Admin approval workflows
*/

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Vendor Profiles Table
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('dispensary', 'delivery', 'brand', 'cultivator')),
  description text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  website text,
  email text,
  logo_url text,
  cover_photo_url text,
  photos text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  plan_type text DEFAULT 'basic' CHECK (plan_type IN ('basic', 'featured', 'premium')),
  profile_views integer DEFAULT 0,
  listing_views integer DEFAULT 0,
  deal_clicks integer DEFAULT 0,
  website_clicks integer DEFAULT 0,
  direction_clicks integer DEFAULT 0,
  phone_clicks integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved vendors"
  ON vendor_profiles FOR SELECT
  USING (is_approved = true AND approval_status = 'approved');

CREATE POLICY "Vendors can view own profile"
  ON vendor_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Vendors can update own profile"
  ON vendor_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Vendors can create own profile"
  ON vendor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all vendors"
  ON vendor_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Business Categories Table
CREATE TABLE IF NOT EXISTS business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business categories"
  ON business_categories FOR SELECT
  TO public
  USING (true);

-- Vendor Categories Junction Table
CREATE TABLE IF NOT EXISTS vendor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES business_categories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, category_id)
);

ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vendor categories"
  ON vendor_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can manage own categories"
  ON vendor_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

-- Business Licenses Table
CREATE TABLE IF NOT EXISTS business_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  license_number text NOT NULL,
  license_type text NOT NULL,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  document_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own licenses"
  ON business_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can manage own licenses"
  ON business_licenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all licenses"
  ON business_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Business Hours Table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, day_of_week)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business hours"
  ON business_hours FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can manage own hours"
  ON business_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

-- Placement Campaigns Table
CREATE TABLE IF NOT EXISTS placement_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  placement_type text NOT NULL CHECK (placement_type IN ('homepage_featured', 'category_featured', 'city_featured', 'sponsored')),
  target_location text,
  target_category text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  budget numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE placement_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own campaigns"
  ON placement_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can manage own campaigns"
  ON placement_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all campaigns"
  ON placement_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Vendors can view own analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    vendor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Search Logs Table
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search_query text NOT NULL,
  search_type text,
  location text,
  filters jsonb DEFAULT '{}',
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert search logs"
  ON search_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view search logs"
  ON search_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Click Events Table  
CREATE TABLE IF NOT EXISTS click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  click_type text NOT NULL CHECK (click_type IN ('website', 'phone', 'directions', 'deal', 'menu')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert click events"
  ON click_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Vendors can view own clicks"
  ON click_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_type text NOT NULL CHECK (reported_type IN ('vendor', 'review', 'deal', 'post')),
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all reports"
  ON reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin Notes Table
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('vendor', 'user', 'license', 'report')),
  subject_id uuid NOT NULL,
  note text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all notes"
  ON admin_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default business categories
INSERT INTO business_categories (name, slug, description, icon, sort_order) VALUES
  ('Dispensary', 'dispensary', 'Retail cannabis dispensaries', 'Store', 1),
  ('Delivery', 'delivery', 'Cannabis delivery services', 'Truck', 2),
  ('Brand', 'brand', 'Cannabis brands and products', 'Award', 3),
  ('Cultivator', 'cultivator', 'Cannabis cultivation and grow operations', 'Leaf', 4),
  ('Medical', 'medical', 'Medical cannabis providers', 'Heart', 5),
  ('Recreational', 'recreational', 'Recreational cannabis services', 'Sparkles', 6)
ON CONFLICT (slug) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_city ON vendor_profiles(city);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_state ON vendor_profiles(state);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_approval_status ON vendor_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_plan_type ON vendor_profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_vendor_id ON analytics_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_vendor_id ON click_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_placement_campaigns_vendor_id ON placement_campaigns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_placement_campaigns_active ON placement_campaigns(is_active, start_date, end_date);
