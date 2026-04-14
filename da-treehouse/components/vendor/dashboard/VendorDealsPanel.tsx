"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number;
  products: string[];
  start_date: string;
  end_date: string;
};

type ProductOpt = { id: string; name: string };

export function VendorDealsPanel({ vendorId }: { vendorId: string }) {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [productOpts, setProductOpts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("10");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set()
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const [dRes, pRes] = await Promise.all([
      supabase
        .from("deals")
        .select(
          "id, title, description, discount_percent, products, start_date, end_date"
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name").eq("vendor_id", vendorId),
    ]);
    if (dRes.error) setError(dRes.error.message);
    else {
      setDeals(
        (dRes.data ?? []).map((row) => ({
          ...row,
          products: (row.products as string[]) ?? [],
        })) as DealRow[]
      );
    }
    if (!pRes.error) setProductOpts(pRes.data ?? []);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setDiscount("10");
    setStartDate("");
    setEndDate("");
    setSelectedProductIds(new Set());
  }

  function startEdit(d: DealRow) {
    setEditingId(d.id);
    setTitle(d.title);
    setDescription(d.description ?? "");
    setDiscount(String(d.discount_percent));
    setStartDate(d.start_date.slice(0, 10));
    setEndDate(d.end_date.slice(0, 10));
    setSelectedProductIds(new Set(d.products));
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveDeal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pct = parseInt(discount, 10);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Discount must be 0–100.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (startDate > endDate) {
      setError("End date must be on or after start date.");
      return;
    }

    const supabase = createBrowserSupabase();
    const payload = {
      vendor_id: vendorId,
      title: title.trim(),
      description: description.trim() || null,
      discount_percent: pct,
      products: Array.from(selectedProductIds),
      start_date: startDate,
      end_date: endDate,
    };

    if (editingId) {
      const { error: uErr } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", editingId)
        .eq("vendor_id", vendorId);
      if (uErr) {
        setError(uErr.message);
        return;
      }
    } else {
      const { error: iErr } = await supabase.from("deals").insert(payload);
      if (iErr) {
        setError(iErr.message);
        return;
      }
    }
    resetForm();
    load();
  }

  async function removeDeal(id: string) {
    if (!confirm("Delete this deal?")) return;
    const supabase = createBrowserSupabase();
    const { error: dErr } = await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("vendor_id", vendorId);
    if (dErr) setError(dErr.message);
    else load();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={saveDeal}
        className="space-y-3 rounded-xl border bg-card p-4"
      >
        <h3 className="text-sm font-semibold">
          {editingId ? "Edit deal" : "Create deal"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="d-title">Title</Label>
            <Input
              id="d-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="d-desc">Description</Label>
            <textarea
              id="d-desc"
              className="border-input min-h-[64px] w-full rounded-lg border bg-transparent px-2 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-pct">Discount %</Label>
            <Input
              id="d-pct"
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-start">Start date</Label>
            <Input
              id="d-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="d-end">End date</Label>
            <Input
              id="d-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Products in this deal</Label>
            {productOpts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add products first in the Products tab.
              </p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-sm">
                {productOpts.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                      {p.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">
            {editingId ? "Save deal" : "Create deal"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your deals</h3>
          <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deals yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {deals.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.discount_percent}% off · {d.start_date.slice(0, 10)} →{" "}
                    {d.end_date.slice(0, 10)} · {d.products.length} product(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(d)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeDeal(d.id)}
                  >
                    Delete
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
