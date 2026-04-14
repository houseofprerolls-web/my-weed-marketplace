/*
  # Complete Vendor Billing System

  ## Enhancements
    - Add missing columns to existing tables
    - Create missing billing tables
    - Add billing notification system
    - Add payment retry logic
    - Seed default subscription plans
*/

-- Add description to subscription_plans if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'description'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'featured_listing'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN featured_listing boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'priority_placement'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN priority_placement boolean DEFAULT false;
  END IF;
END $$;

-- Create billing notifications table
CREATE TABLE IF NOT EXISTS billing_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('renewal_upcoming', 'renewal_success', 'renewal_failed', 'card_expiring', 'payment_retry', 'subscription_canceled', 'payment_failed')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_invoice_id uuid,
  related_subscription_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create payment_attempts table for retry logic
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  payment_method_id uuid,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  failure_code text,
  failure_message text,
  attempted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_billing_notifications_vendor ON billing_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_unread ON billing_notifications(vendor_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice ON payment_attempts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_vendor ON payment_attempts(vendor_id);

-- Enable RLS
ALTER TABLE billing_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_notifications
CREATE POLICY "Vendors can view own billing notifications"
  ON billing_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = billing_notifications.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own billing notifications"
  ON billing_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = billing_notifications.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = billing_notifications.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for payment_attempts
CREATE POLICY "Vendors can view own payment attempts"
  ON payment_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE vendor_profiles.id = payment_attempts.vendor_id
      AND vendor_profiles.user_id = auth.uid()
    )
  );

-- Function to check for expiring cards
CREATE OR REPLACE FUNCTION check_expiring_cards()
RETURNS void AS $$
DECLARE
  card_record RECORD;
  curr_month integer;
  curr_year integer;
BEGIN
  curr_month := EXTRACT(MONTH FROM now());
  curr_year := EXTRACT(YEAR FROM now());
  
  FOR card_record IN
    SELECT pm.*, vp.user_id
    FROM payment_methods pm
    JOIN vendor_profiles vp ON vp.id = pm.vendor_id
    WHERE pm.is_default = true
    AND pm.card_exp_year IS NOT NULL
    AND pm.card_exp_month IS NOT NULL
    AND (
      (pm.card_exp_year = curr_year AND pm.card_exp_month <= curr_month + 2)
      OR (pm.card_exp_year = curr_year + 1 AND curr_month >= 11)
    )
    AND NOT EXISTS (
      SELECT 1 FROM billing_notifications
      WHERE vendor_id = pm.vendor_id
      AND type = 'card_expiring'
      AND created_at > now() - interval '30 days'
    )
  LOOP
    INSERT INTO billing_notifications (vendor_id, type, title, message)
    VALUES (
      card_record.vendor_id,
      'card_expiring',
      'Payment Card Expiring Soon',
      'Your payment card ending in ' || card_record.card_last4 || ' expires on ' || 
      card_record.card_exp_month || '/' || card_record.card_exp_year || 
      '. Please update your payment method to avoid billing interruption.'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Seed default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_annual, features, limits, featured_listing, priority_placement, sort_order)
VALUES
  (
    'Basic',
    'basic',
    'Perfect for small dispensaries getting started',
    0,
    0,
    '["Basic listing", "Standard support"]',
    '{"max_products": 50, "max_photos": 5}',
    false,
    false,
    1
  ),
  (
    'Featured',
    'featured',
    'Increase visibility with featured placement',
    99,
    990,
    '["Featured listing", "Priority support", "Analytics dashboard", "Deal promotions"]',
    '{"max_products": 200, "max_photos": 15}',
    true,
    false,
    2
  ),
  (
    'Premium',
    'premium',
    'Maximum visibility and premium features',
    199,
    1990,
    '["Premium featured listing", "Priority support", "Advanced analytics", "Social media boost", "Homepage placement"]',
    '{"max_products": null, "max_photos": null}',
    true,
    true,
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  featured_listing = EXCLUDED.featured_listing,
  priority_placement = EXCLUDED.priority_placement;