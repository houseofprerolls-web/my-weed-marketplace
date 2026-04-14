/*
  # Add Social Media Features to GreenFinder

  ## Overview
  Transform GreenFinder into a social platform with Instagram/TikTok style features
  for cannabis enthusiasts to share experiences, reviews, and connect.

  ## New Tables

  ### 1. `user_profiles`
  - `id` (uuid, references profiles)
  - `username` (text, unique)
  - `bio` (text)
  - `avatar_url` (text)
  - `cover_photo_url` (text)
  - `followers_count` (integer)
  - `following_count` (integer)
  - `posts_count` (integer)
  - `is_verified` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `posts`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `product_id` (uuid, references products, nullable)
  - `service_id` (uuid, references delivery_services, nullable)
  - `caption` (text)
  - `media_urls` (text[]) - array of image/video URLs
  - `media_type` (text) - image, video, carousel
  - `likes_count` (integer)
  - `comments_count` (integer)
  - `shares_count` (integer)
  - `is_featured` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `post_likes`
  - `id` (uuid, primary key)
  - `post_id` (uuid, references posts)
  - `user_id` (uuid, references profiles)
  - `created_at` (timestamptz)
  - UNIQUE(post_id, user_id)

  ### 4. `post_comments`
  - `id` (uuid, primary key)
  - `post_id` (uuid, references posts)
  - `user_id` (uuid, references profiles)
  - `comment` (text)
  - `likes_count` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `follows`
  - `id` (uuid, primary key)
  - `follower_id` (uuid, references profiles)
  - `following_id` (uuid, references profiles)
  - `created_at` (timestamptz)
  - UNIQUE(follower_id, following_id)

  ### 6. `product_reviews_enhanced`
  - Enhanced version of reviews with photos and social features
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `product_id` (uuid, references products)
  - `service_id` (uuid, references delivery_services)
  - `rating` (integer)
  - `title` (text)
  - `review_text` (text)
  - `photo_urls` (text[])
  - `effects` (text[]) - relaxed, energetic, focused, etc.
  - `helpful_count` (integer)
  - `verified_purchase` (boolean)
  - `created_at` (timestamptz)

  ### 7. `strains`
  - `id` (uuid, primary key)
  - `name` (text)
  - `slug` (text, unique)
  - `type` (text) - Indica, Sativa, Hybrid
  - `thc_min` (numeric)
  - `thc_max` (numeric)
  - `cbd_min` (numeric)
  - `cbd_max` (numeric)
  - `description` (text)
  - `effects` (text[])
  - `flavors` (text[])
  - `image_url` (text)
  - `rating` (numeric)
  - `review_count` (integer)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only modify their own content
  - Public can view posts and profiles
*/

-- User Profiles Extension
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  bio text,
  avatar_url text,
  cover_photo_url text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  service_id uuid REFERENCES delivery_services(id) ON DELETE SET NULL,
  caption text,
  media_urls text[] DEFAULT '{}',
  media_type text DEFAULT 'image',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes"
  ON post_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON post_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Follows Table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Enhanced Product Reviews
CREATE TABLE IF NOT EXISTS product_reviews_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES delivery_services(id) NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  review_text text,
  photo_urls text[] DEFAULT '{}',
  effects text[] DEFAULT '{}',
  helpful_count integer DEFAULT 0,
  verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_reviews_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enhanced reviews"
  ON product_reviews_enhanced FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create enhanced reviews"
  ON product_reviews_enhanced FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enhanced reviews"
  ON product_reviews_enhanced FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Strains Database
CREATE TABLE IF NOT EXISTS strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL,
  thc_min numeric DEFAULT 0,
  thc_max numeric DEFAULT 0,
  cbd_min numeric DEFAULT 0,
  cbd_max numeric DEFAULT 0,
  description text,
  effects text[] DEFAULT '{}',
  flavors text[] DEFAULT '{}',
  image_url text,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view strains"
  ON strains FOR SELECT
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_enhanced_product_id ON product_reviews_enhanced(product_id);
CREATE INDEX IF NOT EXISTS idx_strains_slug ON strains(slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Insert sample strains
INSERT INTO strains (name, slug, type, thc_min, thc_max, cbd_min, cbd_max, description, effects, flavors) VALUES
  ('Blue Dream', 'blue-dream', 'Hybrid', 17, 24, 0, 2, 'A sativa-dominant hybrid originating in California, Blue Dream delivers swift symptom relief without heavy sedative effects.', ARRAY['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative'], ARRAY['Blueberry', 'Sweet', 'Berry']),
  ('OG Kush', 'og-kush', 'Hybrid', 20, 25, 0, 1, 'With a mix of fuel, skunk, and spice, OG Kush is a classic strain with powerful stress relief.', ARRAY['Relaxed', 'Happy', 'Euphoric', 'Uplifted'], ARRAY['Earthy', 'Pine', 'Woody']),
  ('Girl Scout Cookies', 'girl-scout-cookies', 'Hybrid', 18, 28, 0, 1, 'GSC provides full-body relaxation with a cerebral, euphoric high.', ARRAY['Relaxed', 'Happy', 'Euphoric', 'Giggly'], ARRAY['Sweet', 'Earthy', 'Pungent']),
  ('Granddaddy Purple', 'granddaddy-purple', 'Indica', 17, 27, 0, 1, 'Granddaddy Purple is a famous indica cross that delivers heavy mind and body effects.', ARRAY['Relaxed', 'Sleepy', 'Happy', 'Euphoric'], ARRAY['Grape', 'Berry', 'Sweet']),
  ('Sour Diesel', 'sour-diesel', 'Sativa', 19, 25, 0, 2, 'Sour Diesel is a fast-acting strain that delivers energizing, dreamy cerebral effects.', ARRAY['Energetic', 'Uplifted', 'Creative', 'Focused'], ARRAY['Diesel', 'Pungent', 'Earthy'])
ON CONFLICT (slug) DO NOTHING;
