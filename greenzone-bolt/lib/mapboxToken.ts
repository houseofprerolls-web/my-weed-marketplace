/** Avoid importing mapbox stack when only checking env (e.g. before dynamic import). */
export function mapboxTokenConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim());
}
