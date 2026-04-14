/** Shelf / menu brand line: linked brand row, custom text, then store name. */
export function resolveMenuBrandLabel(opts: {
  linkedBrandName?: string | null;
  brandDisplayName?: string | null;
  storeName: string;
}): string {
  const fromBrand = opts.linkedBrandName?.trim();
  if (fromBrand) return fromBrand;
  const custom = opts.brandDisplayName?.trim();
  if (custom) return custom;
  const store = opts.storeName?.trim();
  if (store) return store;
  return 'Shop';
}
