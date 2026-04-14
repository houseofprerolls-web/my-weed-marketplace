# Smokers Club retailer seed CSV

## Files

| File | Purpose |
|------|---------|
| `greenzone-bolt/data/smokers_club_retailer_seed_by_ca_region.csv` | 10 rows per **listing market** (see `listing_markets` / migration `0019_listing_markets_ca.sql`), not every California county. |
| `greenzone-bolt/scripts/generate-smokers-club-retailer-csv.mjs` | Regenerates the CSV if you edit the seed data. |

Run:

```bash
cd greenzone-bolt
node scripts/generate-smokers-club-retailer-csv.mjs
```

### Load into Supabase (live + Smokers Club + map + menus)

1. Apply migration **`0089_set_vendor_geog_point_rpc.sql`** (or full `supabase db push`).
2. Put **`NEXT_PUBLIC_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** in **`.env.local`** (service role is required for RPC + bulk writes).
3. Run:

```bash
cd greenzone-bolt
npm run import:smokers-club-csv
```

Dry-run (parse only, no DB):

```bash
node scripts/import-smokers-club-csv.mjs --dry-run
```

The importer (`scripts/import-smokers-club-csv.mjs`) will:

- Insert or update each CSV row as a **directory** vendor (`user_id` null, `is_directory_listing` true): **live**, **approved**, **`smokers_club_eligible`**, **`map_visible_override`**, **`online_menu_enabled`**.
- Set **`vendors.location`** via **`set_vendor_geog_point`** (ZIP anchor + stable jitter by slug) so **map markers** resolve in `vendors_public_coords`.
- Upsert **`vendor_market_operations`** with **`approved = true`** for that row’s **`listing_market_slug`**.
- Upsert **`vendor_market_listings`** with **`club_lane = treehouse`** and **`slot_rank` 1–10**, using the CSV rank when the slot is free; otherwise the **next free** slot; if all ten are taken, the vendor is still live/eligible but **no new tree row** is added.
- Insert **six placeholder products** per vendor when they have **no menu yet** (same style as the Saferock seed).

Re-running the import is **idempotent** for the same slugs (updates flags, reuses existing tree slot when present).

## What this is (and is not)

- **Not** an official “top 10” ranking from a government agency or audited sales data.
- **Is** an **editorial shortlist** of **well-known or frequently cited** California cannabis retailers and delivery operators, grouped into the same **regions** your app already uses for ZIP routing (`greater-los-angeles`, `orange-county`, `bay-area`, etc.).
- **Not legal advice.** You are responsible for compliance.

## Before importing to production

1. **License** — For each row, look up the **exact** retail license number and legal business name in the **DCC license search**:  
   [https://search.cannabis.ca.gov/](https://search.cannabis.ca.gov/)  
   Fill `license_number` in the CSV (left blank in the generated file).

2. **Premise** — Confirm the **address** still matches the licensed premises. Stores close, move, and change DBAs often.

3. **Logos** — `logo_url` uses **Clearbit’s logo API** (`https://logo.clearbit.com/{domain}`) when a stable corporate domain was set. Clearbit may return nothing or the wrong logo; prefer uploading logos to your own storage and pointing `logo_url` there.

4. **Phones** — Several numbers are **placeholders or rounded patterns** for spreadsheet layout. Replace with the **real** published store line from the operator’s site or Google Business.

5. **Market vs county** — The column `county_or_region_label` is a **human label** (sometimes multi-county). Your database keys Smokers Club / markets off **`listing_market_slug`**, which must match `public.listing_markets.slug`.

6. **Duplicates** — A few operators appear in more than one market (e.g. desert vs Inland Empire). **Deduplicate** `slug` / vendor rows when importing.

## Suggested DB mapping

Typical `public.vendors` fields align like this:

| CSV column | `vendors` column |
|------------|------------------|
| `name` | `name` |
| `slug` | `slug` (must stay unique) |
| `tagline` | `tagline` |
| `description` | `description` |
| `logo_url` | `logo_url` |
| `banner_url` | `banner_url` |
| `website` | `website` |
| `phone` | `phone` |
| `address`, `city`, `state`, `zip` | `address`, `city`, `state`, `zip` |
| `license_number` | `license_number` |
| `license_status` | `license_status` |
| `is_live` | `is_live` |
| `smokers_club_eligible` | `smokers_club_eligible` |
| `verified` | `verified` |
| `offers_delivery` / `offers_storefront` | `offers_delivery` / `offers_storefront` |
| `is_directory_listing` | `is_directory_listing` (if column exists) |
| `subscription_tier` | `subscription_tier` |

Then attach **Smokers Club tree / premium slots** via your existing `vendor_market_listings` (or admin UI), using `listing_market_slug` to resolve `market_id`.

## Adding “every CA county”

California has **58 counties**. This repo’s Smokers Club geography is modeled as **~12 listing markets + ZIP prefixes**, not 58 separate county files. If you need a strict **per-county** CSV, extend the generator with a county dimension and re-run — but you will still need **manual DCC verification** for every row.
