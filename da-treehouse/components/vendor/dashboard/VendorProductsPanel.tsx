"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/vendor/productCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  profit_cents: number;
  inventory_count: number;
  potency_thc: number | null;
  potency_cbd: number | null;
  description: string | null;
  in_stock: boolean;
  strain_id: string | null;
  images: string[] | null;
};

type StrainOpt = { id: string; name: string; slug: string };

export function VendorProductsPanel({ vendorId }: { vendorId: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [strains, setStrains] = useState<StrainOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("flower");
  const [priceDollars, setPriceDollars] = useState("");
  const [inventory, setInventory] = useState("0");
  const [thc, setThc] = useState("");
  const [cbd, setCbd] = useState("");
  const [description, setDescription] = useState("");
  const [strainId, setStrainId] = useState("");
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [profitDollars, setProfitDollars] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const [pRes, sRes] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, category, price_cents, profit_cents, inventory_count, potency_thc, potency_cbd, description, in_stock, strain_id, images"
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase.from("strains").select("id, name, slug").order("name"),
    ]);
    if (pRes.error) setError(pRes.error.message);
    else setProducts((pRes.data ?? []) as ProductRow[]);
    if (!sRes.error) setStrains(sRes.data ?? []);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("flower");
    setPriceDollars("");
    setInventory("0");
    setThc("");
    setCbd("");
    setDescription("");
    setStrainId("");
    setInStock(true);
    setImageUrl("");
    setProfitDollars("");
  }

  function startEdit(p: ProductRow) {
    setEditingId(p.id);
    setName(p.name);
    setCategory(p.category as ProductCategory);
    setPriceDollars((p.price_cents / 100).toFixed(2));
    setInventory(String(p.inventory_count));
    setThc(p.potency_thc != null ? String(p.potency_thc) : "");
    setCbd(p.potency_cbd != null ? String(p.potency_cbd) : "");
    setDescription(p.description ?? "");
    setStrainId(p.strain_id ?? "");
    setInStock(p.in_stock);
    setImageUrl(p.images?.[0] ?? "");
    setProfitDollars(
      p.profit_cents != null && p.profit_cents > 0
        ? (p.profit_cents / 100).toFixed(2)
        : ""
    );
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(parseFloat(priceDollars || "0") * 100);
    const profitCents = Math.round(parseFloat(profitDollars || "0") * 100);
    if (!name.trim() || cents < 0 || Number.isNaN(cents)) {
      setError("Name and valid price are required.");
      return;
    }
    if (profitCents < 0 || Number.isNaN(profitCents)) {
      setError("Profit must be a valid dollar amount (0 or more).");
      return;
    }
    const supabase = createBrowserSupabase();
    const trimmedImg = imageUrl.trim();
    const images = trimmedImg ? [trimmedImg] : [];
    const payload = {
      vendor_id: vendorId,
      name: name.trim(),
      category,
      price_cents: cents,
      profit_cents: profitCents,
      inventory_count: Math.max(0, parseInt(inventory, 10) || 0),
      potency_thc: thc === "" ? null : parseFloat(thc),
      potency_cbd: cbd === "" ? null : parseFloat(cbd),
      description: description.trim() || null,
      strain_id: strainId || null,
      in_stock: inStock,
      images,
    };

    if (editingId) {
      const { error: uErr } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingId)
        .eq("vendor_id", vendorId);
      if (uErr) {
        setError(uErr.message);
        return;
      }
    } else {
      const { error: iErr } = await supabase.from("products").insert(payload);
      if (iErr) {
        setError(iErr.message);
        return;
      }
    }
    resetForm();
    load();
  }

  async function removeProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const supabase = createBrowserSupabase();
    const { error: dErr } = await supabase
      .from("products")
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
        onSubmit={saveProduct}
        className="space-y-3 rounded-xl border bg-card p-4"
      >
        <h3 className="text-sm font-semibold">
          {editingId ? "Edit product" : "Add product"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <select
              className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ProductCategory)
              }
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-price">Price (USD)</Label>
            <Input
              id="p-price"
              type="number"
              step="0.01"
              min="0"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-profit">Your profit / unit (USD)</Label>
            <Input
              id="p-profit"
              type="number"
              step="0.01"
              min="0"
              value={profitDollars}
              onChange={(e) => setProfitDollars(e.target.value)}
              placeholder="0 — internal only, not shown to shoppers"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="p-image">Menu item photo URL</Label>
            <Input
              id="p-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… (square image looks best)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-inv">Inventory</Label>
            <Input
              id="p-inv"
              type="number"
              min="0"
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-thc">THC % (optional)</Label>
            <Input
              id="p-thc"
              type="number"
              step="0.1"
              value={thc}
              onChange={(e) => setThc(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-cbd">CBD % (optional)</Label>
            <Input
              id="p-cbd"
              type="number"
              step="0.1"
              value={cbd}
              onChange={(e) => setCbd(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Strain (optional)</Label>
            <select
              className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              value={strainId}
              onChange={(e) => setStrainId(e.target.value)}
            >
              <option value="">— None —</option>
              {strains.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="p-desc">Description</Label>
            <textarea
              id="p-desc"
              className="border-input min-h-[72px] w-full rounded-lg border bg-transparent px-2 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              In stock / visible on public menu
            </span>
            <span className="text-xs text-muted-foreground">
              Uncheck to hide this item from the storefront menu (still listed
              here for you).
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save changes" : "Add product"}</Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your products</h3>
          <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · ${(p.price_cents / 100).toFixed(2)}
                    {(p.profit_cents ?? 0) > 0
                      ? ` · profit $${((p.profit_cents ?? 0) / 100).toFixed(2)}`
                      : ""}{" "}
                    · stock {p.inventory_count}
                    {p.in_stock ? "" : " · hidden from menu"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeProduct(p.id)}
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
