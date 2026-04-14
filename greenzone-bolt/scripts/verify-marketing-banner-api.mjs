/**
 * Smoke-test GET /api/public/marketing-banners for every placement and optionally HEAD local image paths.
 * Run with dev server up: VERIFY_MARKETING_BANNERS_URL=http://127.0.0.1:3000 node scripts/verify-marketing-banner-api.mjs
 */
const BASE = (process.env.VERIFY_MARKETING_BANNERS_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const PLACEMENTS = [
  'homepage_hero',
  'smokers_club_strip',
  'discover_top',
  'discover_mid',
  'deals',
  'dispensaries',
  'map',
  'feed',
];
const ZIP5 = process.env.VERIFY_MARKETING_BANNERS_ZIP5 || '90210';

async function main() {
  let failed = false;
  for (const placement of PLACEMENTS) {
    const url = `${BASE}/api/public/marketing-banners?placement=${encodeURIComponent(placement)}&zip5=${ZIP5}`;
    let res;
    try {
      res = await fetch(url, { cache: 'no-store' });
    } catch (e) {
      console.error('FETCH_FAIL', placement, String(e?.message || e));
      failed = true;
      continue;
    }
    if (!res.ok) {
      console.error('API_STATUS', placement, res.status);
      failed = true;
      continue;
    }
    const j = await res.json().catch(() => ({}));
    if (j.error && j.error !== 'supabase_not_configured') {
      console.warn('API_BODY_ERROR', placement, j.error);
    }
    const rows = Array.isArray(j.rows) ? j.rows : [];
    for (const row of rows) {
      const u = row.image_url;
      if (typeof u !== 'string' || !u.trim()) {
        console.error('EMPTY_IMAGE_URL', placement, row.id);
        failed = true;
        continue;
      }
      if (u.startsWith('/')) {
        const abs = `${BASE}${u}`;
        try {
          const h = await fetch(abs, { method: 'HEAD' });
          if (!h.ok) {
            console.error('LOCAL_ASSET_HEAD', placement, abs, h.status);
            failed = true;
          }
        } catch (e) {
          console.error('LOCAL_ASSET_FAIL', placement, abs, String(e?.message || e));
          failed = true;
        }
      }
    }
  }
  if (!failed) {
    console.log('OK: marketing-banners API + local asset HEAD checks');
  }
  process.exit(failed ? 1 : 0);
}

main();
