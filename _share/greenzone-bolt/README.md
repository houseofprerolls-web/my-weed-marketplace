# DaTreehouse (GreenZone / Bolt codebase)

Next.js 13 app for the DaTreehouse marketplace. Env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase reset and migration order: see repo root **`GREENZONE_BOLT.md`** and **`supabase/BOLT_GREENZONE.md`**.

```bash
npm install   # if node_modules is missing or incomplete
npm run dev
```

## Environment files (already set for this project)

- **`.env`** — Supabase URL + anon key (gitignored)
- **`.env.local`** — same values; Next.js loads this in dev (gitignored)
- **`.env.production.local`** — same values; used for local `next build` / production mode (gitignored)

## Vercel (hosted site)

CLI push from your machine (after `npx vercel login` and `npx vercel link` in this folder):

```powershell
cd greenzone-bolt
.\scripts\push-env-to-vercel.ps1
```

Or paste manually in **Vercel → Project → Settings → Environment Variables** for Production + Preview:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dsfiwnwrwfgjuthhjima.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(your anon key from Supabase → Settings → API)* |

Then **Redeploy**.

If env is missing on the host, you’ll see an amber banner on the site instead of a blank page.
