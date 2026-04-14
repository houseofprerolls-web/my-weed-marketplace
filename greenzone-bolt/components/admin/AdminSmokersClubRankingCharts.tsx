'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { SmokersClubTreeRankingReport } from '@/lib/smokersClub';
import type { SmokersClubScoreBreakdown } from '@/lib/smokersClubRanking';

const AXIS = { stroke: '#64748b', fontSize: 11 };
const GRID = { stroke: '#27272a' };
const TOOLTIP_STYLE = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#e4e4e7',
};

const GREEN = '#22c55e';
const LIME = '#b8f23a';
const TEAL = '#2dd4bf';
const BLUE = '#38bdf8';
const VIOLET = '#a78bfa';
const AMBER = '#fbbf24';
const SLATE = '#64748b';
function bucketBreakdown(b: SmokersClubScoreBreakdown) {
  let zip = 0;
  let orders = 0;
  let tree = 0;
  let listing = 0;
  let rotation = 0;
  for (const line of b.lines) {
    switch (line.key) {
      case 'zip':
      case 'distance':
        zip += line.points;
        break;
      case 'orders':
        orders += line.points;
        break;
      case 'tree_engagement':
        tree += line.points;
        break;
      case 'daily_rotation':
        rotation += line.points;
        break;
      default:
        listing += line.points;
        break;
    }
  }
  return { zip, orders, tree, listing, rotation };
}

type Props = { report: SmokersClubTreeRankingReport };

