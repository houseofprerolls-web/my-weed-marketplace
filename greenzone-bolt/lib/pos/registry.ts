import type { PosProviderId } from '@/lib/posProviders';
import type { PosCatalogImporter } from '@/lib/pos/types';
import { importBlazeCatalog } from '@/lib/pos/providers/blaze';

function notImplemented(provider: PosProviderId): PosCatalogImporter {
  return async () => {
    throw new Error(
      `Catalog import for "${provider}" is not implemented yet. Use Blaze, or add products manually until this connector ships.`
    );
  };
}

const registry: Record<PosProviderId, PosCatalogImporter> = {
  blaze: importBlazeCatalog,
  dutchie: notImplemented('dutchie'),
  treez: notImplemented('treez'),
  jane: notImplemented('jane'),
  leaflogix: notImplemented('leaflogix'),
  flowhub: notImplemented('flowhub'),
  other: notImplemented('other'),
};

export function getPosCatalogImporter(provider: string): PosCatalogImporter | null {
  if (provider in registry) return registry[provider as PosProviderId];
  return null;
}
