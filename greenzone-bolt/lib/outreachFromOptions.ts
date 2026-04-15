/**
 * Allowlisted outbound "from" identities (SMTP or Resend). Set OUTREACH_EMAIL_FROM_OPTIONS as JSON array, e.g.
 * [{"id":"onboarding","from":"Team <onboarding@verified.com>"},{"id":"sales","from":"Sales <sales@verified.com>"}]
 * If unset, falls back to OUTREACH_EMAIL_FROM as a single option with id "default".
 *
 * With `RESEND_API_KEY` (or `OUTREACH_RESEND_API_KEY`) and no from envs, we default the sender to
 * `connect@datreehouse.com` (same mailbox as Supabase Auth / forgot-password when configured per .env.example),
 * unless `RESEND_DEFAULT_FROM` or `AUTH_EMAIL_FROM` is set to your verified Resend identity.
 */

export type OutreachFromOption = { id: string; from: string };

/** Verified outreach mailbox — use bare address as Resend/SMTP “From” (no separate display name). */
export const OUTREACH_CONNECT_MAILBOX = 'connect@datreehouse.com';

/**
 * Collapse `Any Name <connect@datreehouse.com>` to `connect@datreehouse.com` so inboxes show that address.
 */
export function normalizeOutreachFromIdentity(from: string): string {
  const t = from.trim();
  if (t.toLowerCase() === OUTREACH_CONNECT_MAILBOX) return OUTREACH_CONNECT_MAILBOX;
  if (/<\s*connect@datreehouse\.com\s*>/i.test(t)) return OUTREACH_CONNECT_MAILBOX;
  return t;
}

/** Same key family as Vercel’s Resend integration — shared with outreach sends. */
export function outreachOrAppResendApiKey(): string {
  return (process.env.OUTREACH_RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
}

/**
 * If Resend is configured but no outreach-specific "from" is set, use the same default as Supabase Auth SMTP
 * (see .env.example): connect@datreehouse.com, or RESEND_DEFAULT_FROM / AUTH_EMAIL_FROM when set.
 */
export function implicitOutreachFromWhenResendConfigured(): string | null {
  if (!outreachOrAppResendApiKey()) return null;
  const shared = (process.env.RESEND_DEFAULT_FROM || process.env.AUTH_EMAIL_FROM || '').trim();
  if (shared) return normalizeOutreachFromIdentity(shared);
  return OUTREACH_CONNECT_MAILBOX;
}

export function parseOutreachFromOptions(): OutreachFromOption[] {
  const raw = (process.env.OUTREACH_EMAIL_FROM_OPTIONS || '').trim();
  const primary = normalizeOutreachFromIdentity(process.env.OUTREACH_EMAIL_FROM || '');
  const implicit = implicitOutreachFromWhenResendConfigured();
  const singleFrom = primary || implicit;

  if (!raw) {
    return singleFrom ? [{ id: 'default', from: singleFrom }] : [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return singleFrom ? [{ id: 'default', from: singleFrom }] : [];
    }
    const out: OutreachFromOption[] = [];
    for (const el of parsed) {
      if (!el || typeof el !== 'object') continue;
      const o = el as { id?: unknown; from?: unknown };
      const id = typeof o.id === 'string' ? o.id.trim() : '';
      const from = typeof o.from === 'string' ? normalizeOutreachFromIdentity(o.from) : '';
      if (id && from) out.push({ id, from });
    }
    if (out.length === 0 && primary) return [{ id: 'default', from: primary }];
    if (out.length === 0 && implicit) return [{ id: 'default', from: implicit }];
    return out;
  } catch {
    return singleFrom ? [{ id: 'default', from: singleFrom }] : [];
  }
}

/** Resolve client-provided from_id against env allowlist only. */
export function resolveAllowedOutreachFrom(fromId: string | undefined | null): { from: string; id: string } | { error: string } {
  const options = parseOutreachFromOptions();
  if (options.length === 0) {
    return {
      error:
        'No from addresses configured. Set OUTREACH_EMAIL_FROM, or set RESEND_API_KEY and optionally RESEND_DEFAULT_FROM (otherwise connect@datreehouse.com is used when Resend is configured).',
    };
  }
  const requested = (fromId || 'default').trim();
  let match = options.find((o) => o.id === requested);
  if (!match && requested === 'default') {
    match = options.find((o) => o.id === 'default') ?? options[0];
  }
  if (!match) {
    return { error: `Invalid from_id "${requested}". Allowed: ${options.map((o) => o.id).join(', ')}` };
  }
  return { from: match.from, id: match.id };
}

export function defaultOutreachFromId(): string {
  const options = parseOutreachFromOptions();
  const d = options.find((o) => o.id === 'default');
  return d?.id ?? options[0]?.id ?? 'default';
}
