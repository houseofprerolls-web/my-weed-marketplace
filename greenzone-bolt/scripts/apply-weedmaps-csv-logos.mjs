/**
 * Read a Web Scraper / Weedmaps-style CSV (columns include title + image),
 * match rows to public.vendors by name, set logo_url from the avatar URL.
 *
 * Skips Weedmaps placeholder images. Optional San Diego region disambiguation
 * when the same brand name exists in multiple cities.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv "C:/path/to/file.csv" --dry-run
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv "C:/path/to/file.csv"
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv file.csv --region san-diego
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv file.csv --region sacramento
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv file.csv --region inland-empire
 *   (--region colton is an alias for inland-empire)
 *   node scripts/apply-weedmaps-csv-logos.mjs --csv file.csv --region los-angeles
 *   (--region la is an alias for los-angeles)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');
const args = process.argv.slice(2);
const csvIdx = args.indexOf('--csv');
const csvPath =
  csvIdx >= 0 && args[csvIdx + 1] ? path.resolve(args[csvIdx + 1]) : null;
const region =
  (() => {
    const i = args.indexOf('--region');
    return i >= 0 && args[i + 1] ? String(args[i + 1]).toLowerCase() : '';
  })();

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error(
    'Usage: node scripts/apply-weedmaps-csv-logos.mjs --csv <path> [--dry-run] [--region san-diego|sacramento|inland-empire|colton|los-angeles|la]'
  );
  process.exit(1);
}

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
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
    if (!process.env[k]) process.env[k] = v;
  }
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (!inQ && c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  if (!u.startsWith('http')) return true;
  if (u.includes('weedmaps-logo.jpg')) return true;
  if (u.includes('placeholders/')) return true;
  if (u.includes('listing_mobile_hero_image_default')) return true;
  return false;
}

/** Strip neighborhood / suffix for brand-style match */
function brandFromTitle(title) {
  let s = String(title || '')
    .trim()
    .split(/\s+-\s+/)[0]
    .replace(/\s+delivery\s*$/i, '')
    .replace(/\bdelivery\s*$/i, '')
    .trim();
  return s;
}

function compactKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function vendorInSanDiegoArea(v) {
  const city = String(v.city || '').toLowerCase();
  const z = String(v.zip || '').replace(/\D/g, '');
  const z3 = z.length >= 3 ? z.slice(0, 3) : '';
  if (['919', '920', '921'].includes(z3)) return true;
  if (
    /san diego|chula vista|national city|la mesa|el cajon|oceanside|carlsbad|escondido|vista|encinitas|poway|coronado|imperial beach|lemon grove|spring valley|san marcos|del mar|solana beach|ranchos|santee/i.test(
      city
    )
  )
    return true;
  return false;
}

function vendorInSacramentoMetro(v) {
  const city = String(v.city || '').toLowerCase();
  const z = String(v.zip || '').replace(/\D/g, '');
  const z3 = z.length >= 3 ? z.slice(0, 3) : '';
  if (['942', '956', '957', '958'].includes(z3)) return true;
  if (
    /sacramento|elk grove|roseville|folsom|citrus heights|rancho cordova|west sacramento|davis|woodland|carmichael|fair oaks|north highlands|rocklin|lincoln|placerville|auburn|vacaville|galt|natomas/i.test(
      city
    )
  )
    return true;
  return false;
}

/** San Bernardino / Riverside / Colton-area scrapes */
function vendorInInlandEmpire(v) {
  const city = String(v.city || '').toLowerCase();
  const z = String(v.zip || '').replace(/\D/g, '');
  const z3 = z.length >= 3 ? z.slice(0, 3) : '';
  if (['917', '922', '923', '924', '925'].includes(z3)) return true;
  if (
    /colton|san bernardino|riverside|moreno valley|fontana|rialto|redlands|corona|ontario|rancho cucamonga|upland|chino|hesperia|victorville|apple valley|highland|loma linda|yucaipa|beaumont|banning|perris|lake elsinore|murrieta|temecula|menifee|hemet|norco|eastvale|jurupa|montclair|chino hills|grand terrace/i.test(
      city
    )
  )
    return true;
  return false;
}

/**
 * Weedmaps “Los Angeles” listings: LA County core + adjacent market ZIPs.
 * Excludes 926–928 (typical Orange County) and IE-only 922–925 to reduce wrong chain matches.
 */
