/**
 * PostgREST returns at most ~1000 rows per request. Loop with .range(from, to) until a short page.
 */

export const SUPABASE_LIST_PAGE_SIZE = 1000;

/** ~5M rows max; increase only if you truly have more vendor rows than this. */
export const SUPABASE_LIST_MAX_PAGES = 5000;

export type PaginatedFetchResult<T> = {
  rows: T[];
  error: { message: string } | null;
  /** True if we stopped because maxPages was hit while a full page was still returned */
  truncated: boolean;
};

export async function fetchAllSupabasePages<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  options?: { pageSize?: number; maxPages?: number }
): Promise<PaginatedFetchResult<T>> {
  const pageSize = options?.pageSize ?? SUPABASE_LIST_PAGE_SIZE;
  const maxPages = options?.maxPages ?? SUPABASE_LIST_MAX_PAGES;
  const rows: T[] = [];

  for (let p = 0; p < maxPages; p++) {
    const from = p * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { rows, error, truncated: true };
    }
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) {
      return { rows, error: null, truncated: false };
    }
  }

  return { rows, error: null, truncated: true };
}
