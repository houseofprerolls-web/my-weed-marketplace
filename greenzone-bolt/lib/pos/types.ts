import type { PosProviderId } from '@/lib/posProviders';

export type MenuProductCategory =
  | 'flower'
  | 'edible'
  | 'vape'
  | 'concentrate'
  | 'topical'
  | 'preroll'
  | 'other';

export type NormalizedPosSku = {
  externalId: string;
  name: string;
  priceCents: number;
  category: MenuProductCategory;
  description: string | null;
  images: string[];
  potencyThc: number | null;
  potencyCbd: number | null;
  inventoryCount: number;
  inStock: boolean;
};

export type PosCatalogImportResult = {
  items: NormalizedPosSku[];
  /** When true, POS rows missing from this run are marked out of stock. */
  fullSync: true;
  /** Optional human-readable note (e.g. Blaze zero products vs shop filter). */
  warning?: string;
};

export type PosCatalogImporter = (args: {
  config: Record<string, unknown>;
  baseUrlOverride?: string | null;
}) => Promise<PosCatalogImportResult>;

export type PosProviderHandler = {
  id: PosProviderId;
  importCatalog: PosCatalogImporter;
};
