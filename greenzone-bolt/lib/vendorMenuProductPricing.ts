import { effectiveShelfSalePriceCents } from '@/lib/productSalePrice';

export type MenuProductQuantityTier = {
  id: string;
  preset: string;
  label: string;
  price_cents: number;
  sort_order: number;
};

export type MenuProductForPricing = {
  id: string;
  price_cents: number;
  sale_discount_percent?: number | null;
  /** Dollars off list per unit (whole cents). DB XOR with sale_discount_percent. */
  sale_discount_cents?: number | null;
  quantity_tiers?: MenuProductQuantityTier[] | null;
};

export type DealKind =
  | 'percent_off'
  | 'fixed_amount_off'
  | 'set_price'
  | 'bogo'
  | 'bundle'
  | 'min_spend'
  | 'custom';

export type PublicMenuDeal = {
  id: string;
  discount_percent: number;
  products: string[];
  /** `deals.image_url` or `deal_options.hero_image_url` — menu / Discover visuals. */
  image_url?: string | null;
  deal_options?: {
    promo_code?: string;
    hero_image_url?: string;
    badge_label?: string;
    deal_kind?: DealKind;
    fixed_off_cents?: number;
    set_price_cents?: number;
    min_spend_cents?: number;
    custom_headline?: string;
    custom_rules?: string;
    bogo?: boolean;
    stackable?: boolean;
  } | null;
};

function dealCoversProduct(d: PublicMenuDeal, productId: string): boolean {
  const ids = d.products ?? [];
  if (ids.length === 0) return true;
  return ids.includes(productId);
}

export function salePriceCents(listPriceCents: number, discountPercent: number): number {
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, Math.round(listPriceCents * (1 - pct / 100)));
}

/** Final line-item price in cents when this deal applies (non-stack with shelf sale here). */
export function effectiveDealPriceCents(listPriceCents: number, deal: PublicMenuDeal): number {
  const kind = deal.deal_options?.deal_kind ?? (deal.deal_options?.bogo ? 'bogo' : 'percent_off');
  const pct = Math.min(100, Math.max(0, deal.discount_percent));
  const o = deal.deal_options;

  switch (kind) {
    case 'fixed_amount_off': {
      const off = Math.max(0, Math.round(Number(o?.fixed_off_cents) || 0));
      return Math.max(0, listPriceCents - off);
    }
    case 'set_price': {
      const sp = Math.max(0, Math.round(Number(o?.set_price_cents) || 0));
      return Math.min(listPriceCents, sp);
    }
    case 'bogo':
      return salePriceCents(listPriceCents, pct > 0 ? pct : 50);
    case 'bundle':
    case 'percent_off':
      return salePriceCents(listPriceCents, pct);
    case 'min_spend':
    case 'custom':
    default:
      return listPriceCents;
  }
}

function dealSavingsVersusList(listPriceCents: number, deal: PublicMenuDeal): number {
  const eff = effectiveDealPriceCents(listPriceCents, deal);
  return Math.max(0, listPriceCents - eff);
}

export function bestDealForProduct(
  productId: string,
  list: PublicMenuDeal[],
  selectedDealId: string | null,
  listPriceCentsForCompare: number
): PublicMenuDeal | null {
  const selected = selectedDealId ? list.find((d) => d.id === selectedDealId) : null;
  if (selected && dealCoversProduct(selected, productId)) {
    return selected;
  }
  const covering = list.filter((d) => dealCoversProduct(d, productId));
  if (covering.length === 0) return null;
  return covering.reduce((a, b) => {
    const sa = dealSavingsVersusList(listPriceCentsForCompare, a);
    const sb = dealSavingsVersusList(listPriceCentsForCompare, b);
    if (sb > sa) return b;
    if (sb < sa) return a;
    return b.discount_percent > a.discount_percent ? b : a;
  });
}

function impliedOffPct(list: number, charge: number): number | null {
  if (list <= 0) return null;
  if (charge >= list) return null;
  return Math.round((100 * (list - charge)) / list);
}

/** Deal pricing wins when a deal applies; otherwise optional shelf sale (% or $ off list). */
export function shopperMenuChargeCents(
  p: MenuProductForPricing,
  deals: PublicMenuDeal[],
  selectedDealId: string | null,
  listPriceCents?: number
): { chargeCents: number; deal: PublicMenuDeal | null; shelfSalePct: number | null } {
  const listBase = listPriceCents ?? p.price_cents;
  const deal = bestDealForProduct(p.id, deals, selectedDealId, listBase);
  if (deal) {
    return {
      chargeCents: effectiveDealPriceCents(listBase, deal),
      deal,
      shelfSalePct: null,
    };
  }
  const shelf = effectiveShelfSalePriceCents(
    listBase,
    p.sale_discount_percent,
    p.sale_discount_cents ?? null
  );
  if (shelf != null && shelf < listBase) {
    const impliedPct = impliedOffPct(listBase, shelf);
    const shelfSalePct =
      p.sale_discount_percent != null && p.sale_discount_percent >= 1
        ? Math.round(Number(p.sale_discount_percent))
        : impliedPct;
    return {
      chargeCents: shelf,
      deal: null,
      shelfSalePct,
    };
  }
  return { chargeCents: listBase, deal: null, shelfSalePct: null };
}

export function sortedQuantityTiers(
  tiers: MenuProductQuantityTier[] | null | undefined
): MenuProductQuantityTier[] {
  if (!tiers?.length) return [];
  return [...tiers].sort((a, b) => {
    const oa = a.sort_order ?? 0;
    const ob = b.sort_order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

export function menuProductPriceBand(
  p: MenuProductForPricing,
  deals: PublicMenuDeal[],
  selectedDealId: string | null
): {
  fromCents: number;
  fromListCents: number;
  showFrom: boolean;
  onSale: boolean;
  offPct: number | null;
} {
  const tiers = sortedQuantityTiers(p.quantity_tiers ?? null);
  if (tiers.length === 0) {
    const r = shopperMenuChargeCents(p, deals, selectedDealId);
    const list = p.price_cents;
    const off =
      r.deal != null ? impliedOffPct(list, r.chargeCents) ?? r.deal.discount_percent : r.shelfSalePct;
    return {
      fromCents: r.chargeCents,
      fromListCents: p.price_cents,
      showFrom: false,
      onSale: r.chargeCents < p.price_cents,
      offPct: off,
    };
  }
  let minEff = Infinity;
  let minList = Infinity;
  let anySale = false;
  let offPct: number | null = null;
  for (const t of tiers) {
    const r = shopperMenuChargeCents(p, deals, selectedDealId, t.price_cents);
    minEff = Math.min(minEff, r.chargeCents);
    minList = Math.min(minList, t.price_cents);
    if (r.chargeCents < t.price_cents) {
      anySale = true;
      offPct =
        r.deal != null ? impliedOffPct(t.price_cents, r.chargeCents) ?? r.deal.discount_percent : r.shelfSalePct;
    }
  }
  return {
    fromCents: Number.isFinite(minEff) ? minEff : p.price_cents,
    fromListCents: Number.isFinite(minList) ? minList : p.price_cents,
    showFrom: tiers.length > 1,
    onSale: anySale,
    offPct,
  };
}