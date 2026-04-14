import type { SupabaseClient } from '@supabase/supabase-js';

export const STRAINS_DIRECTORY_PAGE_SIZE = 47;
export const STRAINS_TRENDING_SLOTS = 6;

export type StrainDirectoryRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  thc_min: number;
  thc_max: number;
  description: string | null;
  effects: string[];
  flavors: string[];
  image_url: string | null;
  rating: number;
  review_count: number;
  is_site_trending?: boolean;
};

type TrendingSlugRow = { strain_slug: string; view_count: number };

export type StrainsDirectoryInput = {
  page: number;
  selectedType: string;
  debouncedSearch: string;
};

export type StrainsDirectoryLoadResult =
  | { ok: true; strains: StrainDirectoryRow[]; totalCount: number }
  | { ok: false; error: string; totalCount?: number };

/**
 * Loads one page of the strain directory. Uses GET + limit(0) for counts so PostgREST
 * does not send HEAD (some browsers/extensions/proxies break HEAD to Supabase).
 */
export async function loadStrainsDirectoryPage(
  client: SupabaseClient,
  input: StrainsDirectoryInput
): Promise<StrainsDirectoryLoadResult> {
  const { page, selectedType, debouncedSearch } = input;
  const directoryMode = !debouncedSearch && selectedType === 'all';

  let countQuery = client.from('strains').select('id', { count: 'exact' }).limit(0);
  if (selectedType !== 'all') {
    countQuery = countQuery.eq('type', selectedType);
  }
  if (debouncedSearch) {
    const s = debouncedSearch.replace(/%/g, '');
    countQuery = countQuery.or(`name.ilike.%${s}%,slug.ilike.%${s}%,description.ilike.%${s}%`);
  }
  const { count, error: countError } = await countQuery;
  if (countError) {
    return { ok: false, error: `Could not count strains: ${countError.message}` };
  }

  let dataQuery = client
    .from('strains')
    .select('*')
    .order('popularity_score', { ascending: false })
    .order('name', { ascending: true });
  if (selectedType !== 'all') {
    dataQuery = dataQuery.eq('type', selectedType);
  }
  if (debouncedSearch) {
    const s = debouncedSearch.replace(/%/g, '');
    dataQuery = dataQuery.or(`name.ilike.%${s}%,slug.ilike.%${s}%,description.ilike.%${s}%`);
  }

  let trendingRows: StrainDirectoryRow[] = [];
  let excludeIds: string[] = [];

  if (directoryMode) {
    const { data: slugRows, error: rpcError } = await client.rpc('trending_strain_slugs', {
      p_limit: STRAINS_TRENDING_SLOTS,
      p_days: 30,
    });

    if (!rpcError && Array.isArray(slugRows) && slugRows.length > 0) {
      const orderedSlugs = (slugRows as TrendingSlugRow[])
        .map((r) => r.strain_slug)
        .filter((slug) => typeof slug === 'string' && slug.length > 0);

      if (orderedSlugs.length > 0) {
        const { data: trendData, error: trendErr } = await client
          .from('strains')
          .select('*')
          .in('slug', orderedSlugs);

        if (!trendErr && trendData?.length) {
          const bySlug = new Map(trendData.map((row) => [row.slug as string, row]));
          trendingRows = orderedSlugs
            .map((slug) => bySlug.get(slug))
            .filter(Boolean)
            .map((row) => ({ ...(row as StrainDirectoryRow), is_site_trending: true }));
          excludeIds = trendingRows.map((r) => r.id);
        }
      }
    }
  }

  let query = dataQuery;
  if (excludeIds.length > 0) {
    query = query.filter('id', 'not.in', `(${excludeIds.join(',')})`);
  }

  const ex = excludeIds.length;
  let from: number;
  let rangeLen: number;

  if (!directoryMode || ex === 0) {
    from = page * STRAINS_DIRECTORY_PAGE_SIZE;
    rangeLen = STRAINS_DIRECTORY_PAGE_SIZE;
  } else if (page === 0) {
    from = 0;
    rangeLen = Math.max(0, STRAINS_DIRECTORY_PAGE_SIZE - trendingRows.length);
  } else {
    from = page * STRAINS_DIRECTORY_PAGE_SIZE - ex;
    rangeLen = STRAINS_DIRECTORY_PAGE_SIZE;
  }

  const to = from + rangeLen - 1;
  const { data, error } = await query.range(from, to);

  if (error) {
    return {
      ok: false,
      error: `Could not load strain rows: ${error.message}`,
      totalCount: typeof count === 'number' ? count : undefined,
    };
  }

  const rest = (data || []) as StrainDirectoryRow[];
  const merged: StrainDirectoryRow[] =
    directoryMode && page === 0 && trendingRows.length > 0
      ? [...trendingRows, ...rest]
      : rest;

  return {
    ok: true,
    strains: merged,
    totalCount: typeof count === 'number' ? count : 0,
  };
}
