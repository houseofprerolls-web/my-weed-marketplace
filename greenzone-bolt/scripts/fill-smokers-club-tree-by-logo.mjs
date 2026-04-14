/**
 * Fill empty Smokers Club treehouse ladder slots (ranks 1–7) per listing_market.
 *
 * - Candidates: live, license approved, retail (storefront or delivery), **usable listing image**
 *   (`logo_url` or `banner_url` — http(s) and not a known placeholder).
 * - Skips vendors in the 923xx ZIP prefix (92324 / Colton corridor) for new assignments.
 * - Only fills **empty** slot ranks; does not remove or move existing rows.
 * - Upserts vendor_market_operations.approved for placed vendors per market.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 *   node scripts/fill-smokers-club-tree-by-logo.mjs --dry-run
 *   node scripts/fill-smokers-club-tree-by-logo.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');

function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function zipPrefix3(zip) {
  const d = String(zip ?? '').replace(/\D/g, '');
  return d.length >= 3 ? d.slice(0, 3) : '';
}

function isPlaceholderOrMissingImageUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  if (!u) return true;
  if (!u.startsWith('http')) return true;
  if (u.includes('weedmaps-logo.jpg')) return true;
  if (u.includes('placeholders/')) return true;
  if (u.includes('listing_mobile_hero_image_default')) return true;
  return false;
}

/** True if vendor has a real logo or banner image URL (not empty / placeholder). */
function hasUsableListingImage(logoUrl, bannerUrl) {
  const logo = String(logoUrl ?? '').trim();
  const ban = String(bannerUrl ?? '').trim();
  if (!isPlaceholderOrMissingImageUrl(logo)) return true;
  if (!isPlaceholderOrMissingImageUrl(ban)) return true;
  return false;
}

const MIN_SLOT = 1;
const MAX_SLOT = 7;

async function fetchAllRows(supabase, table, selectCols) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase.from(table).select(selectCols).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const markets = await fetchAllRows(supabase, 'listing_markets', 'id,slug');
const calOtherId = markets.find((m) => m.slug === 'california-other')?.id ?? null;
const prefixes = await fetchAllRows(supabase, 'market_zip_prefixes', 'prefix,market_id');
const prefixToMarket = new Map(prefixes.map((p) => [p.prefix, p.market_id]));

function marketIdForZip(zip) {
  const p3 = zipPrefix3(zip);
  if (!p3) return calOtherId;
  return prefixToMarket.get(p3) ?? calOtherId;
}

const vendors = await fetchAllRows(
  supabase,
  'vendors',
  'id,name,zip,logo_url,banner_url,license_status,is_live,is_directory_listing,offers_storefront,offers_delivery'
);

const candidatesByMarket = new Map();

for (const v of vendors) {
  if (!v.id) continue;
  if (String(v.license_status ?? '') !== 'approved') continue;
  if (v.is_live !== true) continue;
  if (v.is_directory_listing === false) continue;
  const hasRetail = v.offers_storefront === true || v.offers_delivery === true;
  if (!hasRetail) continue;
  if (!hasUsableListingImage(v.logo_url, v.banner_url)) continue;
  const z3 = zipPrefix3(v.zip);
  if (z3 === '923') continue;

  const mid = marketIdForZip(v.zip);
  if (!mid) continue;

  if (!candidatesByMarket.has(mid)) candidatesByMarket.set(mid, []);
  candidatesByMarket.get(mid).push({ id: v.id, name: String(v.name || '') });
}

for (const [, arr] of candidatesByMarket) {
  arr.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

let marketsTouched = 0;
let slotsFilled = 0;
let opsUpserted = 0;
const plan = [];
const statsBySlug = {};

for (const m of markets) {
  const mid = m.id;
  const { data: listings, error: lErr } = await supabase
    .from('vendor_market_listings')
    .select('vendor_id,slot_rank')
    .eq('market_id', mid)
    .eq('club_lane', 'treehouse')
    .eq('active', true);
  if (lErr) {
    console.error('listings', m.slug, lErr.message);
    continue;
  }

  const occupiedRanks = new Set();
  const vendorsOnLadder = new Set();
  for (const row of listings || []) {
    const r = row.slot_rank;
    if (typeof r === 'number' && r >= MIN_SLOT && r <= MAX_SLOT) occupiedRanks.add(r);
    if (row.vendor_id) vendorsOnLadder.add(row.vendor_id);
  }

  const pool = (candidatesByMarket.get(mid) || []).filter((c) => !vendorsOnLadder.has(c.id));
  let emptySlots = 0;
  for (let rank = MIN_SLOT; rank <= MAX_SLOT; rank++) {
    if (!occupiedRanks.has(rank)) emptySlots++;
  }
  statsBySlug[m.slug] = {
    candidates: pool.length,
    emptySlots,
    occupied: occupiedRanks.size,
  };

  let pi = 0;
  const inserts = [];

  for (let rank = MIN_SLOT; rank <= MAX_SLOT; rank++) {
    if (occupiedRanks.has(rank)) continue;
    if (pi >= pool.length) break;
    const v = pool[pi++];
    inserts.push({ market_id: mid, vendor_id: v.id, slot_rank: rank, vendorName: v.name, marketSlug: m.slug });
  }

  if (inserts.length === 0) continue;
  marketsTouched++;

  for (const ins of inserts) {
    plan.push(ins);
    if (DRY) continue;

    const { error: uErr } = await supabase.from('vendor_market_operations').upsert(
      {
        vendor_id: ins.vendor_id,
        market_id: ins.market_id,
        approved: true,
        note: 'auto-fill-tree-logo',
      },
      { onConflict: 'vendor_id,market_id' }
    );
    if (uErr) console.error('vendor_market_operations', ins.marketSlug, uErr.message);
    else opsUpserted++;

    const { error: vErr } = await supabase.from('vendor_market_listings').upsert(
      {
        market_id: ins.market_id,
        vendor_id: ins.vendor_id,
        slot_rank: ins.slot_rank,
        club_lane: 'treehouse',
        is_premium: true,
        active: true,
        note: 'auto-fill-tree-logo',
      },
      { onConflict: 'market_id,vendor_id,club_lane' }
    );
    if (vErr) console.error('vendor_market_listings', ins.marketSlug, vErr.message);
    else slotsFilled++;
  }
}

console.log(
  JSON.stringify(
    {
      dryRun: DRY,
      filter: 'logo_url or banner_url (non-placeholder http URL)',
      markets: markets.length,
      marketsWithNewFills: marketsTouched,
      newAssignments: plan.length,
      vendorMarketOpsUpserts: DRY ? 0 : opsUpserted,
      listingsUpserts: DRY ? 0 : slotsFilled,
      excludedZipPrefix923: true,
      statsBySlug,
      sample: plan.slice(0, 25),
    },
    null,
    2
  )
);
