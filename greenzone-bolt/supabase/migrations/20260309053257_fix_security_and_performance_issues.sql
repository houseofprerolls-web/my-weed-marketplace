/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses critical security and performance issues identified in the database audit:
  - Adds missing foreign key indexes for optimal query performance
  - Optimizes RLS policies to prevent per-row auth function evaluation
  - Improves overall database security and performance

  ## Changes

  ### 1. Foreign Key Indexes
  Added indexes for all unindexed foreign keys to improve join performance and query optimization.

  ### 2. RLS Policy Optimization
  Optimized all RLS policies to use (select auth.uid()) and (select auth.jwt()) instead of direct function calls,
  preventing per-row re-evaluation and significantly improving query performance at scale.

  ### 3. Security Enhancements
  All policies now use efficient authentication checks while maintaining the same security guarantees.
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Admin notes indexes
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON public.admin_notes(admin_id);

-- AI feedback indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_feedback(user_id);

-- AI usage logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_conversation_id ON public.ai_usage_logs(conversation_id);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);

-- Business licenses indexes
CREATE INDEX IF NOT EXISTS idx_business_licenses_vendor_id ON public.business_licenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_business_licenses_verified_by ON public.business_licenses(verified_by);

-- Click events indexes
CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON public.click_events(user_id);

-- Customer trust actions indexes
CREATE INDEX IF NOT EXISTS idx_customer_trust_actions_performed_by ON public.customer_trust_actions(performed_by);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_service_id ON public.deals(service_id);

-- Delivery services indexes
CREATE INDEX IF NOT EXISTS idx_delivery_services_owner_id ON public.delivery_services(owner_id);

-- Delivery zones indexes
CREATE INDEX IF NOT EXISTS idx_delivery_zones_service_id ON public.delivery_zones(service_id);

-- Employee tasks indexes
CREATE INDEX IF NOT EXISTS idx_employee_tasks_created_by ON public.employee_tasks(created_by);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_service_id ON public.favorites(service_id);

-- Incident files indexes
CREATE INDEX IF NOT EXISTS idx_incident_files_uploaded_by ON public.incident_files(uploaded_by);

-- Incident reports indexes
CREATE INDEX IF NOT EXISTS idx_incident_reports_order_id ON public.incident_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_reported_by ON public.incident_reports(reported_by);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);

-- Menu analytics indexes
CREATE INDEX IF NOT EXISTS idx_menu_analytics_category_id ON public.menu_analytics(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_analytics_user_id ON public.menu_analytics(user_id);

-- Moderation queue indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by ON public.moderation_queue(reviewed_by);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history(changed_by);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);

-- Post comments indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

-- Post likes indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_product_id ON public.posts(product_id);
CREATE INDEX IF NOT EXISTS idx_posts_service_id ON public.posts(service_id);

-- Product reviews enhanced indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_enhanced_service_id ON public.product_reviews_enhanced(service_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_enhanced_user_id ON public.product_reviews_enhanced(user_id);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);

-- Search logs indexes
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON public.user_roles(assigned_by);

-- Vendor categories indexes
CREATE INDEX IF NOT EXISTS idx_vendor_categories_category_id ON public.vendor_categories(category_id);

-- Vendor profiles indexes
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_approved_by ON public.vendor_profiles(approved_by);

-- Vendor subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_plan_id ON public.vendor_subscriptions(plan_id);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Drop and recreate optimized policies for admin_placement_campaigns
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON public.admin_placement_campaigns;
CREATE POLICY "Admins can manage all campaigns" ON public.admin_placement_campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Vendors can view their own campaigns" ON public.admin_placement_campaigns;
CREATE POLICY "Vendors can view their own campaigns" ON public.admin_placement_campaigns
  FOR SELECT TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

-- Optimize placement_performance_daily policies
DROP POLICY IF EXISTS "Admins can view all performance data" ON public.placement_performance_daily;
CREATE POLICY "Admins can view all performance data" ON public.placement_performance_daily
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Vendors can view their own performance" ON public.placement_performance_daily;
CREATE POLICY "Vendors can view their own performance" ON public.placement_performance_daily
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.admin_placement_campaigns
      WHERE vendor_id = (SELECT auth.uid())
    )
  );

