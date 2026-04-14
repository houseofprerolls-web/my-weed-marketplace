"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

type OrderRow = {
  id: string;
  status: OrderStatus;
  total_cents: number;
  pickup_or_delivery: string;
  scheduled_time: string | null;
  created_at: string;
  items: unknown;
  consumer_id: string | null;
};

export function VendorOrdersPanel({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { data, error: qErr } = await supabase
      .from("orders")
      .select(
        "id, status, total_cents, pickup_or_delivery, scheduled_time, created_at, items, consumer_id"
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    if (qErr) setError(qErr.message);
    else setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error: uErr } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("vendor_id", vendorId);
    setUpdatingId(null);
    if (uErr) setError(uErr.message);
    else load();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No orders yet. When customers place orders for your shop, they appear
          here.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border bg-card p-4 text-sm shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">
                    Order #{o.id.slice(0, 8)}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="font-semibold">
                  ${(o.total_cents / 100).toFixed(2)}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {o.pickup_or_delivery}
                {o.scheduled_time
                  ? ` · scheduled ${new Date(o.scheduled_time).toLocaleString()}`
                  : ""}
              </p>
              <div className="mb-3 grid gap-2 sm:max-w-xs">
                <Label className="text-xs">Status</Label>
                <select
                  className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
                  value={o.status}
                  disabled={updatingId === o.id}
                  onChange={(e) =>
                    updateStatus(o.id, e.target.value as OrderStatus)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Line items (JSON)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2">
                  {JSON.stringify(o.items, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
