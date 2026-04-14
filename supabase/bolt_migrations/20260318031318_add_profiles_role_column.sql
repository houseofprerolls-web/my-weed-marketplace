/*
  Patch: original Bolt chain never added profiles.role before
  20260318031319_setup_role_based_authentication.sql expects it.
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role text NOT NULL DEFAULT 'customer';
  END IF;
END $$;