-- Optimize vendor_engagement_scores policies
DROP POLICY IF EXISTS "Admins can manage all scores" ON public.vendor_engagement_scores;
CREATE POLICY "Admins can manage all scores" ON public.vendor_engagement_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Vendors can view their own score" ON public.vendor_engagement_scores;
CREATE POLICY "Vendors can view their own score" ON public.vendor_engagement_scores
  FOR SELECT TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

-- Optimize ai_assistant_prompts policies
DROP POLICY IF EXISTS "Admins can manage prompts" ON public.ai_assistant_prompts;
CREATE POLICY "Admins can manage prompts" ON public.ai_assistant_prompts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

-- Optimize order_documents policies
DROP POLICY IF EXISTS "Admins can view all order documents" ON public.order_documents;
CREATE POLICY "Admins can view all order documents" ON public.order_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Customers can upload documents for own orders" ON public.order_documents;
CREATE POLICY "Customers can upload documents for own orders" ON public.order_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_documents.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can view own order documents" ON public.order_documents;
CREATE POLICY "Customers can view own order documents" ON public.order_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_documents.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can view documents for their orders" ON public.order_documents;
CREATE POLICY "Vendors can view documents for their orders" ON public.order_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_documents.order_id
      AND orders.vendor_id = (SELECT auth.uid())
    )
  );

-- Optimize cart_items policies
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart" ON public.cart_items
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Optimize order_status_history policies
DROP POLICY IF EXISTS "Admins can view all order history" ON public.order_status_history;
CREATE POLICY "Admins can view all order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own order status history" ON public.order_status_history;
CREATE POLICY "Users can view own order status history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can update order status" ON public.order_status_history;
CREATE POLICY "Vendors can update order status" ON public.order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.vendor_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vendors can view order status history" ON public.order_status_history;
CREATE POLICY "Vendors can view order status history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
      AND orders.vendor_id = (SELECT auth.uid())
    )
  );

-- Optimize ai_feedback policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.ai_feedback;
CREATE POLICY "Admins can view all feedback" ON public.ai_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create feedback" ON public.ai_feedback;
CREATE POLICY "Users can create feedback" ON public.ai_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own feedback" ON public.ai_feedback;
CREATE POLICY "Users can view own feedback" ON public.ai_feedback
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Optimize demo_sessions policies
DROP POLICY IF EXISTS "Users can create own demo sessions" ON public.demo_sessions;
CREATE POLICY "Users can create own demo sessions" ON public.demo_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own demo sessions" ON public.demo_sessions;
CREATE POLICY "Users can update own demo sessions" ON public.demo_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own demo sessions" ON public.demo_sessions;
CREATE POLICY "Users can view own demo sessions" ON public.demo_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Optimize profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Optimize delivery_services policies
DROP POLICY IF EXISTS "Authenticated users can create services" ON public.delivery_services;
CREATE POLICY "Authenticated users can create services" ON public.delivery_services
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service owners can update their own services" ON public.delivery_services;
CREATE POLICY "Service owners can update their own services" ON public.delivery_services
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service owners can view their own services" ON public.delivery_services;
CREATE POLICY "Service owners can view their own services" ON public.delivery_services
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- Optimize delivery_zones policies
DROP POLICY IF EXISTS "Service owners can manage their zones" ON public.delivery_zones;
CREATE POLICY "Service owners can manage their zones" ON public.delivery_zones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = delivery_zones.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = delivery_zones.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  );

-- Optimize orders policies
DROP POLICY IF EXISTS "Service owners can update their service orders" ON public.orders;
CREATE POLICY "Service owners can update their service orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = orders.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service owners can view orders for their service" ON public.orders;
CREATE POLICY "Service owners can view orders for their service" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = orders.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Optimize products policies
DROP POLICY IF EXISTS "Service owners can manage their products" ON public.products;
CREATE POLICY "Service owners can manage their products" ON public.products
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = products.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_services
      WHERE delivery_services.id = products.service_id
      AND delivery_services.owner_id = (SELECT auth.uid())
    )
  );
