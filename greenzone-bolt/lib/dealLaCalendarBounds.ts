import type { SupabaseClient } from '@supabase/supabase-js';

/** `YYYY-MM-DD` in America/Los_Angeles for the given instant (matches deal DB trigger). */
export function laYmdFromIso(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const g: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') g[p.type] = p.value;
  }
  const y = g.year;
  const m = g.month;
  const day = g.day;
  if (!y || !m || !day) return '';
  return `${y}-${m}-${day}`;
}

/** `HH:MM` (24h) in America/Los_Angeles for the given instant. */
export function laHmFromIso(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const g: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') g[p.type] = p.value;
  }
  const h = g.hour;
  const m = g.minute;
  if (!h || !m) return '';
  return `${h}:${m}`;
}

export type DealLaScheduleBoundsOpts = {
  /** When false, clock times are ignored (full Pacific calendar days). */
  useClockTimes: boolean;
  /** `HH:MM` from `<input type="time" />`, or empty for start/end of day. */
  startTimeHm?: string;
  endTimeHm?: string;
};

/**
 * Maps Pacific calendar dates plus optional same-day clock times to timestamptz.
 * When `useClockTimes` is false, `p_start_time` / `p_end_time` are sent as null (full days).
 */
export async function rpcDealLaScheduleBounds(
  supabase: SupabaseClient,
  startYmd: string,
  endYmd: string,
  opts: DealLaScheduleBoundsOpts
): Promise<{ starts_at: string; ends_at: string } | null> {
  const use = opts.useClockTimes;
  const st = use && opts.startTimeHm?.trim() ? `${opts.startTimeHm.trim()}:00` : null;
  const et = use && opts.endTimeHm?.trim() ? `${opts.endTimeHm.trim()}:00` : null;

  const { data, error } = await supabase.rpc('deal_la_schedule_bounds', {
    p_start_date: startYmd,
    p_end_date: endYmd,
    p_start_time: st,
    p_end_time: et,
  });
  if (error) {
    console.error('deal_la_schedule_bounds', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const o = row as { starts_at?: string; ends_at?: string };
  if (!o.starts_at || !o.ends_at) return null;
  return { starts_at: o.starts_at, ends_at: o.ends_at };
}

/** @deprecated Prefer rpcDealLaScheduleBounds(..., { useClockTimes: false }) */
export async function rpcDealLaCalendarBounds(
  supabase: SupabaseClient,
  startYmd: string,
  endYmd: string
): Promise<{ starts_at: string; ends_at: string } | null> {
  return rpcDealLaScheduleBounds(supabase, startYmd, endYmd, { useClockTimes: false });
}
