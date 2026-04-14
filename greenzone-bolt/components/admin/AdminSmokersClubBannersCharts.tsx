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

const AXIS = { stroke: '#64748b', fontSize: 10 };
const GRID = { stroke: '#27272a' };
const TOOLTIP_STYLE = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#e4e4e7',
};

type Row = { status: string; placement_key?: string | null };

type Props = { rows: Row[] };

export function AdminSmokersClubBannersCharts({ rows }: Props) {
  const statusPie = useMemo(() => {
    let pending = 0;
    let live = 0;
    let other = 0;
    for (const r of rows) {
      if (r.status === 'pending') pending += 1;
      else if (r.status === 'active') live += 1;
      else other += 1;
    }
    return [
      { name: 'Pending', value: pending, fill: '#fbbf24' },
      { name: 'Live', value: live, fill: '#22c55e' },
      { name: 'Other', value: other, fill: '#52525b' },
    ].filter((d) => d.value > 0);
  }, [rows]);

  const placementBars = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.status !== 'pending' && r.status !== 'active') continue;
      const k = (r.placement_key || 'unknown').replace(/_/g, ' ');
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({
        name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
        full: name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-500">
        No slides in queue yet — charts will appear when banners exist.
      </p>
    );
  }

  /** Extra vertical room so Y-axis labels + bars don’t collide; clip overflow outside the card. */
  const barChartHeight = Math.max(260, placementBars.length * 40 + 56);

  return (
    <div className="isolate z-0 grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="relative z-0 min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h3 className="mb-1 text-sm font-medium text-white">Queue by status</h3>
        <p className="mb-2 text-xs text-zinc-500">Pending vs approved (and any other statuses).</p>
        <div className="h-[268px] w-full min-h-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <PieChart margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <Pie
                data={statusPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="44%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
              >
                {statusPie.map((e, i) => (
                  <Cell key={i} fill={e.fill} stroke="#18181b" />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} wrapperStyle={{ zIndex: 20 }} />
              <Legend
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
                wrapperStyle={{ color: '#a1a1aa', fontSize: 11, paddingTop: 6 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative z-0 min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-black/40 p-4">
        <h3 className="mb-1 scroll-mt-28 text-sm font-medium text-white" id="admin-banner-active-by-placement">
          Active rows by placement
        </h3>
        <p className="mb-2 text-xs text-zinc-500">Pending + approved only, top placements.</p>
        <div className="w-full min-h-0 overflow-hidden" style={{ height: barChartHeight }}>
          <ResponsiveContainer width="100%" height={barChartHeight} debounce={50}>
            <BarChart
              layout="vertical"
              data={placementBars}
              margin={{ top: 16, right: 28, left: 20, bottom: 20 }}
            >
              <CartesianGrid {...GRID} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={AXIS} tickMargin={8} />
              <YAxis
                type="category"
                dataKey="name"
                width={124}
                tick={AXIS}
                interval={0}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                wrapperStyle={{ zIndex: 20 }}
                formatter={(v: number) => [v, 'slides']}
                labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ''}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {placementBars.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#b8f23a' : '#22c55e'} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
