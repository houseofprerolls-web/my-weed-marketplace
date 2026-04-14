/**
 * Backfill storefront retailer logos → Supabase `mirrored-images` → `vendors.logo_url`.
 *
 * Sources (first hit wins):
 *   1) Google Places (New) Text Search + Place Photo — set GOOGLE_PLACES_API_KEY (best for storefronts).
 *   2) Clearbit Logo API — https://logo.clearbit.com/{domain} (needs vendors.website).
 *   3) Google favicon service — sz=128.
 *   4) DuckDuckGo IP icon — .ico (needs website host).
 *
 * You are responsible for licensing / ToS for images you store. Prefer official vendor websites
 * and Google Places when billing is enabled.
 *
 * Usage:
 *   node scripts/fetch-vendor-logos.mjs [--dry-run] [--limit=N] [--force]
 *
 * Env (from .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_API_KEY (optional, strongly recommended for real logos)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { mirrorRemoteToStorage, normalizeRemoteImageUrl } from './lib/mirrorImageToStorage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parseEnvFile(p) {
  try {
    const text = fs.readFileSync(p, 'utf8');
    return text.split(/\r?\n/).reduce((o, line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return o;
      const i = t.indexOf('=');
      if (i < 1) return o;
      const k = t.slice(0, i);
      let v = t.slice(i + 1);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      o[k] = v;
      return o;
    }, {});
  } catch {
    return {};
  }
}

function hostnameFromWebsite(w) {
  try {
    let u = String(w || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const host = new URL(u).hostname.toLowerCase();
    return host.replace(/^www\./, '') || '';
  } catch {
    return '';
  }
}

function needsLogo(logoUrl) {
  const s = String(logoUrl || '').trim();
  return !s;
}

async function headOkImage(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DaTreehouseLogoBot/1.0; +https://datreehouse.com)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** @returns {Promise<string|null>} image URL to mirror */
async function resolveLogoImageUrl(vendor, placesKey) {
  const { name, city, state, address, website } = vendor;
  const host = hostnameFromWebsite(website);

  if (placesKey) {
    const parts = [name, address, city, state].filter(Boolean).join(' ');
    const textQuery = `${parts} cannabis dispensary`.replace(/\s+/g, ' ').trim();
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': placesKey,
          'X-Goog-FieldMask': 'places.photos,places.displayName',
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 5,
          languageCode: 'en',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const places = data.places || [];
        for (const p of places) {
          const ph = p.photos?.[0];
          if (ph?.name) {
            const mediaApi = `https://places.googleapis.com/v1/${ph.name}/media?maxHeightPx=512&maxWidthPx=512&key=${encodeURIComponent(placesKey)}`;
            return mediaApi;
          }
        }
      } else {
        const t = await res.text();
        console.warn(`  Places search ${res.status}: ${t.slice(0, 120)}`);
      }
    } catch (e) {
      console.warn(`  Places search error: ${e?.message || e}`);
    }
    await sleep(250);
  }

  if (host) {
    const clearbit = `https://logo.clearbit.com/${host}`;
    const b = await headOkImage(clearbit);
    if (b) return clearbit;
    await sleep(100);

    const gFav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
    const b2 = await headOkImage(gFav);
    if (b2) return gFav;
    await sleep(100);

    const ddg = `https://icons.duckduckgo.com/ip3/${host}.ico`;
    const b3 = await headOkImage(ddg);
    if (b3) return ddg;
  }

  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : null;

  const fileEnv = {
    ...parseEnvFile(path.join(root, '.env.local')),
    ...parseEnvFile(path.join(root, '.env')),
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL || fileEnv.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY || fileEnv.GOOGLE_PLACES_API_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
    process.exit(1);
  }

  if (!placesKey) {
    console.warn('No GOOGLE_PLACES_API_KEY — only website-based logos (Clearbit / favicons) will be tried.\n');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from('vendors')
    .select('id,name,city,state,zip,address,website,logo_url,offers_storefront,license_status,is_live')
    .eq('offers_storefront', true)
    .eq('license_status', 'approved')
    .eq('is_live', true);

  if (error) {
    console.error('vendors select:', error.message);
    process.exit(1);
  }

  let candidates = (rows || []).filter((v) => force || needsLogo(v.logo_url));
  if (limit) candidates = candidates.slice(0, limit);

  console.log(`Storefront + approved + live: ${(rows || []).length} rows; to process: ${candidates.length}${dryRun ? ' (dry-run)' : ''}\n`);

  const urlCache = new Map();
  let ok = 0;
  let fail = 0;

  for (const v of candidates) {
    const label = `${v.name || v.id} (${v.city || '?'})`;
    const imageUrl = await resolveLogoImageUrl(v, placesKey);
    if (!imageUrl) {
      console.log(`— ${label}: no remote logo found`);
      fail++;
      continue;
    }

    const normalized = normalizeRemoteImageUrl(imageUrl);
    if (!normalized) {
      fail++;
      continue;
    }

    if (dryRun) {
      console.log(`✓ ${label}: would use ${normalized.slice(0, 100)}…`);
      ok++;
      continue;
    }

    const objectPath = `vendor-logos/${v.id}.png`;
    let publicUrl;
    try {
      publicUrl = await mirrorRemoteToStorage(supabase, supabaseUrl, normalized, objectPath, {
        urlCache,
        strict: false,
        force,
      });
    } catch (e) {
      console.warn(`✗ ${label}: mirror failed ${e?.message || e}`);
      fail++;
      continue;
    }

    if (!publicUrl || publicUrl === normalized) {
      console.warn(`✗ ${label}: mirror returned original / empty`);
      fail++;
      continue;
    }

    const { error: upErr } = await supabase.from('vendors').update({ logo_url: publicUrl }).eq('id', v.id);
    if (upErr) {
      console.warn(`✗ ${label}: DB update failed ${upErr.message}`);
      fail++;
      continue;
    }

    console.log(`✓ ${label}: ${publicUrl}`);
    ok++;
    await sleep(placesKey ? 400 : 150);
  }

  console.log(`\nDone. ok=${ok} failed=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
