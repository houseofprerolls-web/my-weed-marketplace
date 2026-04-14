/*
  # Create Missing Operational Tables

  ## Overview
  Creates essential tables for internal operations, customer trust, incident management,
  and employee workflow that are missing from the platform.

  ## New Tables

  ### 1. `incident_reports`
  Track customer and vendor incidents requiring investigation
  - `id` (uuid, primary key)
  - `incident_type` (text) - delivery_issue, quality_complaint, fraud, harassment, other
  - `reported_by` (uuid) - User who reported
  - `reported_against_type` (text) - customer, vendor
  - `reported_against_id` (uuid) - ID of reported entity
  - `order_id` (uuid, optional) - Related order
  - `severity` (text) - low, medium, high, critical
  - `status` (text) - new, investigating, resolved, closed
  - `title` (text)
  - `description` (text)
  - `resolution` (text)
  - `assigned_to` (uuid) - Admin assigned
  - `resolved_at` (timestamptz)
  - `created_at`, `updated_at`

  ### 2. `incident_files`
  File attachments for incidents (photos, screenshots, documents)
  - `id` (uuid, primary key)
  - `incident_id` (uuid)
  - `file_url` (text)
  - `file_type` (text)
  - `file_size` (integer)
  - `uploaded_by` (uuid)
  - `created_at`

  ### 3. `customer_risk_profiles`
  Risk assessment and trust scores for customers
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Customer user
  - `risk_score` (integer) - 0-100
  - `trust_level` (text) - new, trusted, verified, flagged, blocked
  - `total_orders` (integer)
  - `successful_orders` (integer)
  - `failed_orders` (integer)
  - `dispute_count` (integer)
  - `chargeback_count` (integer)
  - `id_verified` (boolean)
  - `phone_verified` (boolean)
  - `email_verified` (boolean)
  - `last_order_date` (timestamptz)
  - `flags` (text[]) - Array of flags
  - `notes` (text)
  - `created_at`, `updated_at`

  ### 4. `customer_trust_actions`
  Log of actions affecting customer trust score
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `action_type` (text) - order_completed, id_verified, dispute_filed, etc
  - `score_change` (integer) - Positive or negative
  - `reason` (text)
  - `performed_by` (uuid)
  - `created_at`

  ### 5. `vendor_quality_scores`
  Vendor performance and quality metrics
  - `id` (uuid, primary key)
  - `vendor_id` (uuid)
  - `quality_score` (integer) - 0-100
  - `response_time_avg` (integer) - Minutes
  - `on_time_delivery_rate` (numeric) - Percentage
  - `order_accuracy_rate` (numeric) - Percentage
  - `customer_satisfaction` (numeric) - Average rating
  - `total_orders` (integer)
  - `completed_orders` (integer)
  - `canceled_orders` (integer)
  - `dispute_count` (integer)
  - `violation_count` (integer)
  - `last_violation_date` (timestamptz)
  - `notes` (text)
  - `created_at`, `updated_at`

  ### 6. `employee_tasks`
  Internal task management for admins and employees
  - `id` (uuid, primary key)
  - `title` (text)
  - `description` (text)
  - `task_type` (text) - vendor_review, license_verification, incident_investigation, content_moderation, other
  - `priority` (text) - low, medium, high, urgent
  - `status` (text) - todo, in_progress, completed, canceled
  - `assigned_to` (uuid)
  - `created_by` (uuid)
  - `related_type` (text) - vendor, order, incident, report
  - `related_id` (uuid)
  - `due_date` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at`, `updated_at`

  ### 7. `email_logs`
  Track all emails sent from platform
  - `id` (uuid, primary key)
  - `recipient_email` (text)
  - `recipient_id` (uuid)
  - `email_type` (text) - welcome, order_confirmation, vendor_approval, etc
  - `subject` (text)
  - `status` (text) - sent, failed, bounced
  - `error_message` (text)
  - `sent_at` (timestamptz)
  - `opened_at` (timestamptz)
  - `clicked_at` (timestamptz)
  - `metadata` (jsonb)
  - `created_at`

  ### 8. `notification_preferences`
  User notification settings
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `email_enabled` (boolean)
  - `sms_enabled` (boolean)
  - `push_enabled` (boolean)
  - `order_updates` (boolean)
  - `deal_alerts` (boolean)
  - `new_reviews` (boolean)
  - `marketing` (boolean)
  - `created_at`, `updated_at`

  ### 9. `blocked_users`
  User blocking system
  - `id` (uuid, primary key)
  - `blocker_id` (uuid) - User who blocked
  - `blocked_id` (uuid) - User who is blocked
  - `reason` (text)
  - `created_at`

  ### 10. `promo_codes`
  Discount and promo code system
  - `id` (uuid, primary key)
  - `code` (text, unique)
  - `description` (text)
  - `discount_type` (text) - percentage, fixed_amount, free_delivery
  - `discount_value` (numeric)
  - `min_order_amount` (numeric)
  - `max_uses` (integer)
  - `used_count` (integer)
  - `vendor_id` (uuid, optional) - Vendor-specific code
  - `valid_from` (timestamptz)
  - `valid_until` (timestamptz)
  - `is_active` (boolean)
  - `created_at`, `updated_at`

  ### 11. `promo_code_uses`
  Track promo code usage
  - `id` (uuid, primary key)
  - `promo_code_id` (uuid)
  - `user_id` (uuid)
  - `order_id` (uuid)
  - `discount_applied` (numeric)
  - `created_at`

  ### 12. `referrals`
  Referral tracking system
  - `id` (uuid, primary key)
  - `referrer_id` (uuid) - User who referred
  - `referred_id` (uuid) - New user
  - `referral_code` (text)
  - `status` (text) - pending, completed, rewarded
  - `reward_amount` (numeric)
  - `completed_at` (timestamptz)
  - `created_at`

  ## Security
  - RLS enabled on all tables
  - Proper access controls for each user role
  - Admin-only access for sensitive data
*/

