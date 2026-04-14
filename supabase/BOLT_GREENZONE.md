**Do not paste this `.md` file into the Supabase SQL Editor** — it is Markdown (`#` headings are not SQL). Open each **`.sql`** file listed below and paste **only that file’s contents**.

---

# Bolt / GreenZone schema (SQL bundle)

## Fresh database (recommended for GreenZone)

1. Run **`bolt_setup/00_wipe_public_schema.sql`** (destroys everything in `public`).
2. Run **`bolt_setup/01_extensions.sql`**.
3. Run **every** file below from **`bolt_migrations/`** in this exact order (lexicographic sort matches it).

If `00_wipe_public_schema.sql` fails on `supabase_admin`, use a hosted Supabase project or edit that file to match your roles.

## Apply order (`bolt_migrations/`)

1. `20260307031919_create_greenfinder_schema.sql`
2. `20260307033632_add_social_media_features.sql`
3. `20260307040507_create_greenzone_platform_schema.sql`
4. `20260307064013_add_vendor_metric_functions.sql`
5. `20260307085009_create_menu_management_system.sql`
6. `20260307085051_create_subscription_billing_system.sql`
7. `20260307085200_create_enhanced_analytics_admin_system_fixed.sql`
8. `20260307095350_create_admin_placement_management_system_fixed.sql`
9. `20260307175813_complete_customer_checkout_and_order_system.sql`
10. `20260308173034_create_missing_operational_tables.sql`
11. `20260308174519_create_ai_assistant_system.sql`
12. `20260308181157_enhance_strains_and_add_vendor_features.sql`
13. `20260308185909_complete_vendor_billing_system.sql`
14. `20260309053257_fix_security_and_performance_issues.sql`
15. `20260318031318_add_profiles_role_column.sql` — **repo patch** (Bolt chain omitted `profiles.role`)
16. `20260318031319_setup_role_based_authentication.sql`

**How:** Supabase Dashboard → SQL Editor → paste each file in order (or `psql`).

## CannaHub vs GreenZone

`supabase/migrations/0001_init.sql` and later define **CannaHub** (`profiles` / `vendors` / PostGIS, etc.). That is **incompatible** with GreenZone’s `profiles` + `delivery_services` model. Use **separate Supabase projects**, or wipe `public` with `bolt_setup/00` and apply **only** the GreenZone list above — never both chains on the same DB.

## Next.js app

Use **`greenzone-bolt/`** at the repo root (see **`GREENZONE_BOLT.md`**).
