'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gift, Loader2, ShoppingBag, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type PrizeRow = { rank: number; title: string; description: string | null; image_url: string | null };

type LeaderRow = {
  sort_index: number;
  username: string;
  points: number;
  is_bot: boolean;
  prize_eligible_rank: number | null;
  subtitle: string | null;
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

type LoyaltyHeaderVariant = 'default' | 'compact';

export function DaTreehouseLoyaltyHeader({
  className,
  variant = 'default',
}: {
  className?: string;
  /** Tight icon + points badge for header toolbars (saves a full row on mobile). */
  variant?: LoyaltyHeaderVariant;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [monthPoints, setMonthPoints] = useState<number | null>(null);
  const [prizes, setPrizes] = useState<PrizeRow[]>([]);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthLabel, setMonthLabel] = useState<string>('');

  const loadDialog = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const [ptsRes, prizeRes, lbRes] = await Promise.all([
        user
          ? supabase.rpc('datreehouse_my_loyalty_month_points')
          : Promise.resolve({ data: 0, error: null }),
        supabase.rpc('datreehouse_monthly_prizes_public'),
        supabase.rpc('datreehouse_loyalty_leaderboard_public', { p_limit: 3 }),
      ]);

      if (!ptsRes.error) {
        setMonthPoints(num(ptsRes.data));
      } else {
        setMonthPoints(0);
      }

      if (!prizeRes.error && prizeRes.data && typeof prizeRes.data === 'object') {
        const j = prizeRes.data as {
          month_start?: string;
          prizes?: {
            rank?: number;
            title?: string;
            description?: string | null;
            image_url?: string | null;
          }[];
        };
        const ms = j.month_start;
        if (typeof ms === 'string' && ms.length >= 7) {
          const d = new Date(`${ms}T12:00:00Z`);
          setMonthLabel(d.toLocaleString(undefined, { month: 'long', year: 'numeric' }));
        } else {
          setMonthLabel('This month');
        }
        const pr = Array.isArray(j.prizes) ? j.prizes : [];
        setPrizes(
          pr.map((p) => {
            const rank = num(p.rank);
            const raw = p.image_url != null ? String(p.image_url).trim() : '';
            const image_url = rank === 1 && raw.length ? raw : null;
            return {
              rank,
              title: String(p.title || ''),
              description: p.description != null ? String(p.description) : null,
              image_url,
            };
          })
        );
      } else {
        setPrizes([]);
        setMonthLabel('This month');
      }

      if (!lbRes.error && Array.isArray(lbRes.data)) {
        const rows = (lbRes.data as Record<string, unknown>[]).map((r) => ({
          sort_index: num(r.sort_index),
          username: String(r.username || ''),
          points: num(r.points),
          is_bot: Boolean(r.is_bot),
          prize_eligible_rank: r.prize_eligible_rank != null ? num(r.prize_eligible_rank) : null,
          subtitle: r.subtitle != null ? String(r.subtitle) : null,
        }));
        setBoard(rows.slice(0, 3));
      } else {
        setBoard([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void loadDialog();
  }, [loadDialog]);

  useEffect(() => {
    if (open) void loadDialog();
  }, [open, loadDialog]);

  if (!isSupabaseConfigured) {
    return null;
  }

  const featuredGiveaway = useMemo(() => {
    if (!prizes.length) return null;
    const sorted = [...prizes].sort((a, b) => a.rank - b.rank);
    return sorted.find((p) => p.rank === 1) ?? sorted[0] ?? null;
  }, [prizes]);

  const ptsDisplay = monthPoints == null ? '0' : String(monthPoints);
  const ptsShort = useMemo(() => {
    if (monthPoints == null) return '0';
    const n = monthPoints;
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
    return `${Math.floor(n / 1_000_000)}M+`;
  }, [monthPoints]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'compact' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`Rewards · ${ptsDisplay} pts this month`}
            className={cn(
              'relative h-8 w-8 shrink-0 rounded-full border border-brand-lime/30 bg-brand-lime/10 p-0 text-brand-lime hover:bg-brand-lime/20 hover:text-white sm:h-9 sm:w-9',
              className
            )}
          >
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 min-h-[14px] min-w-[14px] rounded-full border border-zinc-800 bg-black/90 px-0.5 text-center font-mono text-[9px] font-semibold leading-[14px] text-brand-lime tabular-nums sm:text-[10px]">
              {ptsShort}
            </span>
            <span className="sr-only">Open rewards, {ptsDisplay} points this month</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Rewards"
            className={cn(
              'h-9 gap-1.5 whitespace-nowrap border border-brand-lime/25 bg-brand-lime/5 px-2.5 text-brand-lime-soft hover:bg-brand-lime/15 hover:text-white',
              className
            )}
          >
            <Trophy className="h-4 w-4 shrink-0 text-brand-lime" aria-hidden />
            <span className="hidden text-xs font-semibold sm:inline">Points</span>
            <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-white tabular-nums">
              {ptsDisplay}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto border-brand-red/20 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Gift className="h-5 w-5 text-brand-lime" aria-hidden />
            Da Treehouse rewards
          </DialogTitle>
          <p className="text-left text-sm font-normal text-zinc-400">
            Earn <span className="text-brand-lime">1 point per $1</span> spent when your order is completed. The
            leaderboard resets each calendar month (UTC). Open the points store anytime to spend lifetime points on
            rewards.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Giveaway · {monthLabel || 'This month'}
            </h3>
            {loading && !featuredGiveaway ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : !featuredGiveaway ? (
              <p className="text-sm text-zinc-500">Giveaway details for this month will appear here once published.</p>
            ) : (
              <ul className="space-y-3">
                <li className="overflow-hidden rounded-lg border border-zinc-800 bg-black/40">
                  {featuredGiveaway.image_url ? (
                    <div className="border-b border-zinc-800 bg-zinc-900/50">
                      {/* eslint-disable-next-line @next/next/no-img-element -- public prize URLs from admin */}
                      <img
                        src={featuredGiveaway.image_url}
                        alt=""
                        className="h-36 w-full object-cover sm:h-40"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : null}
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-brand-lime">{featuredGiveaway.title}</p>
                    {featuredGiveaway.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{featuredGiveaway.description}</p>
                    ) : null}
                  </div>
                </li>
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Leaderboard (top 3)</h3>
            {loading && board.length === 0 ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : board.length === 0 ? (
              <p className="text-sm text-zinc-500">No activity this month yet — shop to climb the board.</p>
            ) : (
              <ol className="space-y-1.5">
                {board.map((row, i) => (
                  <li
                    key={`${row.username}-${row.points}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900/60 px-2.5 py-2 text-sm text-zinc-100"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-zinc-500">{row.sort_index}.</span>{' '}
                      <span className="font-medium">@{row.username}</span>
                      {row.prize_eligible_rank != null ? (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-lime">
                          Prize tier {row.prize_eligible_rank}
                        </span>
                      ) : null}
                      {row.subtitle ? (
                        <p className="truncate text-[10px] text-zinc-500">{row.subtitle}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-300">
                      {row.points.toLocaleString()} pts
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="border-t border-zinc-800 pt-4">
            <Button asChild className="h-10 w-full gap-2 bg-brand-lime text-black hover:bg-brand-lime/90">
              <Link
                href="/loyalty-store"
                className="inline-flex w-full items-center justify-center gap-2"
                onClick={() => setOpen(false)}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
                Points store
              </Link>
            </Button>
            <p className="mt-2 text-center text-[11px] text-zinc-500">Full catalog, balances, and redemptions</p>
          </div>

          {!user ? (
            <p className="text-center text-xs text-zinc-500">Sign in to earn points on completed orders.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
