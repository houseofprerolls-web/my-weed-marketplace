'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, Loader2, Medal, ShoppingBag, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type StoreItemRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  item_type: string;
  stock_remaining: number | null;
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Some RPCs return jsonb as a parsed array; others may return a JSON string depending on client/version. */
function rpcJsonArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500',
        className
      )}
    >
      {children}
    </h2>
  );
}

export default function LoyaltyStorePage() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [monthPoints, setMonthPoints] = useState<number | null>(null);
  const [spendablePoints, setSpendablePoints] = useState<number | null>(null);
  const [grandPrize, setGrandPrize] = useState<PrizeRow | null>(null);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItemRow[]>([]);
  const [monthLabel, setMonthLabel] = useState('');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    try {
      const signedIn = Boolean(userId);
      const [ptsRes, spendRes, prizeRes, lbRes, storeRes] = await Promise.all([
        signedIn
          ? supabase.rpc('datreehouse_my_loyalty_month_points')
          : Promise.resolve({ data: null, error: null }),
        signedIn
          ? supabase.rpc('datreehouse_my_loyalty_spendable_points')
          : Promise.resolve({ data: null, error: null }),
        supabase.rpc('datreehouse_monthly_prizes_public'),
        supabase.rpc('datreehouse_loyalty_leaderboard_public', { p_limit: 3 }),
        supabase.rpc('datreehouse_loyalty_store_items_public'),
      ]);

      if (signedIn && !ptsRes.error && ptsRes.data != null) {
        setMonthPoints(num(ptsRes.data));
      } else {
        setMonthPoints(signedIn ? 0 : null);
      }

      if (signedIn && !spendRes.error && spendRes.data != null) {
        setSpendablePoints(num(spendRes.data));
      } else {
        setSpendablePoints(signedIn ? 0 : null);
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
        const row1 = pr.find((p) => num(p.rank) === 1);
        if (row1) {
          const raw = row1.image_url != null ? String(row1.image_url).trim() : '';
          setGrandPrize({
            rank: 1,
            title: String(row1.title || ''),
            description: row1.description != null ? String(row1.description) : null,
            image_url: raw.length ? raw : null,
          });
        } else {
          setGrandPrize(null);
        }
      } else {
        setGrandPrize(null);
        setMonthLabel('This month');
      }

      const lbRowsRaw = !lbRes.error ? rpcJsonArray(lbRes.data) : [];
      const rows = lbRowsRaw.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          sort_index: num(row.sort_index),
          username: String(row.username || ''),
          points: num(row.points),
          is_bot: Boolean(row.is_bot),
          prize_eligible_rank: row.prize_eligible_rank != null ? num(row.prize_eligible_rank) : null,
          subtitle: row.subtitle != null ? String(row.subtitle) : null,
        };
      });
      setBoard(rows.slice(0, 3));

      const storeRowsRaw = !storeRes.error ? rpcJsonArray(storeRes.data) : [];
      setStoreItems(
        storeRowsRaw.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id: String(row.id ?? ''),
            title: String(row.title ?? ''),
            description: row.description != null ? String(row.description) : null,
            image_url: row.image_url != null && String(row.image_url).trim() ? String(row.image_url).trim() : null,
            points_cost: num(row.points_cost),
            item_type: String(row.item_type ?? 'other'),
            stock_remaining:
              row.stock_remaining === null || row.stock_remaining === undefined ? null : num(row.stock_remaining),
          };
        })
      );
    } catch (e) {
      console.error('[loyalty-store] load failed', e);
      setMonthPoints(userId ? 0 : null);
      setSpendablePoints(userId ? 0 : null);
      setGrandPrize(null);
      setMonthLabel('This month');
      setBoard([]);
      setStoreItems([]);
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    let safety: ReturnType<typeof setTimeout> | undefined;
    safety = setTimeout(() => {
      setReady(true);
    }, 12_000);
    void load().finally(() => {
      if (safety) clearTimeout(safety);
    });
    return () => {
      if (safety) clearTimeout(safety);
    };
  }, [load]);

  async function handleRedeem(itemId: string) {
    if (!user) return;
    setRedeemMessage(null);
    setRedeemingId(itemId);
    try {
      const { data, error } = await supabase.rpc('datreehouse_loyalty_redeem_store_item', {
        p_item_id: itemId,
      });
      if (error) {
        setRedeemMessage(error.message || 'Could not redeem.');
        return;
      }
      const j = data as { ok?: boolean; error?: string; new_balance?: number } | null;
      if (!j || !j.ok) {
        setRedeemMessage(
          j?.error === 'insufficient_points' ? 'Not enough points (lifetime balance).' : j?.error || 'Could not redeem.'
        );
        return;
      }
      setRedeemMessage('Redeemed — we will follow up if fulfillment needs your email.');
      setSpendablePoints(typeof j.new_balance === 'number' ? j.new_balance : null);
      await load();
    } finally {
      setRedeemingId(null);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-zinc-400">
        <p>Loyalty is not available (missing configuration).</p>
        <Button asChild variant="outline" className="mt-6 border-zinc-700 text-white">
          <Link href="/">Home</Link>
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime/80" aria-hidden />
        <p className="text-sm">Loading rewards…</p>
      </div>
    );
  }

  const spendableDisplay = spendablePoints == null ? '—' : spendablePoints.toLocaleString();
  const monthDisplay =
    monthPoints == null ? '—' : monthPoints.toLocaleString();

  return (
    <div className="min-h-[70vh] bg-zinc-950 text-white">
      <div className="relative border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-8 gap-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <Link href="/discover">
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back
            </Link>
          </Button>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-lime/25 bg-brand-lime/10 px-3 py-1 text-xs font-medium text-brand-lime">
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                Da Treehouse loyalty
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Rewards & points store</h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
                Earn <span className="font-medium text-brand-lime">1 point per $1</span> on completed orders. The
                monthly leaderboard resets each calendar month (UTC). Spend your lifetime balance on items below — separate
                from the top-3 monthly giveaway.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">This month (UTC)</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
                {user ? monthDisplay : '—'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {user ? 'Shown on your trophy badge for the giveaway.' : 'Sign in to track monthly points.'}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Spendable balance</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-brand-lime">
                {user ? spendableDisplay : '—'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {user
                  ? 'Lifetime earned minus store redemptions.'
                  : 'Sign in to redeem with your points.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12">
          <div className="min-w-0 space-y-14">
            {!user ? (
              <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/25 p-5 sm:flex-row sm:px-6">
                <p className="text-center text-sm text-zinc-400 sm:text-left">
                  Sign in to earn monthly points, see your spendable balance, and redeem store items.
                </p>
                <Button asChild className="shrink-0 bg-brand-lime text-black hover:bg-brand-lime/90">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>
            ) : null}

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-brand-lime/90" aria-hidden />
                <SectionTitle>Monthly giveaway · {monthLabel || 'This month'}</SectionTitle>
              </div>
              {!grandPrize ? (
                <p className="rounded-lg border border-dashed border-green-900/30 bg-gray-900/40 px-4 py-10 text-center text-sm text-zinc-500">
                  Grand prize for this month will appear here once published.
                </p>
              ) : (
                <div
                  className={cn(
                    'overflow-hidden rounded-lg border border-green-900/25 bg-black/20 shadow-sm transition-all duration-200',
                    'hover:-translate-y-0.5 hover:border-green-600/45 hover:shadow-lg hover:shadow-black/30'
                  )}
                >
                  {grandPrize.image_url ? (
                    <div className="aspect-[2.15/1] w-full overflow-hidden border-b border-green-900/20 bg-gray-900 sm:aspect-[2.4/1]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin-managed prize URL */}
                      <img
                        src={grandPrize.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'border-t border-green-900/20 bg-gradient-to-br from-gray-900 to-black px-4 py-4 sm:px-5 sm:py-5',
                      !grandPrize.image_url && 'rounded-t-lg border-t-0'
                    )}
                  >
                    <h3 className="text-lg font-bold leading-snug text-white sm:text-xl">{grandPrize.title}</h3>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-sky-400/90" aria-hidden />
                <SectionTitle>Points store</SectionTitle>
              </div>

              {redeemMessage ? (
                <p className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-center text-sm text-zinc-200">
                  {redeemMessage}
                </p>
              ) : null}

              {storeItems.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-10 text-center text-sm text-zinc-500">
                  No store items right now — check back soon.
                </p>
              ) : (
                <ul className="space-y-4">
                  {storeItems.map((item) => {
                    const canRedeem =
                      Boolean(user) &&
                      spendablePoints != null &&
                      item.points_cost > 0 &&
                      spendablePoints >= item.points_cost;
                    const stockLabel = item.stock_remaining == null ? null : `${item.stock_remaining} in stock`;
                    return (
                      <li
                        key={item.id}
                        className="group overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/25 shadow-sm transition-colors hover:border-zinc-700/90 hover:bg-zinc-900/40"
                      >
                        {item.image_url ? (
                          <div className="border-b border-zinc-800/80 bg-zinc-900/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt=""
                              className="aspect-[16/9] w-full object-cover sm:aspect-[2/1] sm:max-h-52"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ) : null}
                        <div className="space-y-3 p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-lg font-semibold text-white">{item.title}</p>
                              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                                {item.item_type}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-brand-lime/10 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-brand-lime ring-1 ring-brand-lime/20">
                              {item.points_cost.toLocaleString()} pts
                            </span>
                          </div>
                          {item.description ? (
                            <p className="text-sm leading-relaxed text-zinc-400">{item.description}</p>
                          ) : null}
                          {stockLabel ? <p className="text-xs text-zinc-500">{stockLabel}</p> : null}
                          <Button
                            type="button"
                            className="w-full bg-brand-lime text-black hover:bg-brand-lime/90 sm:w-auto sm:min-w-[8rem]"
                            disabled={!user || !canRedeem || redeemingId === item.id}
                            onClick={() => void handleRedeem(item.id)}
                          >
                            {redeemingId === item.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redeeming…
                              </>
                            ) : !user ? (
                              'Sign in to redeem'
                            ) : !canRedeem ? (
                              'Not enough points'
                            ) : (
                              'Redeem'
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="mt-14 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
            <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-3">
                <Medal className="h-4 w-4 shrink-0 text-amber-400/90" aria-hidden />
                <SectionTitle>Leaderboard · top 3</SectionTitle>
              </div>
            {board.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                No activity this month yet — shop to climb the board.
              </p>
            ) : (
              <ol className="space-y-2">
                {board.map((row, i) => (
                  <li
                    key={`${row.username}-${row.points}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3 sm:px-4 sm:py-3.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 font-mono text-xs text-zinc-400">
                        {row.sort_index}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">@{row.username}</p>
                        {row.prize_eligible_rank != null ? (
                          <p className="text-[10px] font-medium uppercase tracking-wide text-brand-lime/90">
                            Prize tier {row.prize_eligible_rank}
                          </p>
                        ) : row.subtitle ? (
                          <p className="truncate text-[10px] text-zinc-500">{row.subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-right font-mono text-xs tabular-nums text-zinc-300 sm:text-sm">
                      {row.points.toLocaleString()} <span className="text-zinc-500">pts</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
