/** Normalizes signup input: lowercase, strip invalid characters (keep a-z, 0-9, _). */
export function normalizeUsernameInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

/** For PostgREST `.ilike()` exact match without treating `_` / `%` as wildcards. */
export function escapeForIlikeExact(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function isValidUsername(normalized: string): boolean {
  return normalized.length >= 3 && normalized.length <= 30 && /^[a-z0-9_]+$/.test(normalized);
}
