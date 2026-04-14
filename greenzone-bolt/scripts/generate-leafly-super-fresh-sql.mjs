/**
 * Reads a Leafly-style web-scraper CSV (columns: data, data2, … data8, image, …) and emits SQL
 * to bulk-insert **every** menu row into `public.products` for the Super Fresh Farms vendor
 * (matched by slug / name — the CSV can be a full dispensary menu, not only SFF-branded lines).
 *
 * Thumbnails: when `image` is an imgix-wrapped URL, decode to direct https://… (no leafly-production host).
 * When there is no scrape image, use the Super Fresh Farms logo placeholder shipped at
 * `public/images/vendors/super-fresh-farms/sff-menu-placeholder.png`.
 *
 * Duplicate product titles get suffixed " (2)", " (3)", … so inserts stay unique-friendly.
 *
 * Usage:
 *   node scripts/generate-leafly-super-fresh-sql.mjs "C:/path/to/menu-export.csv"
 *
 * Writes: supabase/migrations/0216_super_fresh_farms_leafly_delivery_skus.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outSql = path.join(repoRoot, 'supabase', 'migrations', '0216_super_fresh_farms_leafly_delivery_skus.sql');

/** Public URL; file: greenzone-bolt/public/images/vendors/super-fresh-farms/sff-menu-placeholder.png */
const MENU_PLACEHOLDER = '/images/vendors/super-fresh-farms/sff-menu-placeholder.png';

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('Usage: node scripts/generate-leafly-super-fresh-sql.mjs <path-to-leafly.csv>');
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, 'utf8');
const rawRows = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
const rows = rawRows.map((row) => {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    o[k.replace(/^\ufeff/, '')] = v;
  }
  return o;
});

function sqlStr(s) {
  const t = String(s ?? '')
    .replace(/'/g, "''")
    .replace(/\u2019/g, "''")
    .replace(/\u2018/g, "''");
  return "'" + t + "'";
}

/** Strip imgix wrapper; keep stable https URL without query noise. */
function menuImageStorageUrl(imgixOrUrl) {
  const s = String(imgixOrUrl ?? '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.pathname.length > 1) {
      const inner = decodeURIComponent(u.pathname.slice(1));
      if (inner.startsWith('http')) return inner.split('?')[0];
    }
  } catch {
    /* fall through */
  }
  if (s.startsWith('http')) return s.split('?')[0];
  return null;
}

function firstDollarCell(row) {
  for (const key of ['data3', 'data15']) {
    const m = String(row[key] ?? '').match(/\$[\d,]+\.?\d*/);
    if (m) return m[0];
  }
  return null;
}

function priceToCents(cell) {
  if (!cell) return null;
  const n = Number(cell.replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function potencyPercent(data2) {
  const s = String(data2 ?? '');
  const m = s.match(/([\d.]+)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function leaflyTypeToCategory(data7) {
  const s = String(data7 ?? '').toLowerCase();
  if (s.includes('cartridge') || s.includes('vape')) return 'vape';
  if (s.includes('edible')) return 'edible';
  if (s.includes('preroll') || s.includes('pre-roll')) return 'preroll';
  if (s.includes('concentrate')) return 'concentrate';
  if (s.includes('topical')) return 'topical';
  if (s.includes('flower')) return 'flower';
  if (s.trim() === 'flower') return 'flower';
  return 'other';
}

const IMPORT_TAG = 'Super Fresh Farms menu seed 2026-04-13 (delivery SKUs, editable).';

const nameCounts = new Map();

function disambiguatedName(rawName) {
  const base = String(rawName ?? '').trim().replace(/^[-–—]\s*/, '');
  if (!base) return '';
  const k = base.toLowerCase();
  const n = (nameCounts.get(k) || 0) + 1;
  nameCounts.set(k, n);
  if (n === 1) return base;
  return `${base} (${n})`;
}

const out = [];

for (const row of rows) {
  const name = disambiguatedName(row.data);
  if (!name) continue;

  const category = leaflyTypeToCategory(row.data7);
  const cents = priceToCents(firstDollarCell(row));
  if (cents == null) continue;

  const thc = potencyPercent(row.data2);
  const direct = menuImageStorageUrl(row.image);

  let desc = IMPORT_TAG;
  const brandLine = String(row.data8 ?? '').trim();
  if (brandLine) desc += ` ${brandLine}.`;
  const thcLine = String(row.data2 ?? '').trim();
  if (thcLine && !/^thc\s*[-–—]?\s*$/i.test(thcLine)) desc += ` ${thcLine}.`;

  out.push({
    name,
    category,
    price_cents: cents,
    potency_thc: thc,
    description: desc,
    imageUrl: direct ?? MENU_PLACEHOLDER,
  });
}

if (out.length === 0) {
  console.error('No importable rows (need product name + price in data / data3).');
  process.exit(1);
}

const valueRows = out
  .map((r) => {
    const pct = r.potency_thc == null ? 'null::numeric' : `${r.potency_thc}::numeric`;
    return `      (${sqlStr(r.name)}, ${sqlStr(r.category)}, ${r.price_cents}, ${pct}, ${sqlStr(r.description)}, ${sqlStr(r.imageUrl)})`;
  })
  .join(',\n');

const sql = `-- Super Fresh Farms vendor: bulk menu import from Leafly-format CSV (${out.length} SKUs in this export).
-- Re-run safe: deletes prior rows with the same seed marker for this vendor, then inserts.
--
-- Images: decodable scrape URL, else Super Fresh Farms logo \`/images/vendors/super-fresh-farms/sff-menu-placeholder.png\`.
-- After insert: set menu_source_mode to \`manual\` so POS-only filtering does not hide these SKUs.

do $body$
declare
  v_id uuid;
begin
  select v.id into v_id
  from public.vendors v
  where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
     or lower(v.name) like '%super%fresh%farm%'
  order by case when lower(v.slug) = 'super-fresh-farms' then 0 when lower(v.slug) = 'superfresh-farms' then 1 else 2 end
  limit 1;

  if v_id is null then
    raise exception '0216: No vendor found for Super Fresh Farms (slug super-fresh-farms / name match).';
  end if;

  delete from public.products p
  where p.vendor_id = v_id
    and p.description is not null
    and (
      p.description like '%Leafly import 2026-04-13%'
      or p.description like '%Super Fresh Farms menu seed 2026-04-13%'
    );

  insert into public.products (
    vendor_id,
    name,
    category,
    price_cents,
    inventory_count,
    in_stock,
    potency_thc,
    potency_cbd,
    description,
    images
  )
  select
    v_id,
    t.name,
    t.category,
    t.price_cents,
    0,
    true,
    t.potency_thc,
    null,
    t.description,
    case
      when t.image_url is not null and length(trim(t.image_url)) > 0
        then array[trim(t.image_url)]::text[]
      else '{}'::text[]
    end
  from (
    values
${valueRows}
  ) as t(name, category, price_cents, potency_thc, description, image_url);

  if to_regclass('public.vendor_menu_settings') is not null then
    insert into public.vendor_menu_settings (vendor_id, menu_source_mode)
    values (v_id, 'manual')
    on conflict (vendor_id) do update
      set menu_source_mode = excluded.menu_source_mode,
          updated_at = now();
  end if;
end;
$body$;
`;

fs.writeFileSync(outSql, sql, 'utf8');
console.log(`Wrote ${out.length} products → ${outSql}`);
