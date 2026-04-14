# SQL to run (pick your situation)

## You already have `profiles`, `vendors`, etc. — only 2 scripts

For **master admin + optional GreenZone policies** (safe when `vendor_profiles` / `user_roles` don’t exist):

1. **`supabase/bolt_migrations/20260321120000_master_admin_vendor_live_rls.sql`**

For **admin vendor console** hours + licenses when the app uses **`public.vendors`** (`NEXT_PUBLIC_USE_VENDORS_TABLE=1`):

2. **`supabase/migrations/0022_vendor_hours_licenses_vendors.sql`**

That’s it. You do **not** need to re-run the full core schema below.

---

## Only if the project never had base tables (`profiles` missing, etc.)

Then use the numbered files **01 → 06** in this folder **once** to bootstrap from scratch. If you already ran `0001_init` (or similar) on Supabase, skip that whole block.

---

## Optional: add two test vendors

Run `supabase/sql/run_now/07_test_vendors_greenhaven_flexotic.sql` after you create two auth users in Supabase Authentication:

- `greenhaven.vendor@greenzone.test`
- `flexotic.vendor@greenzone.test`

Use password `pokemon3` for both users.
