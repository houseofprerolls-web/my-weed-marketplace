/*
  # Enhanced Analytics and Admin System

  ## Overview
  Comprehensive analytics tracking and admin moderation tools for platform-wide management.

  ## New Tables

  ### `platform_metrics`
  Daily platform-wide metrics

  ### `vendor_daily_metrics`
  Daily metrics per vendor

  ### `trending_searches`
  Track popular searches

  ### `moderation_queue`
  Content requiring review

  ### `admin_actions`
  Audit log of admin actions

  ## Security
  - Enable RLS on all tables
  - Vendors can view their own metrics
  - Only admins can access moderation and platform metrics
*/

-- Create platform_metrics table
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date UNIQUE NOT NULL,
  total_users integer DEFAULT 0,
  total_vendors integer DEFAULT 0,
  active_vendors integer DEFAULT 0,
  total_products integer DEFAULT 0,
  total_deals integer DEFAULT 0,
  daily_visitors integer DEFAULT 0,
  daily_searches integer DEFAULT 0,
  daily_orders integer DEFAULT 0,
  daily_revenue numeric DEFAULT 0,
  mrr numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date DESC);

-- Create vendor_daily_metrics table
CREATE TABLE IF NOT EXISTS vendor_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  metric_date date NOT NULL,
  profile_views integer DEFAULT 0,
  menu_views integer DEFAULT 0,
  product_clicks integer DEFAULT 0,
  deal_clicks integer DEFAULT 0,
  phone_clicks integer DEFAULT 0,
  website_clicks integer DEFAULT 0,
  direction_clicks integer DEFAULT 0,
  favorites_added integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_daily_metrics_vendor ON vendor_daily_metrics(vendor_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_daily_metrics_date ON vendor_daily_metrics(metric_date DESC);

-- Create trending_searches table
CREATE TABLE IF NOT EXISTS trending_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term text NOT NULL,
  search_count integer DEFAULT 1,
  last_searched timestamptz DEFAULT now(),
  week_number integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trending_searches_count ON trending_searches(search_count DESC, last_searched DESC);
CREATE INDEX IF NOT EXISTS idx_trending_searches_week ON trending_searches(week_number, search_count DESC);

-- Create moderation_queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('vendor', 'review', 'post', 'deal', 'product', 'comment')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON moderation_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderation_queue_type ON moderation_queue(content_type, status);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('approve', 'reject', 'suspend', 'delete', 'edit', 'feature', 'unfeature', 'verify', 'unverify')),
  target_type text NOT NULL CHECK (target_type IN ('vendor', 'user', 'product', 'deal', 'review', 'post', 'license')),
  target_id uuid NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_date ON admin_actions(created_at DESC);

-- Enable RLS
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_metrics
CREATE POLICY "Only admins can view platform metrics"
  ON platform_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for vendor_daily_metrics
CREATE POLICY "Vendors can view their own metrics"
  ON vendor_daily_metrics FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert metrics"
  ON vendor_daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for trending_searches
CREATE POLICY "Anyone can view trending searches"
  ON trending_searches FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage trending searches"
  ON trending_searches FOR ALL
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for moderation_queue
CREATE POLICY "Admins can manage moderation queue"
  ON moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for admin_actions
CREATE POLICY "Admins can view all admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can log actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add unique constraint for trending_searches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trending_searches_term_week_unique'
  ) THEN
    ALTER TABLE trending_searches ADD CONSTRAINT trending_searches_term_week_unique UNIQUE (search_term, week_number);
  END IF;
END $$;

-- Create function to update trending searches
CREATE OR REPLACE FUNCTION update_trending_search(term text)
RETURNS void AS $$
BEGIN
  INSERT INTO trending_searches (search_term, search_count, last_searched, week_number)
  VALUES (LOWER(term), 1, now(), EXTRACT(WEEK FROM now())::integer)
  ON CONFLICT (search_term, week_number)
  DO UPDATE SET
    search_count = trending_searches.search_count + 1,
    last_searched = now();
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO trending_searches (search_term, search_count, last_searched, week_number)
    VALUES (LOWER(term), 1, now(), EXTRACT(WEEK FROM now())::integer);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate vendor metrics
CREATE OR REPLACE FUNCTION calculate_vendor_daily_metrics(v_id uuid, m_date date)
RETURNS void AS $$
DECLARE
  profile_view_count integer;
  menu_view_count integer;
  product_click_count integer;
  deal_click_count integer;
  phone_click_count integer;
  website_click_count integer;
  direction_click_count integer;
  favorite_count integer;
BEGIN
  -- Count profile views
  SELECT COUNT(*) INTO profile_view_count
  FROM analytics_events
  WHERE vendor_id = v_id
  AND event_type = 'listing_view'
  AND DATE(created_at) = m_date;

  -- Count menu views
  SELECT COUNT(*) INTO menu_view_count
  FROM menu_analytics
  WHERE vendor_id = v_id
  AND event_type = 'menu_view'
  AND DATE(created_at) = m_date;

  -- Count product clicks
  SELECT COUNT(*) INTO product_click_count
  FROM menu_analytics
  WHERE vendor_id = v_id
  AND event_type = 'product_click'
  AND DATE(created_at) = m_date;

  -- Count deal clicks
  SELECT COUNT(*) INTO deal_click_count
  FROM menu_analytics
  WHERE vendor_id = v_id
  AND event_type = 'deal_click'
  AND DATE(created_at) = m_date;

  -- Count phone clicks
  SELECT COUNT(*) INTO phone_click_count
  FROM click_events
  WHERE vendor_id = v_id
  AND click_type = 'phone'
  AND DATE(created_at) = m_date;

  -- Count website clicks
  SELECT COUNT(*) INTO website_click_count
  FROM click_events
  WHERE vendor_id = v_id
  AND click_type = 'website'
  AND DATE(created_at) = m_date;

  -- Count direction clicks
  SELECT COUNT(*) INTO direction_click_count
  FROM click_events
  WHERE vendor_id = v_id
  AND click_type = 'directions'
  AND DATE(created_at) = m_date;

  -- Count favorites
  SELECT COUNT(*) INTO favorite_count
  FROM analytics_events
  WHERE vendor_id = v_id
  AND event_type = 'favorite_saved'
  AND DATE(created_at) = m_date;

  -- Insert or update metrics
  INSERT INTO vendor_daily_metrics (
    vendor_id, metric_date, profile_views, menu_views, product_clicks,
    deal_clicks, phone_clicks, website_clicks, direction_clicks, favorites_added
  ) VALUES (
    v_id, m_date, profile_view_count, menu_view_count, product_click_count,
    deal_click_count, phone_click_count, website_click_count, direction_click_count, favorite_count
  )
  ON CONFLICT (vendor_id, metric_date)
  DO UPDATE SET
    profile_views = EXCLUDED.profile_views,
    menu_views = EXCLUDED.menu_views,
    product_clicks = EXCLUDED.product_clicks,
    deal_clicks = EXCLUDED.deal_clicks,
    phone_clicks = EXCLUDED.phone_clicks,
    website_clicks = EXCLUDED.website_clicks,
    direction_clicks = EXCLUDED.direction_clicks,
    favorites_added = EXCLUDED.favorites_added;
END;
$$ LANGUAGE plpgsql;
