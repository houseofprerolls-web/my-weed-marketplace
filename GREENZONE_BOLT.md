**Layout:** The Next.js app for GreenZone is only in **`greenzone-bolt/`**. The repo root is not a Next app (optional Next 16 copy lives in **`da-treehouse/`** if you need it).

---

### Do not paste this file into the Supabase SQL Editor

**`GREENZONE_BOLT.md` is Markdown documentation, not SQL.** Lines starting with `#` are headings; Postgres will error with `syntax error at or near "#"`.

**Only paste files whose names end in `.sql`**, from:

- `supabase/bolt_setup/` (start with `00_wipe_public_schema.sql`, then `01_extensions.sql`)
- `supabase/bolt_migrations/` (every file, sorted by filename)

---

# GreenZone (Bolt) site + Supabase

Use **`greenzone-bolt/`** as the Next.js app (same codebase that was in the Bolt export). Your `.env` there should point at the Supabase project where you applied the GreenZone SQL.

## 1. Wipe `public` on Supabase (Bolt-only project)

On **[dsfiwnwrwfgjuthhjima](https://supabase.com/dashboard/project/dsfiwnwrwfgjuthhjima/sql/new)** (or whichever project is **only** for GreenZone), run in order:

1. `supabase/bolt_setup/00_wipe_public_schema.sql` — **destroys all tables/views/functions in `public`**
2. `supabase/bolt_setup/01_extensions.sql`

If `00` errors on `supabase_admin`, remove those grants/lines (rare on hosted Supabase).

**Backup first** if anything in that project still matters.

## 2. Apply GreenZone migrations

Run **every** `.sql` file in `supabase/bolt_migrations/` in **filename order** (see full list in `supabase/BOLT_GREENZONE.md`). Includes the extra patch `20260318031318_add_profiles_role_column.sql` before role-based auth.

Do **not** run the CannaHub chain (`supabase/migrations/0001_…`, `0019_…`, etc.) on this same database — it will fight GreenZone.

## 3. Run the app

```powershell
cd greenzone-bolt
npm run dev
```

Open `http://localhost:3000`. Set **Authentication → URL configuration** in Supabase for your local URL if you use sign-in.

## 4. Vercel (repo connected at monorepo root)

Root **`vercel.json`** runs `npm run build --prefix greenzone-bolt`, then links **`./.next`** → **`greenzone-bolt/.next`** so the Next.js preset finds `routes-manifest.json`. Prefer that over changing **Output Directory** in the dashboard (leave it default / empty unless you know you need an override).

Alternatively, set the Vercel project **Root Directory** to **`greenzone-bolt`** and remove the custom `buildCommand` from root `vercel.json` so the app builds in-place there.

## 5. Old folder

If `project-bolt-sb1-v8s819gt/` is still on disk, close anything using it and delete that folder manually so you only maintain **`greenzone-bolt/`**.
