/*
  # GreenFinder Cannabis Delivery Directory Schema

  ## Overview
  Complete database schema for a cannabis delivery directory platform that connects users
  with multiple licensed delivery services.

  ## New Tables

  ### 1. `profiles`
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `phone` (text)
  - `city` (text)
  - `zip_code` (text)
  - `id_verified` (boolean) - for age verification
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `delivery_services`
  - `id` (uuid, primary key)
  - `owner_id` (uuid, references profiles)
  - `name` (text) - business name
  - `slug` (text, unique) - URL-friendly name
  - `logo_url` (text)
  - `banner_url` (text)
  - `description` (text)
  - `phone` (text)
  - `email` (text)
  - `license_number` (text)
  - `min_order` (numeric) - minimum order amount
  - `delivery_fee` (numeric)
  - `average_delivery_time` (integer) - in minutes
  - `rating` (numeric) - calculated average
  - `total_reviews` (integer)
  - `is_active` (boolean)
  - `is_featured` (boolean) - for paid promotion
  - `approved_at` (timestamptz) - admin approval
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `delivery_zones`
  - `id` (uuid, primary key)
  - `service_id` (uuid, references delivery_services)
  - `city` (text)
  - `zip_codes` (text[]) - array of zip codes
  - `is_active` (boolean)

  ### 4. `product_categories`
  - `id` (uuid, primary key)
  - `name` (text) - Flower, Edibles, Vapes, etc.
  - `slug` (text, unique)
  - `icon` (text) - icon name
  - `sort_order` (integer)

  ### 5. `products`
  - `id` (uuid, primary key)
  - `service_id` (uuid, references delivery_services)
  - `category_id` (uuid, references product_categories)
  - `name` (text)
  - `slug` (text)
  - `description` (text)
  - `image_url` (text)
  - `price` (numeric)
  - `sale_price` (numeric, nullable)
  - `thc_percentage` (numeric, nullable)
  - `cbd_percentage` (numeric, nullable)
  - `weight` (text) - e.g., "3.5g", "100mg"
  - `strain_type` (text) - Indica, Sativa, Hybrid
  - `in_stock` (boolean)
  - `is_featured` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `orders`
  - `id` (uuid, primary key)
  - `order_number` (text, unique)
  - `user_id` (uuid, references profiles)
  - `service_id` (uuid, references delivery_services)
  - `status` (text) - pending, confirmed, preparing, out_for_delivery, delivered, cancelled
  - `subtotal` (numeric)
  - `delivery_fee` (numeric)
  - `tax` (numeric)
  - `total` (numeric)
  - `delivery_address` (text)
  - `delivery_city` (text)
  - `delivery_zip` (text)
  - `phone` (text)
  - `notes` (text)
  - `stripe_payment_id` (text)
  - `estimated_delivery` (timestamptz)
  - `delivered_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `order_items`
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `product_id` (uuid, references products)
  - `quantity` (integer)
  - `price` (numeric) - price at time of order
  - `created_at` (timestamptz)

  ### 8. `reviews`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `service_id` (uuid, references delivery_services)
  - `order_id` (uuid, references orders)
  - `rating` (integer) - 1-5 stars
  - `comment` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 9. `favorites`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `service_id` (uuid, references delivery_services)
  - `created_at` (timestamptz)

  ### 10. `cities`
  - `id` (uuid, primary key)
  - `name` (text)
  - `slug` (text, unique)
  - `state` (text)
  - `service_count` (integer)
  - `meta_title` (text)
  - `meta_description` (text)
  - `created_at` (timestamptz)

  ### 11. `deals`
  - `id` (uuid, primary key)
  - `service_id` (uuid, references delivery_services)
  - `title` (text)
  - `description` (text)
  - `discount_type` (text) - percentage, fixed_amount
  - `discount_value` (numeric)
  - `code` (text)
  - `valid_from` (timestamptz)
  - `valid_until` (timestamptz)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
  - Restrict admin operations
  - Protect sensitive business data
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  city text,
  zip_code text,
  id_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Delivery Services table
CREATE TABLE IF NOT EXISTS delivery_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  banner_url text,
  description text,
  phone text,
  email text,
  license_number text,
  min_order numeric DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  average_delivery_time integer DEFAULT 60,
  rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active approved services"
  ON delivery_services FOR SELECT
  USING (is_active = true AND approved_at IS NOT NULL);

CREATE POLICY "Service owners can view their own services"
  ON delivery_services FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Service owners can update their own services"
  ON delivery_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create services"
  ON delivery_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Delivery Zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES delivery_services(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  zip_codes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active delivery zones"
  ON delivery_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service owners can manage their zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

-- Product Categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product categories"
  ON product_categories FOR SELECT
  TO public
  USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES delivery_services(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES product_categories(id) NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  price numeric NOT NULL,
  sale_price numeric,
  thc_percentage numeric,
  cbd_percentage numeric,
  weight text,
  strain_type text,
  in_stock boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products from active services"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.is_active = true
      AND delivery_services.approved_at IS NOT NULL
    )
  );

CREATE POLICY "Service owners can manage their products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES delivery_services(id) NOT NULL,
  status text DEFAULT 'pending',
  subtotal numeric NOT NULL,
  delivery_fee numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric NOT NULL,
  delivery_address text NOT NULL,
  delivery_city text NOT NULL,
  delivery_zip text NOT NULL,
  phone text NOT NULL,
  notes text,
  stripe_payment_id text,
  estimated_delivery timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service owners can view orders for their service"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service owners can update their service orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service owners can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN delivery_services ON delivery_services.id = orders.service_id
      WHERE orders.id = order_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES delivery_services(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, order_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create reviews for their orders"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
      AND orders.status = 'delivered'
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES delivery_services(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites"
  ON favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cities table (for SEO landing pages)
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  state text NOT NULL,
  service_count integer DEFAULT 0,
  meta_title text,
  meta_description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cities"
  ON cities FOR SELECT
  TO public
  USING (true);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES delivery_services(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  code text,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active deals"
  ON deals FOR SELECT
  USING (is_active = true AND now() >= valid_from AND (valid_until IS NULL OR now() <= valid_until));

CREATE POLICY "Service owners can manage their deals"
  ON deals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_services
      WHERE delivery_services.id = service_id
      AND delivery_services.owner_id = auth.uid()
    )
  );

-- Insert default product categories
INSERT INTO product_categories (name, slug, icon, sort_order) VALUES
  ('Flower', 'flower', 'Flower', 1),
  ('Edibles', 'edibles', 'Cookie', 2),
  ('Vapes', 'vapes', 'Cigarette', 3),
  ('Pre-Rolls', 'pre-rolls', 'Sparkles', 4),
  ('Concentrates', 'concentrates', 'Droplet', 5),
  ('CBD', 'cbd', 'Leaf', 6)
ON CONFLICT (slug) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_services_slug ON delivery_services(slug);
CREATE INDEX IF NOT EXISTS idx_delivery_services_active ON delivery_services(is_active, approved_at);
CREATE INDEX IF NOT EXISTS idx_products_service_id ON products(service_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_city ON delivery_zones(city);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
