/**
 * Validates Supabase env shape and optionally hits REST (no secrets printed).
 * Usage: node scripts/verify-supabase-keys.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function jwtPayload(jwt) {
  try {
    const part = jwt.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

const env = {
  ...parseEnvFile(path.join(root, '.env')),
  ...parseEnvFile(path.join(root, '.env.local')),
};

const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const anon = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const svc = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const refFromUrl = (url.match(/^https?:\/\/([^.]+)\.supabase\.co\/?$/i) || [])[1];
const anonP = jwtPayload(anon);
const svcP = jwtPayload(svc);

const report = {
  hasUrl: Boolean(url),
  hasAnonKey: Boolean(anon),
  hasServiceRoleKey: Boolean(svc),
  urlHostPatternOk: /^https:\/\/[^/]+\.supabase\.co\/?$/i.test(url),
  urlProjectRef: refFromUrl || null,
  anonJwtProjectRef: anonP?.ref || null,
  anonJwtRole: anonP?.role || null,
  serviceJwtProjectRef: svcP?.ref || null,
  serviceJwtRole: svcP?.role || null,
  anonRefMatchesUrl: Boolean(refFromUrl && anonP?.ref === refFromUrl),
  serviceRefMatchesUrl: Boolean(refFromUrl && svcP?.ref === refFromUrl),
  anonRoleIsAnon: anonP?.role === 'anon',
  serviceRoleIsService: svcP?.role === 'service_role',
};

console.log('Static checks (no keys shown):\n', JSON.stringify(report, null, 2));

if (!report.hasUrl || !report.hasAnonKey) {
  console.error('\nFAIL: Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

if (!report.urlHostPatternOk || !report.anonRefMatchesUrl) {
  console.error('\nFAIL: Anon key JWT ref does not match URL project ref (wrong project or typo).');
  process.exit(1);
}

if (!report.anonRoleIsAnon) {
  console.error('\nFAIL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not an anon key (role should be "anon").');
  process.exit(1);
}

if (svc && (!report.serviceRefMatchesUrl || !report.serviceRoleIsService)) {
  console.error('\nFAIL: SUPABASE_SERVICE_ROLE_KEY is set but does not match URL or is not service_role.');
  process.exit(1);
}

const restUrl = `${url.replace(/\/$/, '')}/rest/v1/strains?select=id&limit=1`;
const res = await fetch(restUrl, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  },
});

const bodySnippet = await res.text();
const ok = res.ok || res.status === 206;
console.log('\nREST probe GET /rest/v1/strains?select=id&limit=1');
console.log('  status:', res.status, ok ? '(ok)' : '(error)');

if (!ok) {
  console.error('  body (truncated):', bodySnippet.slice(0, 400));
  let parsed;
  try {
    parsed = JSON.parse(bodySnippet);
  } catch {
    parsed = null;
  }
  if (res.status === 401 || res.status === 403) {
    console.error('\nFAIL: Anon key or JWT is invalid / not accepted for this project.');
    process.exit(1);
  }
  if (parsed?.code === '42P17' || /infinite recursion/i.test(parsed?.message || bodySnippet)) {
    console.error(
      '\nKeys look valid, but Postgres reported RLS infinite recursion. Apply the repo `supabase/migrations/` chain through at least `0120_rls_remove_inline_profiles_vendors_recursion.sql` (after 0116–0119) on this project — SQL Editor or `supabase db push`.'
    );
    process.exit(2);
  }
  console.error('\nFAIL: Request failed (see body). If not 401/403, this is often RLS/schema, not a wrong anon key.');
  process.exit(1);
}

console.log('\nOK: URL, anon JWT ref, and live REST read look consistent.');
if (svc) console.log('OK: Service role key present and matches same project ref.');
else
  console.log(
    'Note: SUPABASE_SERVICE_ROLE_KEY not set — add in .env.local for server directory APIs and admin dashboard (/api/admin/*).'
  );

// Homepage carousel: anon must read active banners + listing_markets (region matching).
const bannerUrl = `${url.replace(/\/$/, '')}/rest/v1/marketing_banner_slides?select=id&status=eq.active&limit=1`;
const bannerRes = await fetch(bannerUrl, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
});
console.log('\nREST probe GET marketing_banner_slides (active, limit 1)');
console.log('  status:', bannerRes.status, bannerRes.ok || bannerRes.status === 206 ? '(ok)' : '(error)');
if (!bannerRes.ok && bannerRes.status !== 206) {
  const t = await bannerRes.text();
  console.error('  body (truncated):', t.slice(0, 300));
  console.error(
    '  Hint: apply supabase/migrations through 0167_marketing_banner_slides.sql (public SELECT on active rows).'
  );
}

const lmUrl = `${url.replace(/\/$/, '')}/rest/v1/listing_markets?select=id,region_key&limit=1`;
const lmRes = await fetch(lmUrl, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
});
console.log('\nREST probe GET listing_markets (id, region_key, limit 1)');
console.log('  status:', lmRes.status, lmRes.ok || lmRes.status === 206 ? '(ok)' : '(error)');
if (!lmRes.ok && lmRes.status !== 206) {
  const t = await lmRes.text();
  console.error('  body (truncated):', t.slice(0, 300));
  console.error(
    '  Hint: apply supabase/migrations/0161_listing_markets_public_select.sql for storefront ZIP/region resolution and banner region keys.'
  );
}

console.log(
  '\nTip: run `npm run verify:banner-assets` in greenzone-bolt to ensure /public files match DB image_url paths (200 in browser).'
);
