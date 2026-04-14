import { mapPosCategoryLabel } from '@/lib/pos/mapCategory';
import type { NormalizedPosSku, PosCatalogImportResult } from '@/lib/pos/types';

const DEFAULT_BLAZE_BASE = 'https://api.partners.blaze.me';

/**
 * Default Blaze catalog store probe path. Override with `BLAZE_RETAILER_STORE_PATH` or config `retailer_store_path`.
 * (`/partner/` is Blaze’s URL segment, not a Treehouse program.)
 */
const DEFAULT_RETAILER_STORE_PATH = '/api/v1/partner/store';

/**
 * Default product list path (Blaze docs: `/api/v1/partner/store/inventory/products`, singular `inventory`).
 * Override with `BLAZE_RETAILER_PRODUCTS_PATH` or config `retailer_products_path`.
 */
const DEFAULT_RETAILER_PRODUCTS_PATH = '/api/v1/partner/store/inventory/products';

function strConfig(cfg: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = cfg[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Trim BOM, outer quotes, and accidental `Bearer ` prefix from pasted Blaze Key/Secret. */
function sanitizeBlazeCredential(raw: string): string {
  let s = raw.replace(/^\uFEFF/, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\r\n/g, '\n').split('\n').map((t) => t.trim()).filter(Boolean).join('');
  if (/^bearer\s+/i.test(s)) s = s.replace(/^bearer\s+/i, '').trim();
  return s;
}

function normalizePath(p: string): string {
  const t = p.trim();
  if (!t) return '';
  return t.startsWith('/') ? t : `/${t}`;
}

function blazeFetchErrorMessage(url: string, err: unknown): string {
  const base = err instanceof Error ? err.message : String(err);
  let extra = '';
  if (err instanceof Error && err.cause != null) {
    const c = err.cause;
    if (c instanceof Error) {
      extra = c.message ? ` — ${c.message}` : '';
      const code = (c as NodeJS.ErrnoException).code;
      if (code) extra += ` (${code})`;
    } else if (typeof c === 'object' && c !== null && 'code' in c) {
      extra = ` (${String((c as { code: unknown }).code)})`;
    }
  }
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    /* ignore */
  }
  return (
    `Blaze API request failed${host ? ` (${host})` : ''}: ${base}${extra}. ` +
    'Check api_base_url, network and firewall, and TLS. If your tenant uses different routes, set BLAZE_RETAILER_STORE_PATH / BLAZE_RETAILER_PRODUCTS_PATH (or retailer_store_path / retailer_products_path in config).'
  );
}

function retailerStorePath(cfg: Record<string, unknown>): string {
  const fromEnv = typeof process.env.BLAZE_RETAILER_STORE_PATH === 'string' ? process.env.BLAZE_RETAILER_STORE_PATH.trim() : '';
  if (fromEnv) return normalizePath(fromEnv);
  const fromCfg = strConfig(cfg, 'retailer_store_path', 'blaze_retailer_store_path');
  if (fromCfg) return normalizePath(fromCfg);
  return DEFAULT_RETAILER_STORE_PATH;
}

/** Earlier builds used a typo (`.../inventories/...`). Blaze only documents `.../inventory/products`. */
function fixLegacyBlazeInventoryProductsPath(p: string): string {
  const n = normalizePath(p);
  return n.replace(/\/partner\/store\/inventories\/products(\/|$)/i, '/partner/store/inventory/products$1');
}

function retailerProductsPath(cfg: Record<string, unknown>): string {
  const fromEnv = typeof process.env.BLAZE_RETAILER_PRODUCTS_PATH === 'string' ? process.env.BLAZE_RETAILER_PRODUCTS_PATH.trim() : '';
  if (fromEnv) return fixLegacyBlazeInventoryProductsPath(fromEnv);
  const fromCfg = strConfig(cfg, 'retailer_products_path', 'blaze_retailer_products_path');
  if (fromCfg) return fixLegacyBlazeInventoryProductsPath(fromCfg);
  return DEFAULT_RETAILER_PRODUCTS_PATH;
}

/** Two-header auth: Developer Keys Key → `x-api-key`, Secret → `Authorization` (same Retail row). */
function blazeDualHeaderVariants(xApiKeyValue: string, authorizationValue: string): Record<string, string>[] {
  const p = sanitizeBlazeCredential(xApiKeyValue);
  const d = sanitizeBlazeCredential(authorizationValue);
  if (!p || !d) return [];
  const acceptJson = 'application/json';
  /** Blaze GET examples use Accept only; omit Content-Type on GET to avoid strict gateways rejecting it. */
  const base = { Accept: acceptJson } as Record<string, string>;
  const out: Record<string, string>[] = [
    { ...base, 'x-api-key': p, Authorization: d },
    { ...base, 'X-API-Key': p, Authorization: d },
  ];
  if (!/^bearer\s/i.test(d)) {
    out.push({ ...base, 'x-api-key': p, Authorization: `Bearer ${d}` });
  }
  return out;
}

/** Fallback when only one secret is configured (non-standard / alternate hosts). */
function singleCredentialAuthVariants(token: string): Record<string, string>[] {
  const t = sanitizeBlazeCredential(token);
  if (!t) return [];
  const acceptJson = 'application/json';
  const base = { Accept: acceptJson } as Record<string, string>;
  return [
    { ...base, Authorization: t },
    { ...base, Authorization: /^bearer\s/i.test(t) ? t : `Bearer ${t}` },
    { ...base, 'X-API-Key': t },
    { ...base, 'x-api-key': t },
  ];
}

function extractArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    for (const k of ['searchResult', 'values', 'results', 'data', 'items', 'records', 'list', 'content']) {
      const v = o[k];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

function blazeImageUrls(assets: unknown): string[] {
  if (!Array.isArray(assets)) return [];
  const out: string[] = [];
  for (const a of assets) {
    if (typeof a === 'string') {
      out.push(a);
      continue;
    }
    if (a && typeof a === 'object') {
      const o = a as Record<string, unknown>;
      for (const k of ['url', 'assetUrl', 'src', 'publicUrl']) {
        if (typeof o[k] === 'string' && (o[k] as string).trim()) {
          out.push((o[k] as string).trim());
          break;
        }
      }
    }
  }
  return out;
}

function categoryFromBlazeProduct(p: Record<string, unknown>): string {
  const cat = p.category;
  if (cat && typeof cat === 'object') {
    const name = (cat as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim()) return name;
  }
  for (const k of ['flowerType', 'cannabisType', 'productType']) {
    const v = p[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

function priceCentsFromBlaze(p: Record<string, unknown>): number {
  const sales = p.salesPrice;
  const unit = p.unitPrice;
  const n = typeof sales === 'number' ? sales : typeof unit === 'number' ? unit : 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 5000) return Math.round(n);
  return Math.round(n * 100);
}

function inventoryFromBlaze(p: Record<string, unknown>): number {
  const tq = p.totalSellableQuantity;
  if (typeof tq === 'number' && Number.isFinite(tq) && tq >= 0) return Math.floor(tq);
  const q = p.quantities;
  if (Array.isArray(q)) {
    let sum = 0;
    for (const row of q) {
      if (row && typeof row === 'object') {
        const n = (row as Record<string, unknown>).quantity;
        if (typeof n === 'number' && n > 0) sum += n;
      }
    }
    if (sum > 0) return Math.floor(sum);
  }
  return 0;
}

function blazeToNormalized(p: Record<string, unknown>): NormalizedPosSku | null {
  const id = p.id != null ? String(p.id) : '';
  if (!id) return null;

  const nameRaw = p.displayName ?? p.name;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : 'Unnamed product';

  const deleted = p.deleted === true;
  const archived = p.archived === true;
  const active = p.active !== false;
  const instock = p.instock === true;
  const inv = inventoryFromBlaze(p);
  const inStock = !deleted && !archived && active && (instock || inv > 0);

  const thc = p.thc ?? p.maxThc;
  const cbd = p.cbd ?? p.maxCbd;
  const desc = p.description;
  const brandName =
    typeof p.brandName === 'string'
      ? p.brandName.trim()
      : p.brand && typeof p.brand === 'object' && typeof (p.brand as Record<string, unknown>).name === 'string'
        ? String((p.brand as Record<string, unknown>).name).trim()
        : '';

  return {
    externalId: id,
    name: brandName ? `${name} — ${brandName}` : name,
    priceCents: priceCentsFromBlaze(p),
    category: mapPosCategoryLabel(categoryFromBlazeProduct(p)),
    description: typeof desc === 'string' && desc.trim() ? desc.trim() : null,
    images: blazeImageUrls(p.assets),
    potencyThc: typeof thc === 'number' && Number.isFinite(thc) ? thc : null,
    potencyCbd: typeof cbd === 'number' && Number.isFinite(cbd) ? cbd : null,
    inventoryCount: inv,
    inStock,
  };
}

export async function importBlazeCatalog(args: {
  config: Record<string, unknown>;
  baseUrlOverride?: string | null;
}): Promise<PosCatalogImportResult> {
  /** Developer Keys Key → `x-api-key` (stored as `partner_api_key` in DB). */
  let blazeKey = sanitizeBlazeCredential(
    strConfig(
      args.config,
      'partner_api_key',
      'blaze_partner_key',
      'blaze_key',
      'x_api_key',
      'blaze_api_key',
      'partner_key'
    )
  );

  /** Same row: “Secret” → `Authorization`. Never use `blaze_key` in this chain — it belongs with the Key. */
  let blazeSecret = sanitizeBlazeCredential(
    strConfig(
      args.config,
      'api_token',
      'blaze_developer_key',
      'developer_key',
      'authorization',
      'blaze_secret',
      'api_secret',
      'secret'
    )
  );

  /**
   * Older UI ordered fields so some rows store the long Secret under `partner_api_key` and the short Key under `api_token`.
   * Blaze Key is almost always shorter than the Secret — swap columns when that pattern matches.
   * Opt out: set connection `blaze_disable_length_credential_fix` to `true`, or env `BLAZE_DISABLE_CREDENTIAL_LENGTH_FIX=1`.
   */
  const skipLenFix =
    strConfig(args.config, 'blaze_disable_length_credential_fix', 'blaze_disable_length_fix').toLowerCase() === 'true' ||
    strConfig(args.config, 'blaze_disable_length_credential_fix', 'blaze_disable_length_fix') === '1' ||
    (typeof process.env.BLAZE_DISABLE_CREDENTIAL_LENGTH_FIX === 'string' &&
      /^1|true|yes$/i.test(process.env.BLAZE_DISABLE_CREDENTIAL_LENGTH_FIX.trim()));

  const swapForced =
    strConfig(args.config, 'blaze_credentials_swapped', 'blaze_swap_key_secret').toLowerCase() === 'true' ||
    strConfig(args.config, 'blaze_credentials_swapped', 'blaze_swap_key_secret') === '1' ||
    strConfig(args.config, 'blaze_credentials_swapped', 'blaze_swap_key_secret').toLowerCase() === 'yes';

  if (blazeKey && blazeSecret && swapForced) {
    const t = blazeKey;
    blazeKey = blazeSecret;
    blazeSecret = t;
  } else if (
    !skipLenFix &&
    blazeKey &&
    blazeSecret &&
    blazeKey !== blazeSecret &&
    blazeKey.length > blazeSecret.length
  ) {
    const t = blazeKey;
    blazeKey = blazeSecret;
    blazeSecret = t;
  }

  if (!blazeKey && !blazeSecret) {
    throw new Error(
      'Blaze sync needs your Developer Keys Secret from Retail → Global Settings → Company Settings → Developer Keys (save it as Blaze Secret). If Blaze returns 401, add the Key from the same row under Advanced. See https://apidocs.blaze.me/getting-started/authentication'
    );
  }

  /**
   * Secret-only: try single-header auth first (developer-credential-only attempts).
   * Key + Secret: dual headers (correct mapping, then swapped), then single-header fallbacks.
   */
  const authVariants: Record<string, string>[] = [];
  if (!blazeKey && blazeSecret) {
    authVariants.push(...singleCredentialAuthVariants(blazeSecret));
  } else if (blazeKey && !blazeSecret) {
    authVariants.push(...singleCredentialAuthVariants(blazeKey));
  } else if (blazeKey && blazeSecret) {
    authVariants.push(
      ...blazeDualHeaderVariants(blazeKey, blazeSecret),
      ...(blazeKey !== blazeSecret ? blazeDualHeaderVariants(blazeSecret, blazeKey) : []),
      ...singleCredentialAuthVariants(blazeSecret),
      ...singleCredentialAuthVariants(blazeKey),
    );
  }

  if (authVariants.length === 0) {
    throw new Error('Blaze sync could not build request headers. Save the Secret (and Key under Advanced if required) from Blaze Developer Keys.');
  }

  const base =
    (args.baseUrlOverride && args.baseUrlOverride.trim()) ||
    strConfig(args.config, 'api_base_url') ||
    DEFAULT_BLAZE_BASE;
  const baseUrl = base.replace(/\/$/, '');

  const storePath = retailerStorePath(args.config);
  const productsPath = retailerProductsPath(args.config);
  const shopFilter = strConfig(args.config, 'store_id', 'dispensary_id', 'location_id', 'shop_id');

  let winningHeaders: Record<string, string> | null = null;

  async function blazeFetch(url: string): Promise<Response> {
    const doGet = async (headers: Record<string, string>) => {
      try {
        return await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(90_000),
        });
      } catch (e) {
        throw new Error(blazeFetchErrorMessage(url, e));
      }
    };

    if (winningHeaders) {
      return doGet({ ...winningHeaders });
    }

    let last: Response | null = null;
    for (const headers of authVariants) {
      const res = await doGet(headers);
      last = res;
      if (res.ok) {
        winningHeaders = headers;
        return res;
      }
      if (res.status !== 401 && res.status !== 403) {
        return res;
      }
    }
    return last ?? (authVariants[0] ? doGet(authVariants[0]) : doGet({ Accept: 'application/json' }));
  }

  function throwBlazeHttpError(path: string, res: Response, text: string): never {
    const snippet = text.slice(0, 400).replace(/\s+/g, ' ');
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Blaze API HTTP ${res.status} on ${path} (${res.status === 401 ? 'Unauthorized' : 'Forbidden'}). ${snippet ? `${snippet} ` : ''}` +
          '`Authorization` must be the Secret; `x-api-key` must be the Key from the same Developer Keys row. Re-copy the Secret (main field) and Key (Advanced); if unsure, swap them and save. In Blaze, turn Status on and match the row’s shop. Paths: BLAZE_RETAILER_STORE_PATH / BLAZE_RETAILER_PRODUCTS_PATH and api_base_url.'
      );
    }
    throw new Error(`Blaze API HTTP ${res.status} on ${path}${snippet ? `: ${snippet}` : ''}`);
  }

  const storeUrl = `${baseUrl}${storePath}`;
  const storeRes = await blazeFetch(storeUrl);
  const storeText = await storeRes.text();
  if (!storeRes.ok && storeRes.status !== 404) {
    throwBlazeHttpError(storePath, storeRes, storeText);
  }

  const limit = 200;
  let start = 0;
  const collected: NormalizedPosSku[] = [];
  const seenIds = new Set<string>();
  let totalActiveRowsSeen = 0;
  let droppedByShopFilterOnly = 0;

  for (let guard = 0; guard < 500; guard++) {
    const url = new URL(`${baseUrl}${productsPath}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('start', String(start));

    const res = await blazeFetch(url.toString());
    const text = await res.text();
    if (!res.ok) {
      throwBlazeHttpError(productsPath, res, text);
    }

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error('Blaze returned non-JSON response for product list.');
    }

    const batch = extractArray(json);
    if (!batch.length) break;

    for (const raw of batch) {
      if (raw.deleted === true || raw.archived === true) continue;
      totalActiveRowsSeen++;
      if (shopFilter && String(raw.shopId ?? '') !== shopFilter) {
        droppedByShopFilterOnly++;
        continue;
      }
      const n = blazeToNormalized(raw);
      if (!n) continue;
      if (seenIds.has(n.externalId)) continue;
      seenIds.add(n.externalId);
      collected.push(n);
    }

    if (batch.length < limit) break;
    start += batch.length;
  }

  let warning: string | undefined;
  if (collected.length === 0) {
    if (shopFilter && totalActiveRowsSeen > 0 && droppedByShopFilterOnly === totalActiveRowsSeen) {
      warning =
        'Blaze returned active products but none matched your Shop ID filter. Clear the Store / Shop ID field or set the exact Blaze shopId, then sync again.';
    } else if (totalActiveRowsSeen === 0) {
      warning =
        'Blaze returned no active product rows for this credential. Confirm Developer Keys row permissions (Expose toggles) and that products exist in Blaze.';
    }
  }

  return { items: collected, fullSync: true, warning };
}
