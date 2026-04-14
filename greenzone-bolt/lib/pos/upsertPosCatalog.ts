import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedPosSku } from '@/lib/pos/types';

type ProductRow = {
  id: string;
  pos_external_id: string | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type UpsertPosCatalogStats = {
  inserted: number;
  updated: number;
  markedOutOfStock: number;
};

function rowFromSku(
  vendorId: string,
  posProvider: string,
  sku: NormalizedPosSku
): Record<string, unknown> {
  return {
    vendor_id: vendorId,
    pos_provider: posProvider,
    pos_external_id: sku.externalId,
    name: sku.name,
    category: sku.category,
    price_cents: sku.priceCents,
    inventory_count: sku.inventoryCount,
    in_stock: sku.inStock,
    potency_thc: sku.potencyThc,
    potency_cbd: sku.potencyCbd,
    description: sku.description ?? '',
    images: sku.images,
  };
}

/**
 * Upsert POS-linked rows in `products` using (vendor_id, pos_provider, pos_external_id).
 * Marks existing POS rows not present in `items` as out of stock when `fullSync` is true.
 */
export async function upsertPosCatalog(
  supabase: SupabaseClient,
  vendorId: string,
  posProvider: string,
  items: NormalizedPosSku[],
  options: { fullSync: boolean }
): Promise<UpsertPosCatalogStats> {
  const { data: existing, error: selErr } = await supabase
    .from('products')
    .select('id,pos_external_id')
    .eq('vendor_id', vendorId)
    .eq('pos_provider', posProvider)
    .not('pos_external_id', 'is', null);

  if (selErr) {
    throw new Error(selErr.message);
  }

  const rows = (existing || []) as ProductRow[];
  const byExternal = new Map<string, string>();
  for (const r of rows) {
    if (r.pos_external_id) byExternal.set(r.pos_external_id, r.id);
  }

  let inserted = 0;
  let updated = 0;

  for (const batch of chunk(items, 40)) {
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

    for (const sku of batch) {
      const id = byExternal.get(sku.externalId);
      const patch = rowFromSku(vendorId, posProvider, sku);
      if (id) {
        delete patch.vendor_id;
        delete patch.pos_provider;
        delete patch.pos_external_id;
        toUpdate.push({ id, patch });
      } else {
        toInsert.push(patch as Record<string, unknown>);
      }
    }

    if (toInsert.length) {
      const { error: insErr } = await supabase.from('products').insert(toInsert);
      if (insErr) throw new Error(insErr.message);
      inserted += toInsert.length;
    }

    for (const u of toUpdate) {
      const { error: upErr } = await supabase.from('products').update(u.patch).eq('id', u.id);
      if (upErr) throw new Error(upErr.message);
      updated += 1;
    }
  }

  let markedOutOfStock = 0;
  if (options.fullSync) {
    const seen = new Set(items.map((i) => i.externalId));
    const staleIds = rows.filter((r) => r.pos_external_id && !seen.has(r.pos_external_id)).map((r) => r.id);
    for (const batch of chunk(staleIds, 80)) {
      if (!batch.length) continue;
      const { error: oosErr } = await supabase
        .from('products')
        .update({ in_stock: false, inventory_count: 0 })
        .in('id', batch);
      if (oosErr) throw new Error(oosErr.message);
      markedOutOfStock += batch.length;
    }
  }

  return { inserted, updated, markedOutOfStock };
}
