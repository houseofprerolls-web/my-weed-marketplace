# my-weed-marketplace

**Primary app:** [`greenzone-bolt/`](./greenzone-bolt) — Next.js marketplace (directory, vendor dashboard, Supabase).

**Database:** [`supabase/migrations/`](./supabase/migrations) and related SQL (CannaHub-style schema).

## Run GreenZone Bolt (default)

```bash
cd greenzone-bolt
npm install
npm run dev
```

Or from the **repo root** (same thing):

```bash
npm install --prefix greenzone-bolt
npm run dev
```

Open **http://localhost:3000**.

Env: copy `greenzone-bolt/.env.example` → `greenzone-bolt/.env.local`.

## Other folders

| Path | Purpose |
|------|--------|
| **`da-treehouse/`** | Separate Next.js 16 + Tailwind v4 app (catalog-style). Not required for GreenZone work. Run `npm install` and `npm run dev` *inside* that folder if you need it. |
| **`supabase/`** | Migrations and runbooks shared by the project. |
| **`GREENZONE_BOLT.md`** | Bolt/GreenZone Supabase setup notes. |

If you still have a leftover **`node_modules/`** at the repo root from the old layout, you can delete it — installs now target **`greenzone-bolt/node_modules`**.
