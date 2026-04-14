-- =============================================================================
-- DESTRUCTIVE — full reset of schema `public` on Supabase (GreenZone / Bolt prep)
-- =============================================================================
-- Removes every table, view, function, type, and policy in `public`.
-- Use only on a Supabase project dedicated to GreenZone, or after a backup.
--
-- Does NOT remove auth.users, storage, or other schemas.
-- After this: run 01_extensions.sql, then every file in ../bolt_migrations/ in order.
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, supabase_admin, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, supabase_admin;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_admin, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, supabase_admin, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_admin, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, supabase_admin, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, supabase_admin, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, supabase_admin, anon, authenticated, service_role;