function vendorInLosAngelesMetro(v) {
  const city = String(v.city || '').toLowerCase();
  const z = String(v.zip || '').replace(/\D/g, '');
  const z3 = z.length >= 3 ? z.slice(0, 3) : '';
  const laZip3 = new Set([
    '900',
    '901',
    '902',
    '903',
    '904',
    '905',
    '906',
    '907',
    '908',
    '910',
    '911',
    '912',
    '913',
    '914',
    '915',
    '916',
    '917',
    '918',
    '935',
  ]);
  if (laZip3.has(z3)) return true;
  if (
    /los angeles|long beach|santa monica|pasadena|glendale|torrance|inglewood|compton|burbank|west hollywood|whittier|downey|el monte|norwalk|pomona|west covina|hawthorne|lakewood|bellflower|baldwin park|lynwood|redondo beach|south gate|carson|alhambra|santa clarita|culver city|beverly hills|calabasas|thousand oaks|palmdale|lancaster|encino|northridge|van nuys|reseda|canoga park|sherman oaks|studio city|north hollywood|marina del rey|playa del rey|manhattan beach|hermosa beach|el segundo|gardena|lawndale|watts|wilmington|san pedro|harbor city|montebello|monterey park|rosemead|arcadia|monrovia|azusa|covina|walnut|diamond bar|hacienda heights|rowland heights|cerritos|artesia|cudahy|huntington park|maywood|bell|south pasadena|san marino|la cañada|la canada|altadena|la verne|claremont|westlake village|agoura hills|hidden hills/i.test(
      city
    )
  )
    return true;
  return false;
}

const REGION_TIE_BREAK = new Set([
  'san-diego',
  'sacramento',
  'inland-empire',
  'colton',
  'los-angeles',
  'la',
]);

function scoreOne(title, v) {
  const tFull = String(title || '').trim();
  const tBrand = brandFromTitle(tFull);
  const tCompact = compactKey(tFull);
  const bCompact = compactKey(tBrand);
  const n = String(v.name || '').trim();
  const nCompact = compactKey(n);
  let score = 0;
  if (tCompact === nCompact) score = 100;
  else if (bCompact === nCompact) score = 98;
  else if (tCompact.startsWith(nCompact) && nCompact.length >= 6) score = 92;
  else if (bCompact.startsWith(nCompact) && nCompact.length >= 6) score = 90;
  else if (nCompact.startsWith(bCompact) && bCompact.length >= 8) score = 88;
  else if (tCompact.includes(nCompact) && nCompact.length >= 10) score = 78;
  else if (bCompact.includes(nCompact) && nCompact.length >= 8) score = 76;
  return score;
}

/** @returns {{ vendor: object, score: number } | null} */
function bestVendorForTitle(title, vendors) {
  let best = null;
  let bestScore = 0;
  for (const v of vendors) {
    const score = scoreOne(title, v);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    } else if (score === bestScore && score > 0 && best) {
      if (String(v.name).length > String(best.name).length) best = v;
    }
  }
  const MIN_SCORE = 80;
  if (bestScore < MIN_SCORE) return null;

  const atScore = vendors.filter((v) => scoreOne(title, v) === bestScore);
  let pool = atScore;
  const r =
    region === 'colton' ? 'inland-empire' : region === 'la' ? 'los-angeles' : region;
  if (r === 'san-diego') {
    const inR = atScore.filter(vendorInSanDiegoArea);
    if (inR.length === 1) return { vendor: inR[0], score: bestScore };
    if (inR.length > 1) pool = inR;
    else if (inR.length === 0) return null;
  } else if (r === 'sacramento') {
    const inR = atScore.filter(vendorInSacramentoMetro);
    if (inR.length === 1) return { vendor: inR[0], score: bestScore };
    if (inR.length > 1) pool = inR;
    else if (inR.length === 0) return null;
  } else if (r === 'inland-empire') {
    const inR = atScore.filter(vendorInInlandEmpire);
    if (inR.length === 1) return { vendor: inR[0], score: bestScore };
    if (inR.length > 1) pool = inR;
    else if (inR.length === 0) return null;
  } else if (r === 'los-angeles') {
    const inR = atScore.filter(vendorInLosAngelesMetro);
    if (inR.length === 1) return { vendor: inR[0], score: bestScore };
    if (inR.length > 1) pool = inR;
    else if (inR.length === 0) return null;
  }
  pool.sort((a, b) => String(b.name).length - String(a.name).length);
  if (pool.length > 1 && !REGION_TIE_BREAK.has(region) && region !== 'colton' && region !== 'la') {
    console.warn(
      `Ambiguous "${title}" → ${pool.length} vendors at score ${bestScore}; using longest name: ${pool[0].name}`
    );
  }
  return { vendor: pool[0], score: bestScore };
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
if (lines.length < 2) {
  console.error('CSV empty');
  process.exit(1);
}

