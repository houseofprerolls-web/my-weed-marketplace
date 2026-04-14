/*
  # Subscription and Monetization Engine

  ## Overview
  Complete billing system for recurring vendor subscriptions, placement advertising, and revenue tracking.

  ## New Tables

  ### `subscription_plans`
  Available subscription tiers
  - `id` (uuid, primary key)
  - `name` (text) - Basic, Growth, Premium
  - `slug` (text) - URL identifier
  - `price_monthly` (numeric)
  - `price_annual` (numeric)
  - `features` (jsonb) - Plan features
  - `limits` (jsonb) - Product limits, photo limits, etc.
  - `is_active` (boolean)

  ### `vendor_subscriptions`
  Active vendor subscriptions
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, references vendor_profiles)
  - `plan_id` (uuid, references subscription_plans)
  - `status` (text) - active, past_due, canceled, expired
  - `billing_cycle` (text) - monthly, annual
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `stripe_subscription_id` (text)
  - `stripe_customer_id` (text)
  - `created_at`, `updated_at` (timestamptz)

  ### `invoices`
  Billing history
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `subscription_id` (uuid)
  - `invoice_number` (text, unique)
  - `amount` (numeric)
  - `tax` (numeric)
  - `total` (numeric)
  - `status` (text) - paid, pending, failed, refunded
  - `stripe_invoice_id` (text)
  - `paid_at` (timestamptz)
  - `due_date` (timestamptz)
  - `created_at` (timestamptz)

  ### `payment_methods`
  Stored payment methods
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `stripe_payment_method_id` (text)
  - `card_brand` (text)
  - `card_last4` (text)
  - `exp_month` (integer)
  - `exp_year` (integer)
  - `is_default` (boolean)
  - `created_at` (timestamptz)

  ### `placement_pricing`
  Pricing for ad placements
  - `id` (uuid, primary key)
  - `placement_type` (text)
  - `name` (text)
  - `description` (text)
  - `price_per_day` (numeric)
  - `price_per_week` (numeric)
  - `price_per_month` (numeric)
  - `is_active` (boolean)

  ### `revenue_events`
  Track all revenue
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `revenue_type` (text) - subscription, placement, ad
  - `amount` (numeric)
  - `description` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Vendors can view their own billing data
  - Admins can view all revenue data
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  price_monthly numeric NOT NULL CHECK (price_monthly >= 0),
  price_annual numeric NOT NULL CHECK (price_annual >= 0),
  features jsonb DEFAULT '{}',
  limits jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_annual, features, limits, sort_order) VALUES
  ('Starter', 'starter', 49.00, 490.00, 
   '{"basic_listing": true, "menu_manager": true, "max_products": 50, "analytics": "basic", "customer_reviews": true}'::jsonb,
   '{"max_products": 50, "max_photos": 10, "max_deals": 3}'::jsonb, 1),
  ('Growth', 'growth', 149.00, 1490.00,
   '{"enhanced_listing": true, "menu_manager": true, "max_products": 200, "analytics": "advanced", "customer_reviews": true, "deal_manager": true, "map_priority": true}'::jsonb,
   '{"max_products": 200, "max_photos": 25, "max_deals": 10}'::jsonb, 2),
  ('Premium', 'premium', 299.00, 2990.00,
   '{"premium_listing": true, "menu_manager": true, "max_products": "unlimited", "analytics": "premium", "customer_reviews": true, "deal_manager": true, "map_priority": true, "homepage_featured": true, "priority_support": true}'::jsonb,
   '{"max_products": 999999, "max_photos": 50, "max_deals": 999}'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- Create vendor_subscriptions table
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing')),
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_vendor ON vendor_subscriptions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_status ON vendor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_period_end ON vendor_subscriptions(current_period_end);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES vendor_subscriptions(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  tax numeric DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'refunded', 'void')),
  stripe_invoice_id text UNIQUE,
  paid_at timestamptz,
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_method_id text UNIQUE NOT NULL,
  card_brand text,
  card_last4 text,
  exp_month integer CHECK (exp_month >= 1 AND exp_month <= 12),
  exp_year integer CHECK (exp_year >= 2024),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_vendor ON payment_methods(vendor_id);

-- Create placement_pricing table
CREATE TABLE IF NOT EXISTS placement_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type text NOT NULL UNIQUE CHECK (placement_type IN ('homepage_featured', 'category_featured', 'city_featured', 'map_featured', 'banner_ad', 'sponsored_deal')),
  name text NOT NULL,
  description text,
  price_per_day numeric CHECK (price_per_day >= 0),
  price_per_week numeric CHECK (price_per_week >= 0),
  price_per_month numeric CHECK (price_per_month >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert default placement pricing
INSERT INTO placement_pricing (placement_type, name, description, price_per_day, price_per_week, price_per_month) VALUES
  ('homepage_featured', 'Homepage Featured', 'Top placement on homepage', 99.00, 599.00, 1999.00),
  ('category_featured', 'Category Featured', 'Featured in category listings', 49.00, 299.00, 999.00),
  ('city_featured', 'City Featured', 'Featured in city search results', 69.00, 399.00, 1299.00),
  ('map_featured', 'Map Featured Pin', 'Priority pin on map view', 39.00, 199.00, 699.00),
  ('banner_ad', 'Banner Advertisement', 'Banner ad placement', 149.00, 799.00, 2499.00),
  ('sponsored_deal', 'Sponsored Deal', 'Highlight deal across platform', 29.00, 149.00, 499.00)
ON CONFLICT (placement_type) DO NOTHING;

-- Create revenue_events table
CREATE TABLE IF NOT EXISTS revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  revenue_type text NOT NULL CHECK (revenue_type IN ('subscription', 'placement', 'ad', 'feature', 'upgrade')),
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_vendor ON revenue_events(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(revenue_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_date ON revenue_events(created_at DESC);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for vendor_subscriptions
CREATE POLICY "Vendors can view their own subscription"
  ON vendor_subscriptions FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update their own subscription"
  ON vendor_subscriptions FOR UPDATE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- RLS Policies for invoices
CREATE POLICY "Vendors can view their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- RLS Policies for payment_methods
CREATE POLICY "Vendors can manage their own payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- RLS Policies for placement_pricing
CREATE POLICY "Anyone can view active placement pricing"
  ON placement_pricing FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for revenue_events
CREATE POLICY "Vendors can view their own revenue events"
  ON revenue_events FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('invoice_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_subscriptions_updated_at ON vendor_subscriptions;
CREATE TRIGGER update_vendor_subscriptions_updated_at
  BEFORE UPDATE ON vendor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