export function AdminSmokersClubRankingCharts({ report }: Props) {
  const maxBackfillScore = useMemo(() => {
    const fromSlots = report.slots
      .map((s) => s.compositeScore)
      .filter((x): x is number => typeof x === 'number');
    const fromLb = report.backfillLeaderboard.map((r) => r.compositeScore);
    return Math.max(1, ...fromSlots, ...fromLb);
  }, [report.slots, report.backfillLeaderboard]);

  const ladderData = useMemo(
    () =>
      report.slots.map((s) => ({
        slot: `S${s.slotRank}`,
        slotRank: s.slotRank,
        source: s.source,
        vendor: (s.vendorName || '—').slice(0, 18),
        /** Visual height: pins use ~35% of max scale (not real points); empty = 0. */
        plotValue:
          s.source === 'admin_pin'
            ? Math.round(maxBackfillScore * 0.35)
            : s.source === 'empty'
              ? 0
              : (s.compositeScore ?? 0),
        realScore: s.compositeScore,
      })),
    [report.slots, maxBackfillScore]
  );

  const slotMixPie = useMemo(() => {
    let pins = 0;
    let backfill = 0;
    let empty = 0;
    for (const s of report.slots) {
      if (s.source === 'admin_pin') pins += 1;
      else if (s.source === 'ranked_backfill') backfill += 1;
      else empty += 1;
    }
    return [
      { name: 'Admin pin', value: pins, fill: AMBER },
      { name: 'Ranked backfill', value: backfill, fill: GREEN },
      { name: 'Open', value: empty, fill: SLATE },
    ].filter((d) => d.value > 0);
  }, [report.slots]);

  const leaderboardData = useMemo(
    () =>
      report.backfillLeaderboard.slice(0, 14).map((r) => ({
        name: r.vendorName.length > 22 ? `${r.vendorName.slice(0, 20)}…` : r.vendorName,
        fullName: r.vendorName,
        score: r.compositeScore,
        placed: r.assignedToSlotRank != null,
      })),
    [report.backfillLeaderboard]
  );

  const stackedTop = useMemo(() => {
    const top = report.backfillLeaderboard.slice(0, 6);
    return top.map((r) => {
      const b = bucketBreakdown(r.breakdown);
      return {
        name: r.vendorName.length > 16 ? `${r.vendorName.slice(0, 14)}…` : r.vendorName,
        fullName: r.vendorName,
        ZIP: b.zip,
        Orders: b.orders,
        Tree: b.tree,
        Listing: b.listing,
        Rotation: b.rotation,
        total: r.compositeScore,
      };
    });
  }, [report.backfillLeaderboard]);

  const capsVsAvg = useMemo(() => {
    const rows = report.backfillLeaderboard;
    if (!rows.length) return [];
    const n = rows.length;
    let sumZip = 0;
    let sumOrders = 0;
    let sumTree = 0;
    let sumListing = 0;
    let sumRot = 0;
    for (const r of rows) {
      const b = bucketBreakdown(r.breakdown);
      sumZip += b.zip;
      sumOrders += b.orders;
      sumTree += b.tree;
      sumListing += b.listing;
      sumRot += b.rotation;
    }
    return [
      { name: 'ZIP cap', actual: Math.round(sumZip / n), cap: report.weights.zipProximityMax },
      { name: 'Orders cap', actual: Math.round(sumOrders / n), cap: report.weights.ordersMax },
      { name: 'Tree cap', actual: Math.round(sumTree / n), cap: report.weights.treeEngagementMax },
      { name: 'Listing cap', actual: Math.round(sumListing / n), cap: report.weights.listingQualityMax },
      { name: 'Rotation avg', actual: Math.round(sumRot / n), cap: report.weights.dailyRotationMax },
    ];
  }, [report.backfillLeaderboard, report.weights]);

  return (
    <div className="space-y-8">
      <p className="text-xs text-gray-500">
        Charts use the same data as the tables below. Stacked bars show how each vendor’s score splits across signal
        types (caps are maximum possible per bucket).
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h4 className="mb-1 text-sm font-medium text-white">Ladder slots (1–7)</h4>
          <p className="mb-3 text-xs text-gray-500">Score by slot; gold = admin pin (not scored), green = backfill.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ladderData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid {...GRID} strokeDasharray="3 3" />
                <XAxis dataKey="slot" tick={AXIS} />
                <YAxis tick={AXIS} width={36} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, _n, p) => {
                    const row = p?.payload as (typeof ladderData)[0];
                    if (row?.source === 'admin_pin') return ['Admin feature slot (bar height is illustrative)', ''];
                    if (row?.source === 'empty') return ['Open — filled by ranked backfill', ''];
                    return [row?.realScore ?? value, 'composite pts'];
                  }}
                  labelFormatter={(_, p) => {
                    const row = p?.[0]?.payload as (typeof ladderData)[0];
                    return row?.vendor ? `${row.slot} · ${row.vendor}` : row?.slot;
                  }}
                />
                <Bar dataKey="plotValue" radius={[4, 4, 0, 0]} name="Score">
                  {ladderData.map((e, i) => (
                    <Cell
                      key={i}
                      fill={
                        e.source === 'admin_pin' ? AMBER : e.source === 'empty' ? SLATE : GREEN
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h4 className="mb-1 text-sm font-medium text-white">How slots are filled</h4>
          <p className="mb-3 text-xs text-gray-500">Share of the seven rungs: pinned vs ranked vs open.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slotMixPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {slotMixPie.map((e, i) => (
                    <Cell key={i} fill={e.fill} stroke="#18181b" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {leaderboardData.length > 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h4 className="mb-1 text-sm font-medium text-white">Backfill merit (top scores)</h4>
          <p className="mb-3 text-xs text-gray-500">
            Horizontal bars = composite points. Darker outline = received a tree slot today.
          </p>
          <div className="min-h-[280px] w-full" style={{ height: Math.max(280, leaderboardData.length * 36) }}>
            <ResponsiveContainer width="100%" height={Math.max(280, leaderboardData.length * 36)}>
              <BarChart
                layout="vertical"
                data={leaderboardData}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid {...GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AXIS} />
                <YAxis type="category" dataKey="name" width={130} tick={AXIS} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [v, 'score']}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score">
                  {leaderboardData.map((e, i) => (
                    <Cell key={i} fill={e.placed ? LIME : '#3f3f46'} fillOpacity={e.placed ? 1 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {stackedTop.length > 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h4 className="mb-1 text-sm font-medium text-white">Score mix (top 6 by merit)</h4>
          <p className="mb-3 text-xs text-gray-500">Stacked segments = ZIP, orders, tree engagement, listing quality, daily rotation.</p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedTop} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid {...GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AXIS} />
                <YAxis type="category" dataKey="name" width={120} tick={AXIS} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, name: string) => [v, name]}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                />
                <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 11 }} />
                <Bar dataKey="ZIP" stackId="a" fill={GREEN} />
                <Bar dataKey="Orders" stackId="a" fill={TEAL} />
                <Bar dataKey="Tree" stackId="a" fill={BLUE} />
                <Bar dataKey="Listing" stackId="a" fill={VIOLET} />
                <Bar dataKey="Rotation" stackId="a" fill={AMBER} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {capsVsAvg.length > 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h4 className="mb-1 text-sm font-medium text-white">Pool average vs caps</h4>
          <p className="mb-3 text-xs text-gray-500">
            Mean points per eligible vendor in this market vs the configured maximum for each bucket (rotation max is{' '}
            {report.weights.dailyRotationMax}).
          </p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capsVsAvg} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid {...GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={AXIS} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis tick={AXIS} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 11 }} />
                <Bar dataKey="actual" name="Pool average" fill={LIME} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cap" name="Max" fill="#3f3f46" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
