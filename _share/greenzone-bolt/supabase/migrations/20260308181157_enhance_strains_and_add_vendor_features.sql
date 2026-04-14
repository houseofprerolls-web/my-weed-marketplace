/*
  # Enhance Strains and Add Vendor Marketplace Features

  ## 1. Enhance Strains Table
    - Add best_time, popularity_score, is_trending, updated_at

  ## 2. New Tables
    - `vendor_hours` - Daily operating hours
    - `vendor_service_areas` - Delivery zones

  ## 3. Enhancements to vendor_profiles
    - Add marketplace columns

  ## 4. Link products to strains

  ## 5. Helper Functions and Triggers
*/

-- Add missing columns to strains table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'best_time'
  ) THEN
    ALTER TABLE strains ADD COLUMN best_time text DEFAULT 'anytime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'popularity_score'
  ) THEN
    ALTER TABLE strains ADD COLUMN popularity_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'is_trending'
  ) THEN
    ALTER TABLE strains ADD COLUMN is_trending boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE strains ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create vendor hours table
CREATE TABLE IF NOT EXISTS vendor_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, day_of_week)
);

-- Create vendor service areas table
CREATE TABLE IF NOT EXISTS vendor_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  zip_code text,
  delivery_fee numeric DEFAULT 0,
  delivery_time_min integer DEFAULT 30,
  delivery_time_max integer DEFAULT 60,
  minimum_order numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add marketplace columns to vendor_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'total_products'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN total_products integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'active_deals_count'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN active_deals_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'featured_until'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN featured_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'promoted_until'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN promoted_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'minimum_order'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN minimum_order numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'average_delivery_time'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN average_delivery_time integer DEFAULT 45;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'delivery_fee'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN delivery_fee numeric DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN average_rating numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'offers_delivery'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN offers_delivery boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_profiles' AND column_name = 'offers_pickup'
  ) THEN
    ALTER TABLE vendor_profiles ADD COLUMN offers_pickup boolean DEFAULT true;
  END IF;
END $$;

-- Add strain linking to vendor_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_products' AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE vendor_products ADD COLUMN strain_id uuid REFERENCES strains(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_strains_type ON strains(type);
CREATE INDEX IF NOT EXISTS idx_strains_slug ON strains(slug);
CREATE INDEX IF NOT EXISTS idx_strains_popularity ON strains(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_hours_vendor ON vendor_hours(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_service_areas_vendor ON vendor_service_areas(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_service_areas_city ON vendor_service_areas(city);
CREATE INDEX IF NOT EXISTS idx_vendor_products_strain ON vendor_products(strain_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_rating ON vendor_profiles(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_city ON vendor_profiles(city);

-- Enable RLS
ALTER TABLE vendor_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_service_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_hours
CREATE POLICY "Anyone can view vendor hours"
  ON vendor_hours FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can manage their hours"
  ON vendor_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = vendor_hours.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for vendor_service_areas
CREATE POLICY "Anyone can view vendor service areas"
  ON vendor_service_areas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can manage their service areas"
  ON vendor_service_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = vendor_service_areas.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  );

-- Function to check if vendor is open now
CREATE OR REPLACE FUNCTION is_vendor_open_now(vendor_uuid uuid)
RETURNS boolean AS $$
DECLARE
  curr_day integer;
  curr_time time;
  vendor_open boolean;
BEGIN
  curr_day := EXTRACT(DOW FROM now());
  curr_time := now()::time;
  
  SELECT 
    CASE 
      WHEN is_closed THEN false
      WHEN open_time IS NULL OR close_time IS NULL THEN false
      WHEN close_time > open_time THEN 
        curr_time >= open_time AND curr_time <= close_time
      ELSE 
        curr_time >= open_time OR curr_time <= close_time
    END INTO vendor_open
  FROM vendor_hours
  WHERE vendor_id = vendor_uuid
  AND day_of_week = curr_day;
  
  RETURN COALESCE(vendor_open, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update vendor product counts
CREATE OR REPLACE FUNCTION update_vendor_product_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE vendor_profiles 
    SET total_products = (
      SELECT COUNT(*) 
      FROM vendor_products 
      WHERE vendor_id = OLD.vendor_id 
      AND stock_status != 'out_of_stock'
    )
    WHERE id = OLD.vendor_id;
    RETURN OLD;
  ELSE
    UPDATE vendor_profiles 
    SET total_products = (
      SELECT COUNT(*) 
      FROM vendor_products 
      WHERE vendor_id = NEW.vendor_id 
      AND stock_status != 'out_of_stock'
    )
    WHERE id = NEW.vendor_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product count
DROP TRIGGER IF EXISTS update_vendor_product_count_trigger ON vendor_products;
CREATE TRIGGER update_vendor_product_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendor_products
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_product_count();

-- Function to update vendor active deals count
CREATE OR REPLACE FUNCTION update_vendor_deals_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE vendor_profiles 
    SET active_deals_count = (
      SELECT COUNT(*) 
      FROM product_deals 
      WHERE vendor_id = OLD.vendor_id 
      AND is_active = true
      AND (end_time IS NULL OR end_time > now())
    )
    WHERE id = OLD.vendor_id;
    RETURN OLD;
  ELSE
    UPDATE vendor_profiles 
    SET active_deals_count = (
      SELECT COUNT(*) 
      FROM product_deals 
      WHERE vendor_id = NEW.vendor_id 
      AND is_active = true
      AND (end_time IS NULL OR end_time > now())
    )
    WHERE id = NEW.vendor_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deals count
DROP TRIGGER IF EXISTS update_vendor_deals_count_trigger ON product_deals;
CREATE TRIGGER update_vendor_deals_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON product_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_deals_count();