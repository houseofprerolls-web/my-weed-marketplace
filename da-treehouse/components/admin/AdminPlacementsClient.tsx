"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteMarketListingAction,
  patchMarketListingAction,
  reorderMarketListingsAction,
  upsertMarketListingAction,
} from "@/app/admin/placements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VendorOpt = { id: string; name: string; slug: string };

export type MarketOpt = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
};

export type MarketListingRow = {
  id: string;
  market_id: string;
  vendor_id: string;
  slot_rank: number;
  is_premium: boolean;
  active: boolean;
  note: string | null;
  vendors: { name: string; slug: string } | null;
};

export function AdminPlacementsClient({
  vendors,
  markets,
  listings,
}: {
  vendors: VendorOpt[];
  markets: MarketOpt[];
  listings: MarketListingRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [marketId, setMarketId] = useState(markets[0]?.id ?? "");

  const forMarket = useMemo(() => {
    return listings
      .filter((l) => l.market_id === marketId)
      .sort((a, b) => a.slot_rank - b.slot_rank);
  }, [listings, marketId]);

  const selectedMarket = markets.find((m) => m.id === marketId);

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("marketId", marketId);
      await upsertMarketListingAction(fd);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this dispensary from this region?")) return;
    setError(null);
    setBusy(true);
    try {
      await deleteMarketListingAction(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= forMarket.length) return;
    const next = [...forMarket];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    setError(null);
    startTransition(async () => {
      try {
        await reorderMarketListingsAction(
          marketId,
          next.map((r) => r.id)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed");
      }
    });
  }

  async function patchFormAction(fd: FormData) {
    setError(null);
    try {
      await patchMarketListingAction(fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-card p-4">
        <Label htmlFor="marketPick" className="text-base font-semibold">
          Listing region (California)
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Premium slots 0–9 apply per region (ZIP prefix → region). Shoppers
          with a ZIP in that region see this order on the homepage.
        </p>
        <select
          id="marketPick"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="border-input mt-3 h-10 w-full max-w-md rounded-lg border bg-transparent px-2 text-sm"
        >
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.subtitle ? ` — ${m.subtitle}` : ""}
            </option>
          ))}
        </select>
        {selectedMarket?.subtitle ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedMarket.subtitle}
          </p>
        ) : null}
      </div>

      <form onSubmit={onAdd} className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="text-base font-semibold">Add / update placement</h2>
        <p className="text-sm text-muted-foreground">
          One row per dispensary per region. Set <strong>slot</strong> 0–9
          (0 = first). Turn off <strong>Premium</strong> to keep the row but
          hide it from the homepage top strip; turn off <strong>Active</strong>{" "}
          to disable entirely.
        </p>
        <input type="hidden" name="marketId" value={marketId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="vendorId">Dispensary</Label>
            <select
              id="vendorId"
              name="vendorId"
              required
              className="border-input h-9 w-full rounded-lg border bg-transparent px-2 text-sm"
            >
              <option value="">— Select —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listingId">Existing row id (optional)</Label>
            <Input
              id="listingId"
              name="listingId"
              placeholder="Leave empty for new"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slotRank">Slot (0–9)</Label>
            <Input
              id="slotRank"
              name="slotRank"
              type="number"
              min={0}
              max={9}
              defaultValue={0}
            />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPremium"
                value="on"
                defaultChecked
                className="h-4 w-4 rounded border"
              />
              Premium (homepage top 10)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="on"
                defaultChecked
                className="h-4 w-4 rounded border"
              />
              Active
            </label>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="note">Internal note (optional)</Label>
            <Input id="note" name="note" placeholder="Sponsor / campaign" />
          </div>
        </div>
        <Button type="submit" disabled={busy || !marketId}>
          Save placement
        </Button>
      </form>

      <div>
        <h2 className="mb-3 text-base font-semibold">
          Placements in this region
        </h2>
        {!marketId ? (
          <p className="text-sm text-muted-foreground">Select a region.</p>
        ) : forMarket.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {forMarket.map((p, i) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    #{p.slot_rank + 1}{" "}
                    <span className="text-muted-foreground">·</span>{" "}
                    {p.vendors?.name ?? p.vendor_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.vendors?.slug ?? ""}{" "}
                    {!p.is_premium ? "· not premium" : ""}{" "}
                    {!p.active ? "· inactive" : ""}
                  </p>
                  {p.note ? (
                    <p className="text-xs text-muted-foreground">{p.note}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || i === forMarket.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <form action={patchFormAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="isPremium"
                      value={String(!p.is_premium)}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {p.is_premium ? "Demote" : "Premium"}
                    </Button>
                  </form>
                  <form action={patchFormAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={String(!p.active)}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {p.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => onDelete(p.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
