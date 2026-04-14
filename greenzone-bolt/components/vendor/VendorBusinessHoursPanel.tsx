'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type HourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DAYS = [
  { d: 0, label: 'Sun' },
  { d: 1, label: 'Mon' },
  { d: 2, label: 'Tue' },
  { d: 3, label: 'Wed' },
  { d: 4, label: 'Thu' },
  { d: 5, label: 'Fri' },
  { d: 6, label: 'Sat' },
] as const;

function toTimeInput(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function fromTimeInput(t: string): string | null {
  if (!t) return null;
  return `${t}:00`;
}

type TimeParts = { h12: number; minute: number; ampm: 'AM' | 'PM' };

function dbTimeToParts(iso: string | null, fallback: string): TimeParts {
  const raw = toTimeInput(iso) || fallback;
  const [hhStr, mmStr] = raw.split(':');
  const hh = Math.min(23, Math.max(0, Number(hhStr) || 0));
  const minute = Math.min(59, Math.max(0, Number(mmStr) || 0));
  const ampm: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return { h12, minute, ampm };
}

function partsToDb(p: TimeParts): string {
  let hour24: number;
  if (p.ampm === 'AM') {
    hour24 = p.h12 === 12 ? 0 : p.h12;
  } else {
    hour24 = p.h12 === 12 ? 12 : p.h12 + 12;
  }
  const h = String(hour24).padStart(2, '0');
  const m = String(p.minute).padStart(2, '0');
  return `${h}:${m}:00`;
}

function format12h(iso: string | null, fallback: string): string {
  const { h12, minute, ampm } = dbTimeToParts(iso, fallback);
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type TimeBarProps = {
  label: string;
  value: string | null;
  fallbackHm: string;
  disabled: boolean;
  variant: 'open' | 'close';
  onChange: (next: string | null) => void;
};

function TimeBar({ label, value, fallbackHm, disabled, variant, onChange }: TimeBarProps) {
  const [open, setOpen] = useState(false);
  const parts = useMemo(() => dbTimeToParts(value, fallbackHm), [value, fallbackHm]);

  function commit(next: TimeParts) {
    onChange(fromTimeInput(partsToDb(next).slice(0, 5)));
  }

  const display = format12h(value, fallbackHm);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${display}. Tap to change.`}
          className={cn(
            'flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-base font-semibold tabular-nums tracking-tight transition active:scale-[0.99]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            variant === 'open' &&
              'border-emerald-500/65 bg-emerald-950/45 text-emerald-50 shadow-sm hover:border-emerald-400/90 hover:bg-emerald-900/40 focus-visible:ring-emerald-400/50 disabled:border-gray-700 disabled:bg-gray-900/50 disabled:text-gray-500',
            variant === 'close' &&
              'border-amber-500/60 bg-amber-950/40 text-amber-50 shadow-sm hover:border-amber-400/90 hover:bg-amber-900/40 focus-visible:ring-amber-400/50 disabled:border-gray-700 disabled:bg-gray-900/50 disabled:text-gray-500'
          )}
        >
          <span className="pointer-events-none select-none">{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,280px)] border-green-900/40 bg-gray-950 p-3 text-white"
        align="center"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <span className="block text-center text-[10px] uppercase text-gray-500">Hour</span>
            <Select
              value={String(parts.h12)}
              onValueChange={(v) => commit({ ...parts, h12: Number(v) })}
            >
              <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-green-900/40 bg-gray-950 text-white">
                {HOURS_12.map((h) => (
                  <SelectItem key={h} value={String(h)} className="focus:bg-gray-800">
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="block text-center text-[10px] uppercase text-gray-500">Min</span>
            <Select
              value={String(parts.minute)}
              onValueChange={(v) => commit({ ...parts, minute: Number(v) })}
            >
              <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56 border-green-900/40 bg-gray-950 text-white">
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)} className="focus:bg-gray-800">
                    {String(m).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="block text-center text-[10px] uppercase text-gray-500">AM / PM</span>
            <Select
              value={parts.ampm}
              onValueChange={(v) => commit({ ...parts, ampm: v as 'AM' | 'PM' })}
            >
              <SelectTrigger className="h-10 border-gray-700 bg-gray-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-green-900/40 bg-gray-950 text-white">
                <SelectItem value="AM" className="focus:bg-gray-800">
                  AM
                </SelectItem>
                <SelectItem value="PM" className="focus:bg-gray-800">
                  PM
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-500">Tap hour, minutes, or AM/PM</p>
      </PopoverContent>
    </Popover>
  );
}

type VendorBusinessHoursPanelProps = {
  vendorId: string | undefined | null;
  /** Extra class on the outer wrapper (e.g. spacing) */
  className?: string;
};

export function VendorBusinessHoursPanel({ vendorId, className }: VendorBusinessHoursPanelProps) {
  const { toast } = useToast();
  const [savingHours, setSavingHours] = useState(false);
  /** Bumps when "apply to all" fires so that row's Switch remounts (one-shot). */
  const [applyAllSwitchBust, setApplyAllSwitchBust] = useState<Record<number, number>>({});
  const [hours, setHours] = useState<HourRow[]>(
    DAYS.map(({ d }) => ({
      day_of_week: d,
      open_time: null,
      close_time: null,
      is_closed: true,
    }))
  );

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('vendor_hours')
        .select('day_of_week,open_time,close_time,is_closed')
        .eq('vendor_id', vendorId)
        .order('day_of_week');
      if (cancelled) return;
      if (error) return;
      const byDay = new Map<number, HourRow>();
      for (const r of (data || []) as HourRow[]) byDay.set(r.day_of_week, r);
      setHours(
        DAYS.map(({ d }) =>
          byDay.get(d) || {
            day_of_week: d,
            open_time: null,
            close_time: null,
            is_closed: true,
          }
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  async function handleSaveHours() {
    if (!vendorId) return;
    setSavingHours(true);
    try {
      const rows = hours.map((h) => ({
        vendor_id: vendorId,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : fromTimeInput(toTimeInput(h.open_time) || '09:00'),
        close_time: h.is_closed ? null : fromTimeInput(toTimeInput(h.close_time) || '17:00'),
        is_closed: h.is_closed,
      }));
      const { error } = await supabase.from('vendor_hours').upsert(rows, {
        onConflict: 'vendor_id,day_of_week',
      });
      if (error) throw error;
      toast({ title: 'Hours saved', description: 'Your listing hours were updated.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Could not save hours', description: msg, variant: 'destructive' });
    } finally {
      setSavingHours(false);
    }
  }

  function applyThisDayToAllDays(sourceIdx: number) {
    const label = DAYS[sourceIdx]?.label ?? 'This day';
    setHours((prev) => {
      const src = prev[sourceIdx];
      if (!src) return prev;
      return prev.map((h, i) =>
        i === sourceIdx
          ? h
          : {
              ...h,
              is_closed: src.is_closed,
              open_time: src.open_time,
              close_time: src.close_time,
            }
      );
    });
    setApplyAllSwitchBust((s) => ({ ...s, [sourceIdx]: (s[sourceIdx] ?? 0) + 1 }));
    toast({
      title: 'Applied to every day',
      description: `All days now match ${label}. Tap Save hours when you are done.`,
    });
  }

  if (!vendorId) {
    return <p className="text-sm text-gray-500">Select a store to edit business hours.</p>;
  }

  return (
    <div className={className}>
      <p className="mb-3 text-sm text-gray-400 md:mb-4">
        Shown on your public listing and checkout availability checks.
      </p>
      <p className="mb-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200/90 md:hidden">
        Tap a time bar to set open or close. Times use{' '}
        <span className="font-semibold text-white">AM / PM</span>.
      </p>
      <div className="space-y-3">
        {DAYS.map(({ d, label }) => {
          const row = hours.find((h) => h.day_of_week === d)!;
          const idx = hours.findIndex((h) => h.day_of_week === d);
          return (
            <div
              key={d}
              className="rounded-xl border border-gray-800 bg-black/35 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[3.5rem_minmax(9.5rem,auto)_1fr] md:items-center md:gap-x-4">
                <div className="flex items-center justify-between gap-3 md:contents">
                  <span className="text-base font-semibold text-white md:col-start-1">{label}</span>
                  <div className="flex w-full max-w-[min(100%,20rem)] items-center justify-between gap-2 rounded-lg border border-gray-800/80 bg-gray-950/60 px-3 py-2.5 md:col-start-2 md:max-w-none">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!row.is_closed}
                        onCheckedChange={(c) => {
                          const next = [...hours];
                          next[idx] = { ...row, is_closed: !c };
                          setHours(next);
                        }}
                      />
                      <span
                        className={cn(
                          'min-w-[3.25rem] text-sm font-semibold',
                          row.is_closed ? 'text-gray-500' : 'text-emerald-400'
                        )}
                      >
                        {row.is_closed ? 'Closed' : 'Open'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 md:col-start-3 md:min-h-[48px] md:items-center">
                  {row.is_closed ? (
                    <p className="py-2 text-sm text-gray-500 md:py-0 md:text-right">
                      No hours when closed
                    </p>
                  ) : (
                    <div className="flex w-full items-stretch gap-2">
                      <TimeBar
                        label="Opens"
                        value={row.open_time}
                        fallbackHm="09:00"
                        disabled={false}
                        variant="open"
                        onChange={(next) => {
                          const n = [...hours];
                          n[idx] = { ...row, open_time: next };
                          setHours(n);
                        }}
                      />
                      <span
                        className="flex shrink-0 items-center self-center px-0.5 text-sm font-medium text-gray-500"
                        aria-hidden
                      >
                        to
                      </span>
                      <TimeBar
                        label="Closes"
                        value={row.close_time}
                        fallbackHm="17:00"
                        disabled={false}
                        variant="close"
                        onChange={(next) => {
                          const n = [...hours];
                          n[idx] = { ...row, close_time: next };
                          setHours(n);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800/50 pt-3">
                <span className="text-xs text-gray-500">
                  Use <span className="font-medium text-gray-400">{label}</span>&apos;s schedule for every day
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Apply all
                  </span>
                  <Switch
                    key={`apply-all-${d}-${applyAllSwitchBust[d] ?? 0}`}
                    defaultChecked={false}
                    aria-label={`Copy ${label} open hours and status to every other day`}
                    className="data-[state=checked]:bg-green-600"
                    onCheckedChange={(on) => {
                      if (on) applyThisDayToAllDays(idx);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={savingHours}
          onClick={() => void handleSaveHours()}
          className="bg-green-700 hover:bg-green-600"
        >
          {savingHours ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save hours'}
        </Button>
      </div>
    </div>
  );
}

export default VendorBusinessHoursPanel;
