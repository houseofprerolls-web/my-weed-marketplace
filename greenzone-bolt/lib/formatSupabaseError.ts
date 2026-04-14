/**
 * Supabase/PostgREST errors are plain objects (`{ message, details, hint, code }`), not always `Error`.
 */
export function formatSupabaseError(err: unknown): string {
  if (err == null) return 'Unknown error';
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    const message = typeof e.message === 'string' ? e.message : undefined;
    const details = typeof e.details === 'string' ? e.details : undefined;
    const hint = typeof e.hint === 'string' ? e.hint : undefined;
    const code = typeof e.code === 'string' ? e.code : undefined;
    const parts = [message, details, hint].filter(Boolean);
    if (parts.length) {
      const joined = parts.join(' — ');
      const missingTable =
        /could not find the table|relation .* does not exist|schema cache/i.test(joined) ||
        code === 'PGRST205' ||
        code === '42P01';
      if (missingTable) {
        const orders =
          /\bpublic\.orders\b/i.test(joined) ||
          (/\borders\b/i.test(joined) &&
            (/schema cache/i.test(joined) || /could not find/i.test(joined)));
        const posts =
          /\bposts\b/i.test(joined) &&
          (/schema cache/i.test(joined) || /could not find/i.test(joined) || code === 'PGRST205');
        let hint: string;
        if (orders) {
          hint =
            'Apply supabase/migrations/0045_create_orders_table_if_missing.sql (or the full 0001_init chain), then in Supabase Dashboard → Settings → API click “Reload schema” if the table already exists.';
        } else if (posts) {
          hint =
            'Apply supabase/migrations/0105_community_feed_posts.sql (community chat), then Dashboard → Settings → API → Reload schema.';
        } else {
          hint =
            'Apply the migration that creates this table (see repo supabase/migrations), then Dashboard → Settings → API → Reload schema.';
        }
        return `${joined} — ${hint}`;
      }
      return joined;
    }
    if (code) return `Database error (${code})`;
  }
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
}

/** User-facing hint when RLS blocks catalog writes. */
export function rlsHintForCode(code: string | undefined): string | undefined {
  if (code === '42501' || code === 'PGRST301')
    return 'Your session may not own this store (or admin menu access). Confirm you are logged in as the linked vendor or open Menu from Admin → Vendor control.';
  return undefined;
}