const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
let titleCol = header.indexOf('title');
if (titleCol < 0) titleCol = header.indexOf('name');
let imageCol = header.indexOf('image');
if (imageCol < 0) imageCol = header.indexOf('image_1');

if (titleCol < 0 || imageCol < 0) {
  console.error('CSV must include title (or name) and image column. Found:', header.join(', '));
  process.exit(1);
}

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cells = parseCsvLine(lines[i]);
  const title = (cells[titleCol] || '').trim();
  const image = (cells[imageCol] || '').trim();
  if (!title) continue;
  rows.push({ title, image, line: i + 1 });
}

async function fetchAllVendors() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id,name,slug,logo_url,city,zip')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

const vendors = await fetchAllVendors();
console.error(`Loaded ${vendors.length} vendors, ${rows.length} CSV rows (with title)`);

const skipped = [];
const noMatch = [];
/** @type {Map<string, { row: object, m: { vendor: object, score: number } }>} */
const bestByVendor = new Map();

for (const row of rows) {
  if (isPlaceholderImage(row.image)) {
    skipped.push({ ...row, reason: 'placeholder_or_empty_image' });
    continue;
  }
  const m = bestVendorForTitle(row.title, vendors);
  if (!m) {
    noMatch.push(row);
    continue;
  }
  const vid = m.vendor.id;
  const prev = bestByVendor.get(vid);
  if (!prev || m.score > prev.m.score || (m.score === prev.m.score && row.title.length > prev.row.title.length)) {
    bestByVendor.set(vid, { row, m });
  }
}

const changes = [];
const unchanged = [];

for (const { row, m } of bestByVendor.values()) {
  const v = m.vendor;
  const prev = v.logo_url || '';
  if (prev === row.image) {
    unchanged.push({ title: row.title, vendorId: v.id, slug: v.slug });
    continue;
  }
  if (!DRY) {
    const { error } = await supabase.from('vendors').update({ logo_url: row.image }).eq('id', v.id);
    if (error) {
      console.error('Update failed', v.id, error.message);
      continue;
    }
  }
  changes.push({
    csvTitle: row.title,
    vendorId: v.id,
    vendorName: v.name,
    slug: v.slug,
    listingPath: `/listing/${v.id}`,
    matchScore: m.score,
    previousLogoUrl: prev || null,
    newLogoUrl: row.image,
  });
}

const reportPath = path.join(
  __dirname,
  '..',
  'data',
  `weedmaps-csv-logo-import-${path.basename(csvPath, path.extname(csvPath))}-${DRY ? 'dry-run' : 'applied'}.json`
);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      csvPath,
      dryRun: DRY,
      region: region || null,
      updatedCount: changes.length,
      changes,
      unchangedCount: unchanged.length,
      skippedPlaceholder: skipped.length,
      noMatchCount: noMatch.length,
      noMatchSample: noMatch.slice(0, 40),
    },
    null,
    2
  ),
  'utf8'
);

function trunc(s, n) {
  if (!s) return s;
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

console.log('\n--- Listings updated (logo_url) ---\n');
for (const c of changes) {
  console.log(
    `${c.vendorName} | ${c.listingPath} | score ${c.matchScore}\n  was: ${trunc(c.previousLogoUrl || '(empty)', 90)}\n  now: ${trunc(c.newLogoUrl, 110)}\n`
  );
}
console.log(`\nWrote ${reportPath}`);
console.log(
  `Summary: updated ${changes.length}, unchanged (same URL) ${unchanged.length}, no match ${noMatch.length}, skipped placeholder ${skipped.length}${DRY ? ' (dry-run — no DB writes)' : ''}`
);
