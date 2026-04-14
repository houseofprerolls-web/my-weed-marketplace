"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createDirectoryVendorAction,
  deleteDirectoryVendorAction,
} from "@/app/admin/directory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DirectoryVendorRow = {
  id: string;
  name: string;
  slug: string;
  license_number: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_live: boolean;
  license_status: string;
  is_directory_listing: boolean;
  user_id: string | null;
};

export function AdminDirectoryClient({
  initialRows,
}: {
  initialRows: DirectoryVendorRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createDirectoryVendorAction(fd);
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Remove directory listing “${name}”? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await deleteDirectoryVendorAction(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onCreate}
        className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h2 className="font-display text-lg font-semibold text-white">
          Add directory listing
        </h2>
        <p className="text-xs text-neutral-400">
          Creates an approved, live storefront with <code className="text-neutral-300">user_id</code>{" "}
          null. Use for curated listings only.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dir-name" className="text-neutral-300">
              Dispensary name
            </Label>
            <Input
              id="dir-name"
              name="name"
              required
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dir-slug" className="text-neutral-300">
              URL slug
            </Label>
            <Input
              id="dir-slug"
              name="slug"
              placeholder="auto from name if empty"
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dir-license" className="text-neutral-300">
              License number
            </Label>
            <Input
              id="dir-license"
              name="licenseNumber"
              required
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dir-address" className="text-neutral-300">
              Street address
            </Label>
            <Input
              id="dir-address"
              name="address"
              required
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dir-city" className="text-neutral-300">
              City
            </Label>
            <Input
              id="dir-city"
              name="city"
              required
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dir-state" className="text-neutral-300">
              State
            </Label>
            <Input
              id="dir-state"
              name="state"
              required
              maxLength={2}
              placeholder="CA"
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dir-zip" className="text-neutral-300">
              ZIP
            </Label>
            <Input
              id="dir-zip"
              name="zip"
              required
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dir-phone" className="text-neutral-300">
              Phone (optional)
            </Label>
            <Input
              id="dir-phone"
              name="phone"
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="dir-logo" className="text-neutral-300">
              Logo image URL (optional)
            </Label>
            <Input
              id="dir-logo"
              name="logoUrl"
              type="url"
              placeholder="https://…"
              className="border-white/15 bg-neutral-950/60 text-white"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-hover)]"
        >
          Create listing
        </Button>
      </form>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-white">
          Current directory treehouses
        </h2>
        {initialRows.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {initialRows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-neutral-400">
                    <code>{r.slug}</code>
                    {" · "}
                    {r.city}, {r.state} {r.zip}
                    {" · "}
                    <span className="uppercase">{r.license_status}</span>
                    {r.is_live ? " · live" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/vendors/${r.slug}`}>View</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => onDelete(r.id, r.name)}
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
