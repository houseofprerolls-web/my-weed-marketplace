'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { SmokersClubTreeRankingReport } from '@/lib/smokersClub';
import { AdminSmokersClubRankingCharts } from '@/components/admin/AdminSmokersClubRankingCharts';
import { readShopperGeo } from '@/lib/shopperLocation';

export function AdminSmokersClubRankingPanel() {
  const [zip, setZip] = useState('90210');
  const [date, setDate] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [orderedFill, setOrderedFill] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SmokersClubTreeRankingReport | null>(null);
  const [zipUsed, setZipUsed] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Sign in as admin to load the ranking report.');
        setLoading(false);
        return;
      }
      const q = new URLSearchParams();
      if (zip.trim()) q.set('zip', zip.trim());
      if (date.trim()) q.set('date', date.trim());
      const lt = lat.trim();
      const lg = lng.trim();
      if (lt && lg) {
        q.set('lat', lt);
        q.set('lng', lg);
      }
      if (orderedFill) q.set('ordered', '1');
      const res = await fetch(`/api/admin/smokers-club/ranking-report?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Request failed');
        setReport(null);
        return;
      }
      setReport(body.report ?? null);
      setZipUsed(typeof body.zipUsed === 'string' ? body.zipUsed : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [zip, date, lat, lng, orderedFill]);

  return (
    <Card className="border-green-900/30 bg-gray-900/50 p-4 md:p-6">
      <h2 className="mb-2 text-lg font-semibold text-white">Daily ranking (composite score)</h2>
      <p className="mb-4 text-sm text-gray-400">
        With optional lat/lng, competition uses a 15 mi disk (expanding to 20 / 25 / 35 / 50 mi only to fill sparse
        trees), delivery-ZIP override, and distance-based score instead of ZIP-string proximity. Global admin pins (
        <code className="text-gray-300">smokers_club_slot_pins</code>) apply only within 15 mi unless the vendor
        serves the preview ZIP via <code className="text-gray-300">vendor_delivery_zip5</code>.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Shopper ZIP (5 digits)</label>
          <Input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-40 border-gray-700 bg-black/40 text-white"
            placeholder="90210"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">UTC date (optional)</label>
          <Input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44 border-gray-700 bg-black/40 text-white"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Anchor lat (optional)</label>
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-36 border-gray-700 bg-black/40 text-white"
            placeholder="34.09"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Anchor lng (optional)</label>
          <Input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-36 border-gray-700 bg-black/40 text-white"
            placeholder="-118.41"
            inputMode="decimal"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-200"
          onClick={() => {
            const g = readShopperGeo();
            if (g) {
              setLat(String(g.lat));
              setLng(String(g.lng));
            }
          }}
        >
          Use my saved geo
        </Button>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="sc-ordered-fill"
            checked={orderedFill}
            onCheckedChange={(c) => setOrderedFill(c === true)}
          />
          <label htmlFor="sc-ordered-fill" className="text-xs text-gray-400">
            Ordered empty slots (no daily shuffle)
          </label>
        </div>
        <Button type="button" onClick={() => void load()} disabled={loading} className="bg-green-600 hover:bg-green-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load report'}
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {report ? (
        <div className="space-y-6">
          <div className="text-sm text-gray-400">
            <span className="text-gray-300">Market:</span> {report.marketName ?? report.marketId}{' '}
            <span className="mx-2 text-gray-600">·</span>
            <span className="text-gray-300">UTC day:</span> {report.dateKeyUtc}
            {zipUsed ? (
              <>
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-300">ZIP used:</span> {zipUsed}
              </>
            ) : null}
            {report.shopperGeoMode ? (
              <>
                <span className="mx-2 text-gray-600">·</span>
                <span className="text-gray-300">Geo mode</span>
                {report.shopperLat != null && report.shopperLng != null
                  ? ` (${report.shopperLat.toFixed(4)}, ${report.shopperLng.toFixed(4)})`
                  : ''}
                {report.backfillRadiusMiles != null ? (
                  <>
                    <span className="mx-2 text-gray-600">·</span>
                    <span className="text-gray-300">Backfill radius:</span> {report.backfillRadiusMiles} mi
                  </>
                ) : null}
              </>
            ) : null}
            <span className="mx-2 text-gray-600">·</span>
            <span className="text-gray-300">Slot fill:</span> {report.emptySlotFillMode}
          </div>

          <AdminSmokersClubRankingCharts report={report} />

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-300">Score caps (reference)</h3>
            <ul className="list-inside list-disc text-xs text-gray-500">
              <li>
                ZIP or distance proximity: up to {report.weights.zipProximityMax} pts (linear miles to 15 mi when geo
                mode)
              </li>
              <li>Orders (30d): up to {report.weights.ordersMax} pts</li>
              <li>Tree engagement (7d): up to {report.weights.treeEngagementMax} pts</li>
              <li>Listing quality: up to {report.weights.listingQualityMax} pts</li>
              <li>Daily rotation / tie-break: 0–{report.weights.dailyRotationMax} pts</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white">Slots (feature ladder 1–7)</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Slot</TableHead>
                  <TableHead className="text-gray-400">Source</TableHead>
                  <TableHead className="text-gray-400">Vendor</TableHead>
                  <TableHead className="text-right text-gray-400">Score</TableHead>
                  <TableHead className="text-gray-400">Merit #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.slots.map((s) => (
                  <TableRow key={s.slotRank} className="border-gray-800">
                    <TableCell className="font-mono text-white">{s.slotRank}</TableCell>
                    <TableCell className="text-gray-300">{s.source.replace('_', ' ')}</TableCell>
                    <TableCell className="text-gray-200">{s.vendorName ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-gray-300">
                      {s.compositeScore != null ? s.compositeScore : '—'}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {s.backfillMeritRank != null ? `#${s.backfillMeritRank}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-white">Point breakdown by vendor</h3>
            <div className="space-y-2">
              {report.slots
                .filter((s) => s.breakdown && s.vendorId)
                .map((s) => (
                  <details
                    key={s.vendorId!}
                    className="rounded-lg border border-gray-800 bg-black/30 open:bg-gray-900/40"
                  >
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm text-white marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex w-full items-center gap-2">
                        <span className="text-gray-500 select-none">▸</span>
                        <span className="font-medium">{s.vendorName}</span>
                        <span className="ml-auto font-mono text-green-400">{s.breakdown!.total} pts</span>
                      </span>
                    </summary>
                    <ul className="space-y-1 border-t border-gray-800 px-3 py-2 text-xs text-gray-400">
                      {s.breakdown!.lines.map((line) => (
                        <li key={line.key} className="flex justify-between gap-4">
                          <span>
                            <span className="text-gray-300">{line.label}</span>
                            {line.detail ? (
                              <span className="mt-0.5 block text-[11px] text-gray-500">{line.detail}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-mono text-gray-200">+{line.points}</span>
                        </li>
                      ))}
                    </ul>
                    {s.adminNote ? (
                      <p className="border-t border-gray-800 px-3 py-2 text-[11px] text-gray-500">{s.adminNote}</p>
                    ) : null}
                  </details>
                ))}
              {report.slots.some((s) => s.source === 'admin_pin') ? (
                <p className="text-xs text-gray-500">
                  Pinned vendors use admin placements only—expand scored rows above for backfill math.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white">Full backfill leaderboard</h3>
            <p className="mb-2 text-xs text-gray-500">
              Ordered by composite score within the backfill mile radius. Top N receive empty slots (
              {report.emptySlotFillMode === 'ordered' ? 'ascending slot order' : 'daily shuffle'}).
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Merit</TableHead>
                  <TableHead className="text-gray-400">Vendor</TableHead>
                  <TableHead className="text-right text-gray-400">Score</TableHead>
                  <TableHead className="text-gray-400">Assigned slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.backfillLeaderboard.map((row) => (
                  <TableRow key={row.vendorId} className="border-gray-800">
                    <TableCell className="font-mono text-gray-300">#{row.meritRank}</TableCell>
                    <TableCell className="text-gray-200">{row.vendorName}</TableCell>
                    <TableCell className="text-right font-mono text-gray-300">{row.compositeScore}</TableCell>
                    <TableCell className="text-gray-400">
                      {row.assignedToSlotRank != null ? row.assignedToSlotRank : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
