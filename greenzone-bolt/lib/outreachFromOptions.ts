/**
 * Allowlisted outbound "from" identities (SMTP or Resend). Set OUTREACH_EMAIL_FROM_OPTIONS as JSON array, e.g.
 * [{"id":"onboarding","from":"Team <onboarding@verified.com>"},{"id":"sales","from":"Sales <sales@verified.com>"}]
 * If unset, falls back to OUTREACH_EMAIL_FROM as a single option with id "default".
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

export function parseOutreachFromOptions(): OutreachFromOption[] {
  const raw = (process.env.OUTREACH_EMAIL_FROM_OPTIONS || '').trim();
  const primary = normalizeOutreachFromIdentity(process.env.OUTREACH_EMAIL_FROM || '');
  if (!raw) {
    return primary ? [{ id: 'default', from: primary }] : [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return primary ? [{ id: 'default', from: primary }] : [];
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
    return out;
  } catch {
    return primary ? [{ id: 'default', from: primary }] : [];
  }
}

/** Resolve client-provided from_id against env allowlist only. */
export function resolveAllowedOutreachFrom(fromId: string | undefined | null): { from: string; id: string } | { error: string } {
  const options = parseOutreachFromOptions();
  if (options.length === 0) {
    return { error: 'No from addresses configured (OUTREACH_EMAIL_FROM or OUTREACH_EMAIL_FROM_OPTIONS)' };
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
