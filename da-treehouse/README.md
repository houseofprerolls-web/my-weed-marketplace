# da-treehouse (Next.js 16)

This is the **standalone** Next 16 + Tailwind v4 app that used to live at the repository root. It is **separate** from **GreenZone Bolt** (`../greenzone-bolt/`).

Work on **GreenZone** from `../greenzone-bolt/` unless you explicitly need this UI.

## Run

```bash
cd da-treehouse
npm install
npm run dev
```

Use `da-treehouse/.env.local` (copy from `.env.example` here if present).

## Note

`npm run dev` is configured with `--webpack` for reliable CSS in development.

The old create-next-app readme was saved as `README-NEXT16.md`.

## Deploy to Vercel (`datreehouse.com`)

This folder must be its **own Vercel project** (different from `greenzone-bolt`). Set **Root Directory** to `da-treehouse` when importing the Git repo, or deploy from this directory with the CLI.

**CLI (from repo root):**

```bash
npm run vercel:treehouse:prod
```

Or from this folder: `npm run vercel:prod` (after `npx vercel login` and `npx vercel link` here).

**Environment variables** (Vercel → Project → Settings → Environment Variables): copy from `.env.example` — at minimum `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_MAPBOX_TOKEN` if the map is used. Add server-only `SUPABASE_SERVICE_ROLE_KEY` only if your routes need it.

**Custom domain:** Vercel → Project → **Domains** → add `datreehouse.com` and `www.datreehouse.com` if you use www. At your DNS host, add the **A / CNAME** records Vercel shows (or point nameservers to Vercel if you prefer). In **Supabase → Authentication → URL configuration**, set **Site URL** to `https://datreehouse.com` and add redirect URLs that match (e.g. `https://datreehouse.com/auth/callback`, and `https://www.datreehouse.com/...` if applicable).
