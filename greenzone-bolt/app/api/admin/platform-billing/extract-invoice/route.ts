import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import {
  extractFromImageBuffer,
  extractFromPdfBuffer,
  type PlatformInvoiceExtractResult,
} from '@/lib/platformInvoiceExtract';

const BUCKET = 'platform-billing-invoices';
const MAX_BYTES = 10 * 1024 * 1024;

const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase env' }, { status: 500 });
    }
    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!hasServiceRoleKey()) {
      return NextResponse.json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
    }

    const db = createServiceRoleClient();
    const ct = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let mimeType: string;

    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: 'file field required' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
      mimeType = (file as File).type || 'application/octet-stream';
      if (!allowedMime.has(mimeType)) {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
    } else {
      const body = (await request.json().catch(() => null)) as { account_id?: string } | null;
      const accountId = String(body?.account_id || '').trim();
      if (!accountId) {
        return NextResponse.json({ error: 'account_id required (or send multipart with file)' }, { status: 400 });
      }
      const { data: acc, error: accErr } = await db
        .from('platform_billing_accounts')
        .select('invoice_storage_path')
        .eq('id', accountId)
        .maybeSingle();
      if (accErr || !acc) {
        return NextResponse.json({ error: 'Billing account not found' }, { status: 404 });
      }
      const path = (acc as { invoice_storage_path: string | null }).invoice_storage_path?.trim();
      if (!path) {
        return NextResponse.json({ error: 'No invoice file on this account' }, { status: 400 });
      }
      const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(path);
      if (dlErr || !blob) {
        return NextResponse.json({ error: 'Could not download invoice file' }, { status: 500 });
      }
      const ab = await blob.arrayBuffer();
      buffer = Buffer.from(ab);
      mimeType = mimeFromPath(path);
      if (!allowedMime.has(mimeType)) {
        return NextResponse.json({ error: 'Stored file type not supported for extraction' }, { status: 400 });
      }
      if (buffer.length > MAX_BYTES) {
        return NextResponse.json({ error: 'Stored file too large' }, { status: 400 });
      }
    }

    let result: PlatformInvoiceExtractResult;
    if (mimeType === 'application/pdf') {
      result = await extractFromPdfBuffer(buffer);
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
      result = await extractFromImageBuffer(buffer, mimeType);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/admin/platform-billing/extract-invoice', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
