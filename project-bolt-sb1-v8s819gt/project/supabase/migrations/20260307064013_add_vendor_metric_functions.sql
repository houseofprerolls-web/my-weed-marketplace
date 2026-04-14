/*
  # Add Vendor Metric Functions
  
  1. Functions
    - `increment_vendor_metric` - Safely increment vendor profile metrics
  
  2. Purpose
    - Allow atomic increments of vendor tracking metrics
    - Track listing views, clicks, phone calls, directions, etc.
*/

-- Function to increment vendor metrics
CREATE OR REPLACE FUNCTION increment_vendor_metric(
  vendor_id uuid,
  metric_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE vendor_profiles SET %I = %I + 1 WHERE id = $1',
    metric_name, metric_name
  ) USING vendor_id;
END;
$$;
