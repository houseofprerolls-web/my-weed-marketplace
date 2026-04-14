/**
 * Deal visibility in shopper UIs. Prefer `starts_at` / `ends_at` when present (migration 0130).
 */
export function dealIsActiveNow(d: {
  start_date: string;
  end_date: string;
  starts_at?: string | null;
  ends_at?: string | null;
  /** Postgres EXTRACT(DOW): 0=Sun ... 6=Sat. null/empty => all days. */
  active_days?: number[] | null;
  /** Time-of-day in America/Los_Angeles, e.g. "15:00:00" or "15:00". null => all day. */
  daily_start_time?: string | null;
  /** Time-of-day in America/Los_Angeles, e.g. "18:00:00" or "18:00". null => all day. */
  daily_end_time?: string | null;
}): boolean {
  const now = Date.now();
  if (d.starts_at && d.ends_at) {
    const s = new Date(d.starts_at).getTime();
    const e = new Date(d.ends_at).getTime();
    if (Number.isFinite(s) && Number.isFinite(e)) {
      if (!(now >= s && now <= e)) return false;

      // Day/time windows are evaluated in America/Los_Angeles (matches DB policy).
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour12: false,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(new Date(now));

      const part = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
      const weekday = part('weekday'); // Sun, Mon, ...
      const h = Number(part('hour'));
      const m = Number(part('minute'));
      const sec = Number(part('second'));
      const tod = (Number.isFinite(h) ? h : 0) * 3600 + (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(sec) ? sec : 0);
      const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const dow = dowMap[weekday] ?? 0;

      const days = Array.isArray(d.active_days) ? d.active_days.filter((x) => Number.isFinite(x)) : [];
      if (days.length > 0 && !days.includes(dow)) return false;

      const parseTime = (raw: string | null | undefined): number | null => {
        if (!raw) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const [hh, mm = '0', ss = '0'] = s.split(':');
        const H = Number(hh);
        const M = Number(mm);
        const S = Number(ss);
        if (!Number.isFinite(H) || !Number.isFinite(M) || !Number.isFinite(S)) return null;
        return H * 3600 + M * 60 + S;
      };

      const start = parseTime(d.daily_start_time);
      const end = parseTime(d.daily_end_time);
      if (start == null || end == null || start === end) return true; // all day
      if (start < end) return tod >= start && tod <= end;
      return tod >= start || tod <= end; // spans midnight
    }
  }
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(d.start_date);
  const e = new Date(d.end_date);
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return t >= s && t <= e;
}
