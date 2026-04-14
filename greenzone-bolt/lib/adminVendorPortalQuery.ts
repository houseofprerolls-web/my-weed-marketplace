/**
 * Append `vendor=<uuid>` to internal vendor-portal URLs when an admin manages another store.
 * Preserves existing query strings and `#hash` fragments.
 */
export function withAdminVendorQuery(href: string, vendorId: string | null | undefined): string {
  const id = typeof vendorId === 'string' ? vendorId.trim() : '';
  if (!id) return href;
  const hashIdx = href.indexOf('#');
  const path =
    hashIdx === -1 ? href : href.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}vendor=${encodeURIComponent(id)}${hash}`;
}
