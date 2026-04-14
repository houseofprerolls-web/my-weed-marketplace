import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireMasterOutreachAuth } from '@/lib/masterOutreachRequest';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { betterUlsPremiseKind, normalizeFlexibleOutreachRow } from '@/lib/outreachNormalize';

type NormalizedImportRow = {
  email: string;
  person_name: string | null;
  company_name: string | null;
  phone: string | null;
  notes: string | null;
  uls_premise_kind: 'storefront' | 'delivery' | 'unknown';
};

function mergeImportNotes(a: string | null, b: string | null): string | null {
  const parts = [a, b].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  if (parts.length === 0) return null;
  const trimmed = parts.map((p) => p.trim());
  const unique: string[] = [];
  for (const t of trimmed) {
    if (!unique.includes(t)) unique.push(t);
  }
  return unique.join(' | ');
}

/** Same email on multiple CSV rows → one contact; merge license notes, last row wins empty fields. */
function mergeRowsByEmail(rows: NormalizedImportRow[]): NormalizedImportRow[] {
  const map = new Map<string, NormalizedImportRow>();
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
        notes: mergeImportNotes(prev.notes, row.notes),
        uls_premise_kind: betterUlsPremiseKind(row.uls_premise_kind, prev.uls_premise_kind),
      });
    }
  }
  const out: NormalizedImportRow[] = [];
  map.forEach((row) => {
    out.push(row);
  });
  return out;
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type ImportBody = {
  rows?: unknown[];
  /** If true, delete all outreach contacts (and send log) before importing. */
  replace_all?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await requireMasterOutreachAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasServiceRoleKey()) {
    return jsonError(503, 'Service role not configured');
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  if (rawRows.length === 0) {
    return jsonError(400, 'rows[] required');
  }
  if (rawRows.length > 8000) {
    return jsonError(400, 'Maximum 8000 rows per request');
  }

  const importBatchId = randomUUID();
  const preMerge: NormalizedImportRow[] = [];
  let skippedInvalid = 0;

  for (const r of rawRows) {
    if (!r || typeof r !== 'object') {
      skippedInvalid++;
      continue;
    }
    const row = normalizeFlexibleOutreachRow(r as Record<string, unknown>);
    if (!row) {
      skippedInvalid++;
      continue;
    }
    preMerge.push(row);
  }

  const normalized = mergeRowsByEmail(preMerge);
  const mergedDuplicateRows = preMerge.length - normalized.length;

  const jsonRows = normalized.map((r) => ({
    email: r.email,
    person_name: r.person_name,
    company_name: r.company_name,
    phone: r.phone ?? '',
    notes: r.notes ?? '',
    uls_premise_kind: r.uls_premise_kind,
  }));

  try {
    const supabase = createServiceRoleClient();

    if (body.replace_all === true) {
      const { error: clearError } = await supabase.rpc('outreach_clear_all_contacts');
      if (clearError) {
        console.warn('outreach_clear_all_contacts RPC failed, using filtered delete:', clearError.message);
        const { error: delErr } = await supabase
          .from('outreach_contacts')
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z');
        if (delErr) {
          console.error(delErr);
          return jsonError(500, delErr.message);
        }
      }
    }

    const { data, error } = await supabase.rpc('outreach_bulk_import', {
      p_batch: importBatchId,
      p_rows: jsonRows,
    });
    if (error) {
      console.error(error);
      return jsonError(500, error.message);
    }
    const summary = (data as { processed?: number; skipped_invalid_email?: number }) || {};
    return NextResponse.json({
      import_batch_id: importBatchId,
      replaced_all: body.replace_all === true,
      processed: typeof summary.processed === 'number' ? summary.processed : normalized.length,
      skipped_invalid_email_in_rpc: summary.skipped_invalid_email ?? 0,
      skipped_invalid_before_rpc: skippedInvalid,
      merged_duplicate_emails_in_file: mergedDuplicateRows,
      unique_emails: normalized.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Import failed';
    return jsonError(500, msg);
  }
}