-- Create incident_reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL CHECK (incident_type IN ('delivery_issue', 'quality_complaint', 'fraud', 'harassment', 'policy_violation', 'other')),
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_against_type text NOT NULL CHECK (reported_against_type IN ('customer', 'vendor')),
  reported_against_id uuid NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'closed')),
  title text NOT NULL,
  description text NOT NULL,
  resolution text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incident_reports_assigned ON incident_reports(assigned_to);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incident reports"
  ON incident_reports FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "Users can create incident reports"
  ON incident_reports FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can manage all incidents"
  ON incident_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create incident_files table
CREATE TABLE IF NOT EXISTS incident_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incident_reports(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_files_incident ON incident_files(incident_id);

ALTER TABLE incident_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files for own incidents"
  ON incident_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incident_reports
      WHERE id = incident_id AND reported_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all incident files"
  ON incident_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can upload files to own incidents"
  ON incident_files FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Create customer_risk_profiles table
CREATE TABLE IF NOT EXISTS customer_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  risk_score integer DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  trust_level text DEFAULT 'new' CHECK (trust_level IN ('new', 'trusted', 'verified', 'flagged', 'blocked')),
  total_orders integer DEFAULT 0,
  successful_orders integer DEFAULT 0,
  failed_orders integer DEFAULT 0,
  dispute_count integer DEFAULT 0,
  chargeback_count integer DEFAULT 0,
  id_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  last_order_date timestamptz,
  flags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_risk_profiles_user ON customer_risk_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_risk_profiles_trust ON customer_risk_profiles(trust_level);

ALTER TABLE customer_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk profile"
  ON customer_risk_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all risk profiles"
  ON customer_risk_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage risk profiles"
  ON customer_risk_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create customer_trust_actions table
CREATE TABLE IF NOT EXISTS customer_trust_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  score_change integer DEFAULT 0,
  reason text,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_trust_actions_user ON customer_trust_actions(user_id, created_at DESC);

ALTER TABLE customer_trust_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all trust actions"
  ON customer_trust_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create trust actions"
  ON customer_trust_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create vendor_quality_scores table
CREATE TABLE IF NOT EXISTS vendor_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  quality_score integer DEFAULT 75 CHECK (quality_score >= 0 AND quality_score <= 100),
  response_time_avg integer DEFAULT 0,
  on_time_delivery_rate numeric DEFAULT 100 CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
  order_accuracy_rate numeric DEFAULT 100 CHECK (order_accuracy_rate >= 0 AND order_accuracy_rate <= 100),
  customer_satisfaction numeric DEFAULT 5 CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 5),
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  canceled_orders integer DEFAULT 0,
  dispute_count integer DEFAULT 0,
  violation_count integer DEFAULT 0,
  last_violation_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_quality_scores_vendor ON vendor_quality_scores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quality_scores_quality ON vendor_quality_scores(quality_score DESC);

ALTER TABLE vendor_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own quality score"
  ON vendor_quality_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all quality scores"
  ON vendor_quality_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage quality scores"
  ON vendor_quality_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create employee_tasks table
CREATE TABLE IF NOT EXISTS employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('vendor_review', 'license_verification', 'incident_investigation', 'content_moderation', 'placement_setup', 'other')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'canceled')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_type text CHECK (related_type IN ('vendor', 'order', 'incident', 'report', 'license')),
  related_id uuid,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_tasks_assigned ON employee_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_priority ON employee_tasks(priority);

ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all tasks"
  ON employee_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  order_updates boolean DEFAULT true,
  deal_alerts boolean DEFAULT true,
  new_reviews boolean DEFAULT true,
  marketing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocked users"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can manage own blocks"
  ON blocked_users FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_delivery')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  min_order_amount numeric DEFAULT 0 CHECK (min_order_amount >= 0),
  max_uses integer,
  used_count integer DEFAULT 0,
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_vendor ON promo_codes(vendor_id);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Vendors can manage own promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE id = vendor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create promo_code_uses table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  discount_applied numeric NOT NULL CHECK (discount_applied >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo ON promo_code_uses(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_order ON promo_code_uses(order_id);

ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo code uses"
  ON promo_code_uses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create promo code uses"
  ON promo_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_amount numeric DEFAULT 0 CHECK (reward_amount >= 0),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "System can create referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all referrals"
  ON referrals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
