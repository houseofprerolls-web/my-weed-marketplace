/*
  # Complete Customer Checkout and Order System

  ## Overview
  Adds ID verification, proper customer checkout, order management, and trust systems.
  Customers must upload ID before placing orders. No automated verification.
  
  ## Changes

  ### 1. Extend orders table
  - Add customer_name, apartment, delivery_notes, preferred_delivery_time
  - Vendor reference instead of service
  - Better order statuses

  ### 2. Create order_documents table
  - Securely store uploaded ID documents
  - Link to orders
  - Document type tracking
  - Upload timestamps

  ### 3. Create cart_items table
  - Persistent shopping cart
  - Link to vendor products

  ### 4. Create order_status_history table
  - Track all status changes
  - Audit trail

  ## Security
  - ID documents visible only to customer, vendor, and admins
  - Proper RLS on all tables
  - Secure file storage
*/

-- First, check if we need to add columns to orders table
DO $$
BEGIN
  -- Add customer_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_name text NOT NULL DEFAULT '';
  END IF;

  -- Add apartment_unit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'apartment_unit'
  ) THEN
    ALTER TABLE orders ADD COLUMN apartment_unit text;
  END IF;

  -- Add delivery_notes if notes doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_notes'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'notes'
    ) THEN
      ALTER TABLE orders RENAME COLUMN notes TO delivery_notes;
    ELSE
      ALTER TABLE orders ADD COLUMN delivery_notes text;
    END IF;
  END IF;

  -- Add preferred_delivery_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'preferred_delivery_time'
  ) THEN
    ALTER TABLE orders ADD COLUMN preferred_delivery_time timestamptz;
  END IF;

  -- Add vendor_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Update status column to have better values
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'received', 'preparing', 'out_for_delivery', 'completed', 'canceled'));
END $$;

-- Create order_documents table for ID uploads
CREATE TABLE IF NOT EXISTS order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('government_id', 'passport', 'photo_id')),
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  verified_status text DEFAULT 'not_verified' CHECK (verified_status IN ('not_verified', 'pending_review', 'verified', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_documents_order ON order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_uploaded_by ON order_documents(uploaded_by);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendor_profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES vendor_products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add numeric NOT NULL CHECK (price_at_add >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_vendor ON cart_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);

-- Enable RLS
ALTER TABLE order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_documents

-- Customers can view their own order documents
CREATE POLICY "Customers can view own order documents"
  ON order_documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Customers can insert documents for their own orders
CREATE POLICY "Customers can upload documents for own orders"
  ON order_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Vendors can view documents for their orders
CREATE POLICY "Vendors can view documents for their orders"
  ON order_documents FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN vendor_profiles vp ON (o.vendor_id = vp.id OR o.service_id::text = vp.id::text)
      WHERE vp.user_id = auth.uid()
    )
  );

-- Admins can view all documents
CREATE POLICY "Admins can view all order documents"
  ON order_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for cart_items

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for order_status_history

-- Users can view status history for their own orders
CREATE POLICY "Users can view own order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Vendors can view status history for their orders
CREATE POLICY "Vendors can view order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN vendor_profiles vp ON (o.vendor_id = vp.id OR o.service_id::text = vp.id::text)
      WHERE vp.user_id = auth.uid()
    )
  );

-- Vendors can insert status changes
CREATE POLICY "Vendors can update order status"
  ON order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN vendor_profiles vp ON (o.vendor_id = vp.id OR o.service_id::text = vp.id::text)
      WHERE vp.user_id = auth.uid()
    )
  );

-- Admins can view all history
CREATE POLICY "Admins can view all order history"
  ON order_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create status history entry when order status changes
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_status_history();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  prefix TEXT := 'GZ';
  date_part TEXT;
  sequence_part TEXT;
  count_today INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) INTO count_today
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  sequence_part := LPAD((count_today + 1)::TEXT, 4, '0');
  new_number := prefix || date_part || sequence_part;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
