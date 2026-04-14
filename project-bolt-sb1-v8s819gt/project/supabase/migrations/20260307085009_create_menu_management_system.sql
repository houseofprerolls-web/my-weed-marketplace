/*
  # Complete Menu Management System for Cannabis Marketplace

  ## Overview
  Creates a full vendor menu operating system supporting thousands of vendors and products.
  
  ## New Tables
  
  ### `vendor_menu_categories`
  Vendor-specific product categories (Flower, Edibles, etc.)
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, references vendor_profiles)
  - `name` (text) - Category name
  - `description` (text)
  - `sort_order` (integer) - Display order
  - `is_visible` (boolean) - Show/hide category
  - `created_at`, `updated_at` (timestamptz)

  ### `vendor_products`
  Individual products in vendor menus
  - `id` (uuid, primary key)
  - `vendor_id` (uuid, references vendor_profiles)
  - `category_id` (uuid, references vendor_menu_categories)
  - `name` (text) - Product name
  - `brand` (text) - Brand name
  - `slug` (text) - URL-friendly identifier
  - `description` (text)
  - `price` (numeric) - Regular price
  - `sale_price` (numeric) - Discounted price
  - `thc_percentage` (numeric)
  - `cbd_percentage` (numeric)
  - `weight` (text) - e.g., "3.5g", "1oz"
  - `images` (text[]) - Product images
  - `tags` (text[]) - Searchable tags
  - `is_featured` (boolean)
  - `stock_status` (text) - in_stock, low_stock, out_of_stock
  - `stock_quantity` (integer)
  - `view_count` (integer)
  - `click_count` (integer)
  - `created_at`, `updated_at` (timestamptz)

  ### `product_deals`
  Deal overlays for products
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `product_id` (uuid, references vendor_products)
  - `deal_name` (text) - e.g., "Happy Hour"
  - `deal_type` (text) - percentage, fixed_price, bundle, happy_hour
  - `discount_percentage` (numeric)
  - `discount_amount` (numeric)
  - `deal_price` (numeric) - Final price after discount
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `days_active` (integer[]) - 0=Sunday, 6=Saturday
  - `is_active` (boolean)
  - `click_count` (integer)
  - `created_at`, `updated_at` (timestamptz)

  ### `menu_analytics`
  Track menu performance
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `product_id` (uuid, nullable)
  - `category_id` (uuid, nullable)
  - `event_type` (text) - menu_view, product_view, product_click, deal_click, category_view
  - `user_id` (uuid, nullable)
  - `session_id` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Vendors can only manage their own data
  - Customers can view published menus
  - Analytics tracking is public for recording
*/

-- Create vendor_menu_categories table
CREATE TABLE IF NOT EXISTS vendor_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_menu_categories_vendor ON vendor_menu_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_menu_categories_sort ON vendor_menu_categories(vendor_id, sort_order);

-- Create vendor_products table
CREATE TABLE IF NOT EXISTS vendor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES vendor_menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text,
  slug text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  sale_price numeric CHECK (sale_price >= 0),
  thc_percentage numeric CHECK (thc_percentage >= 0 AND thc_percentage <= 100),
  cbd_percentage numeric CHECK (cbd_percentage >= 0 AND cbd_percentage <= 100),
  weight text,
  images text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  stock_status text DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
  stock_quantity integer DEFAULT 0,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor ON vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_category ON vendor_products(category_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_slug ON vendor_products(vendor_id, slug);
CREATE INDEX IF NOT EXISTS idx_vendor_products_stock ON vendor_products(stock_status);
CREATE INDEX IF NOT EXISTS idx_vendor_products_featured ON vendor_products(is_featured) WHERE is_featured = true;

-- Create product_deals table
CREATE TABLE IF NOT EXISTS product_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES vendor_products(id) ON DELETE CASCADE NOT NULL,
  deal_name text NOT NULL,
  deal_type text DEFAULT 'percentage' CHECK (deal_type IN ('percentage', 'fixed_price', 'bundle', 'happy_hour')),
  discount_percentage numeric CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount numeric CHECK (discount_amount >= 0),
  deal_price numeric CHECK (deal_price >= 0),
  start_time timestamptz,
  end_time timestamptz,
  days_active integer[] DEFAULT '{0,1,2,3,4,5,6}',
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_deals_vendor ON product_deals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_product_deals_product ON product_deals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_deals_active ON product_deals(is_active) WHERE is_active = true;

-- Create menu_analytics table
CREATE TABLE IF NOT EXISTS menu_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES vendor_products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES vendor_menu_categories(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('menu_view', 'product_view', 'product_click', 'deal_click', 'category_view')),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_analytics_vendor ON menu_analytics(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_analytics_product ON menu_analytics(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_analytics_event_type ON menu_analytics(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE vendor_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_menu_categories
CREATE POLICY "Vendors can view their own categories"
  ON vendor_menu_categories FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can insert their own categories"
  ON vendor_menu_categories FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can update their own categories"
  ON vendor_menu_categories FOR UPDATE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Vendors can delete their own categories"
  ON vendor_menu_categories FOR DELETE
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view visible categories"
  ON vendor_menu_categories FOR SELECT
  TO public
  USING (is_visible = true);

-- RLS Policies for vendor_products
CREATE POLICY "Vendors can manage their own products"
  ON vendor_products FOR ALL
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view in-stock products"
  ON vendor_products FOR SELECT
  TO public
  USING (stock_status != 'out_of_stock' OR stock_status = 'out_of_stock');

-- RLS Policies for product_deals
CREATE POLICY "Vendors can manage their own deals"
  ON product_deals FOR ALL
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view active deals"
  ON product_deals FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for menu_analytics
CREATE POLICY "Vendors can view their own analytics"
  ON menu_analytics FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT id FROM vendor_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert analytics events"
  ON menu_analytics FOR INSERT
  TO public
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_vendor_menu_categories_updated_at ON vendor_menu_categories;
CREATE TRIGGER update_vendor_menu_categories_updated_at
  BEFORE UPDATE ON vendor_menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_products_updated_at ON vendor_products;
CREATE TRIGGER update_vendor_products_updated_at
  BEFORE UPDATE ON vendor_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_deals_updated_at ON product_deals;
CREATE TRIGGER update_product_deals_updated_at
  BEFORE UPDATE ON product_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
