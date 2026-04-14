import { detectCsvDelimiter, splitCsvLine } from '@/lib/outreachCsvParse';

export type ParsedMenuCsv = {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, '')
    .replace(/\s+/g, '_');
}

function cellsToRow(headers: string[], cells: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  headers.forEach((h, i) => {
    o[h] = (cells[i] ?? '').trim();
  });
  return o;
}

export function parseMenuCsv(text: string): ParsedMenuCsv {
  const raw = text.replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' };
  const delimiter = detectCsvDelimiter(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((ln) => cellsToRow(headers, splitCsvLine(ln, delimiter)));
  return { headers, rows, delimiter };
}

const PRODUCT_CATEGORIES = new Set([
  'flower',
  'edible',
  'vape',
  'concentrate',
  'topical',
  'preroll',
  'other',
]);

export function normalizeProductCategory(raw: string): string | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  if (PRODUCT_CATEGORIES.has(s)) return s;
  const map: Record<string, string> = {
    flowers: 'flower',
    edibles: 'edible',
    vapes: 'vape',
    concentrates: 'concentrate',
    topicals: 'topical',
    pre_roll: 'preroll',
    prerolls: 'preroll',
    cartridge: 'vape',
    carts: 'vape',
    cart: 'vape',
  };
  const m = map[s];
  return m && PRODUCT_CATEGORIES.has(m) ? m : null;
}

/** Integer cents (e.g. from a `price_cents` column). */
export function parseCentsInteger(value: string): number | null {
  const v = value.trim().replace(/[, ]/g, '');
  if (!v || !/^\d+$/.test(v)) return null;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Dollar amount → cents (12.99, 12,99, $45). */
export function parseRetailDollarsToCents(value: string): number | null {
  const v = value.trim().replace(/[$\s]/g, '').replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseBoolLoose(v: string): boolean | null {
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'in stock', 'instock'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'out', 'out of stock'].includes(s)) return false;
  return null;
}

export type VendorCsvProductRow = {
  name: string;
  category: string;
  price_cents: number;
  inventory_count: number;
  in_stock: boolean;
  potency_thc: number | null;
  potency_cbd: number | null;
  description: string | null;
};

export function rowToVendorProductPayload(
  row: Record<string, string>,
  vendorId: string
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const name = pick(row, ['name', 'product_name', 'title', 'sku_name']);
  if (!name) return { ok: false, error: 'Missing name' };

  const catRaw = pick(row, ['category', 'type', 'menu_category']);
  const category = normalizeProductCategory(catRaw);
  if (!category) return { ok: false, error: `Invalid category: "${catRaw || '(empty)'}"` };

  const priceCentsRaw = pick(row, ['price_cents', 'pricecents', 'list_price_cents']);
  const priceRaw = pick(row, ['price', 'list_price', 'amount', 'unit_price']);
  const price_cents = priceCentsRaw
    ? parseCentsInteger(priceCentsRaw)
    : priceRaw
      ? parseRetailDollarsToCents(priceRaw)
      : null;
  if (price_cents == null || price_cents < 0) return { ok: false, error: 'Missing or invalid price' };

  const invRaw = pick(row, ['inventory_count', 'inventory', 'qty', 'quantity', 'stock_qty']);
  const inventory_count = invRaw === '' ? 0 : Math.max(0, Math.floor(Number(invRaw) || 0));

  const stockRaw = pick(row, ['in_stock', 'instock', 'available']);
  const parsedStock = stockRaw ? parseBoolLoose(stockRaw) : null;
  const in_stock = parsedStock ?? inventory_count > 0;

  const thcRaw = pick(row, ['potency_thc', 'thc', 'thc_percent', 'thc_pct']);
  const cbdRaw = pick(row, ['potency_cbd', 'cbd', 'cbd_percent', 'cbd_pct']);
  const potency_thc =
    thcRaw === ''
      ? null
      : (() => {
          const n = Number(thcRaw);
          return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
        })();
  const potency_cbd =
    cbdRaw === ''
      ? null
      : (() => {
          const n = Number(cbdRaw);
          return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
        })();

  const description = pick(row, ['description', 'notes', 'body']) || null;

  const payload: Record<string, unknown> = {
    vendor_id: vendorId,
    name,
    category,
    price_cents,
    inventory_count,
    in_stock,
    is_featured: false,
    description,
    images: [],
    potency_thc,
    potency_cbd,
  };

  return { ok: true, payload };
}

export type SupplyCsvListingRow = {
  title_override: string;
  category: string;
  list_price_cents: number | null;
  moq: number | null;
  case_size: string | null;
  description: string | null;
  visibility: 'draft' | 'live';
};

export function rowToSupplyListingPayload(
  row: Record<string, string>,
  supplyAccountId: string
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const title = pick(row, ['name', 'title', 'title_override', 'product', 'sku']);
  if (!title) return { ok: false, error: 'Missing name/title' };

  const catRaw = pick(row, ['category', 'type']);
  const category = normalizeProductCategory(catRaw);
  if (!category) return { ok: false, error: `Invalid category: "${catRaw || '(empty)'}"` };

  const priceCentsRaw = pick(row, ['list_price_cents', 'price_cents']);
  const priceRaw = pick(row, ['list_price', 'price', 'wholesale_price']);
  const list_price_cents =
    priceCentsRaw || priceRaw
      ? priceCentsRaw
        ? parseCentsInteger(priceCentsRaw)
        : parseRetailDollarsToCents(priceRaw)
      : null;

  const moqRaw = pick(row, ['moq', 'min_order', 'minimum']);
  const moq = moqRaw === '' ? null : Math.max(1, Math.floor(Number(moqRaw) || 0)) || null;

  const case_size = pick(row, ['case_size', 'case', 'pack']) || null;
  const description = pick(row, ['description', 'notes']) || null;

  const visRaw = pick(row, ['visibility', 'status', 'published']).toLowerCase();
  let visibility: 'draft' | 'live' = 'draft';
  if (['live', 'published', 'active', '1', 'true', 'yes'].includes(visRaw)) visibility = 'live';

  const payload: Record<string, unknown> = {
    supply_account_id: supplyAccountId,
    title_override: title,
    category,
    list_price_cents: list_price_cents != null && list_price_cents >= 0 ? list_price_cents : null,
    moq,
    case_size,
    description,
    visibility,
    catalog_product_id: null,
  };

  return { ok: true, payload };
}

export const VENDOR_MENU_CSV_SAMPLE = `name,category,price,inventory_count,in_stock,potency_thc,potency_cbd,description
Blue Dream 3.5g,flower,45.00,24,true,22.5,0.1,House flower — smalls
Sour Gummy 100mg,edible,18,50,true,,,`;

export const SUPPLY_LISTING_CSV_SAMPLE = `name,category,list_price,moq,case_size,description,visibility
Bulk Distillate 1L,concentrate,850,5,6/cs,Lab-tested,draft
Pre-roll 10pks,preroll,120,10,12/cs,Ready for retail,live`;
