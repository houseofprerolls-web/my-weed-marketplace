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
} from 'recharts';
import type { VendorPickRow } from '@/components/admin/VendorSlotSearchPicker';

const RANKS = [1, 2, 3, 4, 5, 6, 7] as const;
const AXIS = { stroke: '#64748b', fontSize: 10 };
const GRID = { stroke: '#27272a' };
const TOOLTIP_STYLE = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #27272a',
  borderRadius: 8,
  color: '#e4e4e7',
};

function buildSeries(slots: Record<number, string>, vendors: VendorPickRow[]) {
  const byId = new Map(vendors.map((v) => [v.id, v.name || '']));
  return RANKS.map((rank) => {
    const id = slots[rank];
    return {
      slot: `${rank}`,
      filled: id ? 1 : 0.22,
      hasVendor: Boolean(id),
      label: id ? String(byId.get(id) || id).slice(0, 20) : 'Open → backfill',
    };
  });
}

type Props = {
  treeSlots: Record<number, string>;
  deliverySlots: Record<number, string>;
  storefrontSlots: Record<number, string>;
  vendors: VendorPickRow[];
};

export function AdminSmokersClubPlacementPreviewCharts({
  treeSlots,
  deliverySlots,
  storefrontSlots,
  vendors,
}: Props) {
  const tree = useMemo(() => buildSeries(treeSlots, vendors), [treeSlots, vendors]);
  const delivery = useMemo(() => buildSeries(deliverySlots, vendors), [deliverySlots, vendors]);
  const storefront = useMemo(() => buildSeries(storefrontSlots, vendors), [storefrontSlots, vendors]);

  const mini = (title: string, data: ReturnType<typeof buildSeries>) => (
    <div className="rounded-lg border border-zinc-800 bg-black/35 p-3">
      <h4 className="mb-2 text-xs font-medium text-zinc-300">{title}</h4>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid {...GRID} strokeDasharray="3 3" />
            <XAxis dataKey="slot" tick={AXIS} />
            <YAxis hide domain={[0, 1.05]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => [value >= 0.9 ? 'Pinned rung' : 'Open rung', '']}
              labelFormatter={(_, p) => {
                const row = p?.[0]?.payload as (typeof data)[0];
                if (!row) return '';
                return `Slot ${row.slot} · ${row.label}`;
              }}
            />
            <Bar dataKey="filled" radius={[3, 3, 0, 0]}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.hasVendor ? '#22c55e' : '#3f3f46'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="mb-6 rounded-xl border border-green-900/25 bg-gray-950/50 p-4">
      <h3 className="mb-1 text-sm font-semibold text-white">Placement snapshot (this market)</h3>
      <p className="mb-4 text-xs text-gray-500">
        Green = you pinned a vendor in that rung. Gray = empty (homepage tree uses ranked backfill; Discover strips use
        their own fill rules).
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {mini('Tree ladder (homepage)', tree)}
        {mini('Discover · delivery strip', delivery)}
        {mini('Discover · storefront strip', storefront)}
      </div>
    </div>
  );
}
