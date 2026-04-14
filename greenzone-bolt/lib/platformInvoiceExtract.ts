import OpenAI from 'openai';

export type InvoiceExtractSource = 'regex' | 'openai_text' | 'openai_vision' | 'none';

export type PlatformInvoiceExtractResult = {
  amount_cents: number | null;
  due_day_of_month: number | null;
  due_date_iso: string | null;
  invoice_number: string | null;
  source: InvoiceExtractSource;
  note?: string;
};

function clampDueDay(day: number): number {
  if (!Number.isFinite(day)) return 15;
  return Math.min(28, Math.max(1, Math.round(day)));
}

function parseMoneyToCents(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 99_999_999.99) return null;
  return Math.round(n * 100);
}

/** Pick plausible USD amounts from invoice-like text (heuristic). */
export function heuristicExtractFromInvoiceText(text: string): Partial<PlatformInvoiceExtractResult> {
  const flat = text.replace(/\r/g, '\n');
  let amount_cents: number | null = null;

  const labeled = flat.match(
    /(?:total\s*due|amount\s*due|balance\s*due|amount\s*owing|pay\s*this\s*amount|grand\s*total|total\s*amount)[:\s]*\$?\s*([\d,]+\.?\d*)/i
  );
  if (labeled?.[1]) {
    const cents = parseMoneyToCents(labeled[1].includes('.') ? labeled[1] : `${labeled[1]}.00`);
    if (cents != null) amount_cents = cents;
  }

  if (amount_cents == null) {
    const dollarMatches = Array.from(flat.matchAll(/\$\s*([\d,]+\.\d{2})\b/g)).map((m) =>
      parseMoneyToCents(m[1]!)
    );
    const nums = dollarMatches.filter((x): x is number => x != null);
    if (nums.length) amount_cents = Math.max(...nums);
  }

  let due_date_iso: string | null = null;
  const iso = flat.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    due_date_iso = `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  if (!due_date_iso) {
    const mdy = flat.match(
      /\b(?:due|pay\s*by|payment\s*due)[^\d]{0,24}(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/i
    );
    if (mdy) {
      const mm = mdy[1]!.padStart(2, '0');
      const dd = mdy[2]!.padStart(2, '0');
      due_date_iso = `${mdy[3]}-${mm}-${dd}`;
    }
  }
  if (!due_date_iso) {
    const dmy = flat.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
    if (dmy) {
      const mm = dmy[1]!.padStart(2, '0');
      const dd = dmy[2]!.padStart(2, '0');
      due_date_iso = `${dmy[3]}-${mm}-${dd}`;
    }
  }

  let due_day_of_month: number | null = null;
  if (due_date_iso) {
    const parts = due_date_iso.split('-');
    const d = Number.parseInt(parts[2] || '', 10);
    if (Number.isFinite(d)) due_day_of_month = clampDueDay(d);
  }

  let invoice_number: string | null = null;
  const inv = flat.match(/\b(?:invoice|inv\.?|invoice\s*#)\s*[#:]?\s*([A-Za-z0-9-]{4,32})\b/i);
  if (inv?.[1]) invoice_number = inv[1].trim();

  const source: InvoiceExtractSource =
    amount_cents != null || due_date_iso != null || invoice_number != null ? 'regex' : 'none';

  return {
    amount_cents,
    due_day_of_month,
    due_date_iso,
    invoice_number,
    source,
  };
}

type OpenAIJson = {
  amount_cents?: unknown;
  due_date_iso?: unknown;
  due_day_of_month?: unknown;
  invoice_number?: unknown;
};

function normalizeOpenAIJson(raw: OpenAIJson): Partial<PlatformInvoiceExtractResult> {
  let amount_cents: number | null = null;
  if (typeof raw.amount_cents === 'number' && Number.isFinite(raw.amount_cents) && raw.amount_cents >= 0) {
    amount_cents = Math.round(raw.amount_cents);
  }

  let due_date_iso: string | null = null;
  if (typeof raw.due_date_iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.due_date_iso.trim())) {
    due_date_iso = raw.due_date_iso.trim();
  }

  let due_day_of_month: number | null = null;
  if (typeof raw.due_day_of_month === 'number' && Number.isFinite(raw.due_day_of_month)) {
    due_day_of_month = clampDueDay(raw.due_day_of_month);
  } else if (due_date_iso) {
    const d = Number.parseInt(due_date_iso.slice(8, 10), 10);
    if (Number.isFinite(d)) due_day_of_month = clampDueDay(d);
  }

  let invoice_number: string | null = null;
  if (typeof raw.invoice_number === 'string' && raw.invoice_number.trim()) {
    invoice_number = raw.invoice_number.trim().slice(0, 64);
  }

  return { amount_cents, due_date_iso, due_day_of_month, invoice_number };
}

const SYSTEM_PROMPT =
  'You extract billing fields from invoice content. Reply with ONLY valid JSON, no markdown: {"amount_cents":number|null,"due_date_iso":"YYYY-MM-DD"|null,"due_day_of_month":number|null,"invoice_number":string|null}. amount_cents is total amount due in USD whole cents (integer). due_day_of_month is calendar day 1-28 for recurring monthly due day; derive from due_date_iso if present. Use null for unknown fields.';

async function extractWithOpenAIText(invoiceText: string): Promise<Partial<PlatformInvoiceExtractResult>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: invoiceText.slice(0, 14_000) },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return {};
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(jsonText) as OpenAIJson;
    return normalizeOpenAIJson(parsed);
  } catch {
    return {};
  }
}

async function extractWithOpenAIVision(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<Partial<PlatformInvoiceExtractResult>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const client = new OpenAI({ apiKey });
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract billing fields from this invoice image.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return {};
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(jsonText) as OpenAIJson;
    return normalizeOpenAIJson(parsed);
  } catch {
    return {};
  }
}

export async function extractFromPdfBuffer(buffer: Buffer): Promise<PlatformInvoiceExtractResult> {
  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  const text = typeof parsed.text === 'string' ? parsed.text : '';
  const trimmed = text.trim();

  let merged: PlatformInvoiceExtractResult = {
    amount_cents: null,
    due_day_of_month: null,
    due_date_iso: null,
    invoice_number: null,
    source: 'none',
  };

  if (trimmed.length >= 15) {
    const h = heuristicExtractFromInvoiceText(trimmed);
    merged = {
      amount_cents: h.amount_cents ?? null,
      due_day_of_month: h.due_day_of_month ?? null,
      due_date_iso: h.due_date_iso ?? null,
      invoice_number: h.invoice_number ?? null,
      source: h.source === 'regex' ? 'regex' : 'none',
    };
  }

  const needAmount = merged.amount_cents == null;
  const needDue = merged.due_day_of_month == null;
  if ((needAmount || needDue) && trimmed.length >= 15) {
    try {
      const before = { ...merged };
      const ai = await extractWithOpenAIText(trimmed);
      merged = {
        amount_cents: ai.amount_cents ?? merged.amount_cents,
        due_day_of_month: ai.due_day_of_month ?? merged.due_day_of_month,
        due_date_iso: ai.due_date_iso ?? merged.due_date_iso,
        invoice_number: ai.invoice_number ?? merged.invoice_number,
        source: merged.source,
      };
      const improved =
        (ai.amount_cents != null && before.amount_cents == null) ||
        (ai.due_day_of_month != null && before.due_day_of_month == null) ||
        (ai.invoice_number != null && before.invoice_number == null);
      if (improved) merged.source = 'openai_text';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OpenAI failed';
      if (merged.amount_cents == null && merged.due_day_of_month == null) {
        return {
          ...merged,
          source: 'none',
          note:
            msg.includes('OPENAI_API_KEY') || msg.includes('not configured')
              ? 'No extractable fields found. Set OPENAI_API_KEY on the server for AI extraction, or enter amount and due day manually.'
              : `Could not run AI extraction (${msg}). Enter fields manually.`,
        };
      }
      merged.note = `Partial regex result; AI failed: ${msg}`;
    }
  } else if (trimmed.length < 15) {
    merged.note =
      'Little or no text in this PDF (it may be scanned). Set OPENAI_API_KEY and upload a PNG/JPEG export, or enter fields manually.';
  }

  if (merged.due_day_of_month == null && merged.due_date_iso) {
    const d = Number.parseInt(merged.due_date_iso.slice(8, 10), 10);
    if (Number.isFinite(d)) merged.due_day_of_month = clampDueDay(d);
  }

  return merged;
}

export async function extractFromImageBuffer(
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<PlatformInvoiceExtractResult> {
  try {
    const ai = await extractWithOpenAIVision(buffer.toString('base64'), mimeType);
    return {
      amount_cents: ai.amount_cents ?? null,
      due_day_of_month: ai.due_day_of_month ?? null,
      due_date_iso: ai.due_date_iso ?? null,
      invoice_number: ai.invoice_number ?? null,
      source: 'openai_vision',
      note:
        ai.amount_cents == null && ai.due_day_of_month == null
          ? 'AI could not read this image clearly. Try a sharper photo or enter fields manually.'
          : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OpenAI failed';
    return {
      amount_cents: null,
      due_day_of_month: null,
      due_date_iso: null,
      invoice_number: null,
      source: 'none',
      note:
        msg.includes('OPENAI_API_KEY') || msg.includes('not configured')
          ? 'Set OPENAI_API_KEY on the server to extract from images, or enter fields manually.'
          : `Vision extraction failed: ${msg}`,
    };
  }
}
