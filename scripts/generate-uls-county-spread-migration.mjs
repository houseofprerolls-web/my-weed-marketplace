/**
 * Writes supabase/migrations/0069_uls_vendors_county_spread_locations.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZIP_COUNTY_BBOX } from './caCountyZipBbox.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const vals = Object.entries(ZIP_COUNTY_BBOX)
  .map(
    ([zip, b]) =>
      `  ('${zip}', ${b.minLat}::double precision, ${b.maxLat}::double precision, ${b.minLng}::double precision, ${b.maxLng}::double precision)`
  )
  .join(',\n');

const sql = `/*
  Spread ULS directory delivery pins inside approximate CA county bounds (by seed ZIP).
  Deterministic per vendor id so markers stay stable. Does not use exact parcel locations.
*/

with county_zip_bounds (zip, min_lat, max_lat, min_lng, max_lng) as (
  values
${vals}
)
update public.vendors v
set location = st_setsrid(
  st_makepoint(
    cb.min_lng
      + (cb.max_lng - cb.min_lng)
      * (0.05 + 0.90 * ((abs(hashtext(v.id::text || ':uls-spread-lng'))::bigint % 999983)::numeric / 999983.0)),
    cb.min_lat
      + (cb.max_lat - cb.min_lat)
      * (0.05 + 0.90 * ((abs(hashtext(v.id::text || ':uls-spread-lat'))::bigint % 999983)::numeric / 999983.0))
  ),
  4326
)::geography
from county_zip_bounds cb
where v.slug like 'ca-uls-%'
  and v.zip = cb.zip;
`;

const out = path.join(repoRoot, 'supabase', 'migrations', '0069_uls_vendors_county_spread_locations.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log('Wrote', out);
