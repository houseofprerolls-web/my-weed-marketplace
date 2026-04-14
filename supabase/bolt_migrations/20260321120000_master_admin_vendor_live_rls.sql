/*
  Master admin (houseofprerolls@gmail.com), optional vendor_profiles.is_live, and RLS
  for admin analytics / hours / licenses — GreenZone (bolt) schema.

  SAFE TO RUN when tables are missing: each block checks information_schema first.

  Requires public.profiles for the admin promotion step; if you get no rows updated,
  run your base schema first (e.g. supabase/migrations/0001_init.sql) and ensure the
  user has signed up so a profile row exists.

  For CannaHub (vendors table, no vendor_profiles): set NEXT_PUBLIC_USE_VENDORS_TABLE=1
  in the app and apply supabase/migrations/0022_vendor_hours_licenses_vendors.sql
  for admin hours/licenses tables.

  Full vendor_profiles setup: run 20260307040507_create_greenzone_platform_schema.sql
  and dependent bolt migrations first.
*/

-- ---------------------------------------------------------------------------
-- 1) Vendor visibility (GreenZone vendor_profiles only)
-- ---------------------------------------------------------------------------
DO $vp$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_profiles'
  ) THEN
    ALTER TABLE public.vendor_profiles
      ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT true;
    COMMENT ON COLUMN public.vendor_profiles.is_live IS 'When false, vendor is hidden from public discovery despite approval.';
  END IF;
END
$vp$;

-- ---------------------------------------------------------------------------
-- 2) Promote master account (requires public.profiles + matching auth.users row)
-- ---------------------------------------------------------------------------
DO $prof$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    UPDATE public.profiles p
    SET role = 'admin'
    FROM auth.users u
    WHERE u.id = p.id
      AND lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'));
  END IF;
END
$prof$;

-- user_roles only exists in GreenZone bolt schema
DO $ur$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT p.id, 'admin'
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END
$ur$;

-- ---------------------------------------------------------------------------
-- 3) business_hours — admins (GreenZone)
-- ---------------------------------------------------------------------------
DO $bh$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_hours'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Admins can manage all business_hours" ON public.business_hours
    $p$;
    EXECUTE $p$
      CREATE POLICY "Admins can manage all business_hours"
        ON public.business_hours
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    $p$;
  END IF;
END
$bh$;

-- ---------------------------------------------------------------------------
-- 4) vendor_hours — admins (GreenZone; references vendor_profiles in bolt)
-- ---------------------------------------------------------------------------
DO $vh$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vendor_hours'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    EXECUTE $p$DROP POLICY IF EXISTS "Admins can manage all vendor_hours" ON public.vendor_hours$p$;
    EXECUTE $p$
      CREATE POLICY "Admins can manage all vendor_hours"
        ON public.vendor_hours
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    $p$;
  END IF;
END
$vh$;

-- ---------------------------------------------------------------------------
-- 5) business_licenses — admins (GreenZone)
-- ---------------------------------------------------------------------------
DO $bl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_licenses'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    EXECUTE $p$DROP POLICY IF EXISTS "Admins can manage all business_licenses" ON public.business_licenses$p$;
    EXECUTE $p$
      CREATE POLICY "Admins can manage all business_licenses"
        ON public.business_licenses
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    $p$;
  END IF;
END
$bl$;

-- ---------------------------------------------------------------------------
-- 6) orders — admins can read all (analytics); only if orders + user_roles exist
-- ---------------------------------------------------------------------------
DO $ord$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    EXECUTE $p$DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders$p$;
    EXECUTE $p$
      CREATE POLICY "Admins can view all orders"
        ON public.orders
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    $p$;
  END IF;
END
$ord$;
