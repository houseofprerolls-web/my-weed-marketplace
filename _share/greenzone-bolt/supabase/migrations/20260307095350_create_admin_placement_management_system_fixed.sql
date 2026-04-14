/*
  # Admin Placement Management System

  ## Overview
  Internal advertising placement system managed exclusively by GreenZone employees.
  Vendors cannot purchase placements directly - they are assigned by admin sales team.
  Vendors see performance metrics but cannot create or edit campaigns.

  ## New Tables

  ### `admin_placement_campaigns`
  Employee-managed advertising placements

  ### `placement_performance_daily`
  Daily performance aggregation for vendor analytics

  ### `vendor_engagement_scores`
  Track vendor engagement for sales targeting

  ## Security
  - Admin-only access to create/edit placements
  - Vendors can view their own placement performance
  - Public can see active placements (for display)
*/

-- Create admin_placement_campaigns table
CREATE TABLE IF NOT EXISTS admin_placement_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  placement_type text NOT NULL CHECK (placement_type IN ('homepage_featured', 'city_featured', 'map_featured', 'sponsored_deal', 'banner_ad')),
  campaign_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  campaign_notes text,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('active', 'paused', 'completed', 'scheduled', 'canceled')),
  target_location text,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric GENERATED ALWAYS AS (
    CASE 
      WHEN impressions > 0 THEN (clicks::numeric / impressions::numeric) * 100
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_campaigns_vendor ON admin_placement_campaigns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_status ON admin_placement_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_dates ON admin_placement_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_type ON admin_placement_campaigns(placement_type);
CREATE INDEX IF NOT EXISTS idx_admin_campaigns_assigned ON admin_placement_campaigns(assigned_by);

-- Create placement_performance_daily table
CREATE TABLE IF NOT EXISTS placement_performance_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES admin_placement_campaigns(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  metric_date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr numeric GENERATED ALWAYS AS (
    CASE 
      WHEN impressions > 0 THEN (clicks::numeric / impressions::numeric) * 100
      ELSE 0
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_placement_daily_campaign ON placement_performance_daily(campaign_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_placement_daily_vendor ON placement_performance_daily(vendor_id, metric_date DESC);

-- Create vendor_engagement_scores table
CREATE TABLE IF NOT EXISTS vendor_engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  listing_traffic_score numeric DEFAULT 0 CHECK (listing_traffic_score >= 0 AND listing_traffic_score <= 100),
  engagement_growth_score numeric DEFAULT 0 CHECK (engagement_growth_score >= 0 AND engagement_growth_score <= 100),
  deal_performance_score numeric DEFAULT 0 CHECK (deal_performance_score >= 0 AND deal_performance_score <= 100),
  menu_completeness_score numeric DEFAULT 0 CHECK (menu_completeness_score >= 0 AND menu_completeness_score <= 100),
  overall_score numeric DEFAULT 0,
  has_active_campaign boolean DEFAULT false,
  recommended_for_campaign boolean DEFAULT false,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_vendor ON vendor_engagement_scores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_engagement_score ON vendor_engagement_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_recommended ON vendor_engagement_scores(recommended_for_campaign) WHERE recommended_for_campaign = true;

-- Enable RLS
ALTER TABLE admin_placement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_engagement_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_placement_campaigns

-- Admins can manage all campaigns
CREATE POLICY "Admins can manage all campaigns"
  ON admin_placement_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Vendors can view their own campaigns (read-only)
CREATE POLICY "Vendors can view their own campaigns"
  ON admin_placement_campaigns FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- Public can view active campaigns (for display)
CREATE POLICY "Public can view active campaigns"
  ON admin_placement_campaigns FOR SELECT
  TO public
  USING (status = 'active' AND CURRENT_DATE BETWEEN start_date AND end_date);

-- RLS Policies for placement_performance_daily

-- Admins can view all performance data
CREATE POLICY "Admins can view all performance data"
  ON placement_performance_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Vendors can view their own performance
CREATE POLICY "Vendors can view their own performance"
  ON placement_performance_daily FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- System can insert performance data
CREATE POLICY "System can insert performance data"
  ON placement_performance_daily FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for vendor_engagement_scores

-- Admins can manage all scores
CREATE POLICY "Admins can manage all scores"
  ON vendor_engagement_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Vendors can view their own score
CREATE POLICY "Vendors can view their own score"
  ON vendor_engagement_scores FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_admin_campaigns_updated_at ON admin_placement_campaigns;
CREATE TRIGGER update_admin_campaigns_updated_at
  BEFORE UPDATE ON admin_placement_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_engagement_scores_updated_at ON vendor_engagement_scores;
CREATE TRIGGER update_engagement_scores_updated_at
  BEFORE UPDATE ON vendor_engagement_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update campaign status based on dates
CREATE OR REPLACE FUNCTION update_campaign_status()
RETURNS void AS $$
BEGIN
  -- Set to active if scheduled and start date has arrived
  UPDATE admin_placement_campaigns
  SET status = 'active'
  WHERE status = 'scheduled'
  AND start_date <= CURRENT_DATE
  AND end_date >= CURRENT_DATE;

  -- Set to completed if end date has passed
  UPDATE admin_placement_campaigns
  SET status = 'completed'
  WHERE status = 'active'
  AND end_date < CURRENT_DATE;

  -- Update has_active_campaign flag
  UPDATE vendor_engagement_scores ves
  SET has_active_campaign = EXISTS (
    SELECT 1 FROM admin_placement_campaigns apc
    WHERE apc.vendor_id = ves.vendor_id
    AND apc.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate vendor engagement scores
CREATE OR REPLACE FUNCTION calculate_vendor_engagement_score(v_id uuid)
RETURNS void AS $$
DECLARE
  traffic_score numeric;
  growth_score numeric;
  deal_score numeric;
  menu_score numeric;
  calc_overall_score numeric;
  product_count integer;
  category_count integer;
  has_logo boolean;
  weekly_views_current integer;
  weekly_views_previous integer;
  total_deals integer;
  deal_clicks integer;
BEGIN
  -- Calculate traffic score (0-100 based on listing views)
  SELECT LEAST(100, (listing_views::numeric / 100)) INTO traffic_score
  FROM vendor_profiles
  WHERE id = v_id;

  -- Calculate engagement growth (week-over-week)
  SELECT COUNT(*) INTO weekly_views_current
  FROM analytics_events
  WHERE vendor_id = v_id
  AND event_type = 'listing_view'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(*) INTO weekly_views_previous
  FROM analytics_events
  WHERE vendor_id = v_id
  AND event_type = 'listing_view'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
  AND created_at < CURRENT_DATE - INTERVAL '7 days';

  IF weekly_views_previous > 0 THEN
    growth_score := LEAST(100, ((weekly_views_current::numeric - weekly_views_previous::numeric) / weekly_views_previous::numeric) * 100 + 50);
  ELSE
    growth_score := 50;
  END IF;

  -- Calculate deal performance score
  SELECT COUNT(*) INTO total_deals
  FROM product_deals
  WHERE vendor_id = v_id
  AND is_active = true;

  SELECT COUNT(*) INTO deal_clicks
  FROM menu_analytics
  WHERE vendor_id = v_id
  AND event_type = 'deal_click'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';

  IF total_deals > 0 THEN
    deal_score := LEAST(100, (deal_clicks::numeric / total_deals::numeric) * 2);
  ELSE
    deal_score := 0;
  END IF;

  -- Calculate menu completeness score
  SELECT COUNT(*) INTO product_count
  FROM vendor_products
  WHERE vendor_id = v_id;

  SELECT COUNT(*) INTO category_count
  FROM vendor_menu_categories
  WHERE vendor_id = v_id;

  SELECT logo_url IS NOT NULL INTO has_logo
  FROM vendor_profiles
  WHERE id = v_id;

  menu_score := 0;
  IF product_count >= 20 THEN menu_score := menu_score + 40; END IF;
  IF category_count >= 4 THEN menu_score := menu_score + 30; END IF;
  IF has_logo THEN menu_score := menu_score + 30; END IF;

  -- Calculate overall score
  calc_overall_score := (COALESCE(traffic_score, 0) + COALESCE(growth_score, 50) + COALESCE(deal_score, 0) + COALESCE(menu_score, 0)) / 4;

  -- Insert or update engagement score
  INSERT INTO vendor_engagement_scores (
    vendor_id,
    listing_traffic_score,
    engagement_growth_score,
    deal_performance_score,
    menu_completeness_score,
    overall_score,
    recommended_for_campaign,
    last_calculated
  ) VALUES (
    v_id,
    COALESCE(traffic_score, 0),
    COALESCE(growth_score, 50),
    COALESCE(deal_score, 0),
    COALESCE(menu_score, 0),
    calc_overall_score,
    (calc_overall_score >= 60 AND NOT EXISTS (
      SELECT 1 FROM admin_placement_campaigns
      WHERE vendor_id = v_id AND status = 'active'
    )),
    now()
  )
  ON CONFLICT (vendor_id)
  DO UPDATE SET
    listing_traffic_score = COALESCE(traffic_score, 0),
    engagement_growth_score = COALESCE(growth_score, 50),
    deal_performance_score = COALESCE(deal_score, 0),
    menu_completeness_score = COALESCE(menu_score, 0),
    overall_score = calc_overall_score,
    recommended_for_campaign = (calc_overall_score >= 60 AND NOT EXISTS (
      SELECT 1 FROM admin_placement_campaigns
      WHERE vendor_id = v_id AND status = 'active'
    )),
    last_calculated = now();
END;
$$ LANGUAGE plpgsql;
