/**
 * Clear all outreach_contacts (and sends) and import ULS CSV(s).
 *
 * Run from greenzone-bolt/:
 *   npm run outreach:replace-csv
 *   npm run outreach:replace-csv -- "C:\\path\\delivery.csv" "C:\\path\\storefront.csv"
 *
 * Default: Downloads `uls-export-04-10-2026.csv` (non-storefront / delivery) then
 * `uls-export-04-10-2026 (1).csv` (storefront `Commercial - Retailer`). Same email in
 * both → premise_kind prefers storefront.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Requires migrations through 0189 (uls_premise_kind + bulk_import).
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { parseOutreachCsv } from '../lib/outreachCsvParse';
import { betterUlsPremiseKind, normalizeFlexibleOutreachRow } from '../lib/outreachNormalize';

function loadEnvLocal(dir: string) {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const k = m[1];
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    return;
  }
}

type Norm = NonNullable<ReturnType<typeof normalizeFlexibleOutreachRow>>;

function mergeNotes(a: string | null, b: string | null): string | null {
  const parts = [a, b].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  if (parts.length === 0) return null;
  const trimmed = parts.map((p) => p.trim());
  const unique: string[] = [];
  for (const t of trimmed) {
    if (!unique.includes(t)) unique.push(t);
  }
  return unique.join(' | ');
}

function mergeByEmail(rows: Norm[]): Norm[] {
  const map = new Map<string, Norm>();
  for (const row of rows) {
    const prev = map.get(row.email);
    if (!prev) {
      map.set(row.email, { ...row });
    } else {
      map.set(row.email, {
        email: row.email,
        person_name: row.person_name ?? prev.person_name,
        company_name: row.company_name ?? prev.company_name,
        phone: row.phone ?? prev.phone,
        notes: mergeNotes(prev.notes, row.notes),
        uls_premise_kind: betterUlsPremiseKind(row.uls_premise_kind, prev.uls_premise_kind),
      });
    }
  }
  const out: Norm[] = [];
  map.forEach((r) => out.push(r));
  return out;
}

function cellsToObject(headers: string[], cells: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  headers.forEach((h, i) => {
    o[h] = (cells[i] ?? '').trim();
  });
  return o;
}

async function main() {
  const cwd = process.cwd();
  loadEnvLocal(cwd);

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const downloads = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
  const defaultPaths = [
    path.join(downloads, 'uls-export-04-10-2026.csv'),
    path.join(downloads, 'uls-export-04-10-2026 (1).csv'),
  ];
  const argvPaths = process.argv.slice(2).filter((a) => a.trim().length > 0);
  const csvPaths =
    argvPaths.length > 0
      ? argvPaths.map((p) => path.resolve(p))
      : defaultPaths.filter((p) => fs.existsSync(p));

  if (csvPaths.length === 0) {
    console.error('No CSV files found. Pass paths or place defaults in Downloads:');
    defaultPaths.forEach((p) => console.error('  -', p));
    process.exit(1);
  }

  const preMerge: Norm[] = [];
  let skipped = 0;
  for (const csvPath of csvPaths) {
    if (!fs.existsSync(csvPath)) {
      console.error('CSV not found:', csvPath);
      process.exit(1);
    }
    const text = fs.readFileSync(csvPath, 'utf8');
    const { headers, rows, delimiter } = parseOutreachCsv(text);
    if (headers.length === 0) {
      console.error('No headers in CSV:', csvPath);
      process.exit(1);
    }
    console.log(
      '\nFile:',
      csvPath,
      '| delimiter:',
      delimiter === '\t' ? 'tab' : delimiter,
      '| columns:',
      headers.length,
      '| rows:',
      rows.length
    );
    for (const cells of rows) {
      const raw = cellsToObject(headers, cells);
      const row = normalizeFlexibleOutreachRow(raw);
      if (!row) {
        skipped++;
        continue;
      }
      preMerge.push(row);
    }
  }

  const normalized = mergeByEmail(preMerge);
  const kindCounts = { storefront: 0, delivery: 0, unknown: 0 };
  for (const r of normalized) {
    kindCounts[r.uls_premise_kind]++;
  }
  console.log('Valid rows:', preMerge.length, '| Unique emails:', normalized.length, '| Skipped (no email):', skipped);
  console.log('ULS premise kind (from licenseType):', kindCounts);

  const importBatchId = randomUUID();
  const jsonRows = normalized.map((r) => ({
    email: r.email,
    person_name: r.person_name,
    company_name: r.company_name,
    phone: r.phone ?? '',
    notes: r.notes ?? '',
    uls_premise_kind: r.uls_premise_kind,
  }));

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let { error: clearError } = await supabase.rpc('outreach_clear_all_contacts');
  if (clearError) {
    console.warn('outreach_clear_all_contacts RPC failed:', clearError.message);
    console.warn('Trying filtered delete (apply migration 0188_outreach_clear_truncate.sql for TRUNCATE-based clear)…');
    const { error: delErr } = await supabase
      .from('outreach_contacts')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');
    if (delErr) {
      console.error('Delete fallback failed:', delErr.message);
      process.exit(1);
    }
  }
  console.log('Cleared existing outreach contacts.');

  const CHUNK = 500;
  let totalProcessed = 0;
  for (let i = 0; i < jsonRows.length; i += CHUNK) {
    const chunk = jsonRows.slice(i, i + CHUNK);
    const { data, error } = await supabase.rpc('outreach_bulk_import', {
      p_batch: importBatchId,
      p_rows: chunk,
    });
    if (error) {
      console.error('outreach_bulk_import failed:', error.message);
      process.exit(1);
    }
    const summary = (data as { processed?: number; skipped_invalid_email?: number }) || {};
    totalProcessed += summary.processed ?? chunk.length;
    if ((summary.skipped_invalid_email ?? 0) > 0) {
      console.warn('Chunk skipped invalid emails:', summary.skipped_invalid_email);
    }
    console.log(`Imported chunk ${i / CHUNK + 1} (${chunk.length} rows)…`);
  }

  console.log('Done. import_batch_id:', importBatchId, '| processed ~', totalProcessed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
