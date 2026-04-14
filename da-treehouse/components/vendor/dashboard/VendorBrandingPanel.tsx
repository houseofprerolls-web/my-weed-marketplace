"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VendorBrandingPanel({
  vendorId,
  initialLogoUrl,
  initialBannerUrl,
  initialMarkerUrl,
}: {
  vendorId: string;
  initialLogoUrl: string | null;
  initialBannerUrl: string | null;
  initialMarkerUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl ?? "");
  const [markerUrl, setMarkerUrl] = useState(initialMarkerUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const syncFromProps = useCallback(() => {
    setLogoUrl(initialLogoUrl ?? "");
    setBannerUrl(initialBannerUrl ?? "");
    setMarkerUrl(initialMarkerUrl ?? "");
  }, [initialLogoUrl, initialBannerUrl, initialMarkerUrl]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    const supabase = createBrowserSupabase();
    const { error: uErr } = await supabase
      .from("vendors")
      .update({
        logo_url: logoUrl.trim() || null,
        banner_url: bannerUrl.trim() || null,
        map_marker_image_url: markerUrl.trim() || null,
      })
      .eq("id", vendorId);
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setMessage("Photos updated. Changes appear on your storefront shortly.");
  }

  return (
    <form
      onSubmit={onSave}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-neutral-900">
          Storefront photos
        </h2>
        <p className="mt-1 text-xs text-neutral-600">
          Swap your logo, banner, or map marker any time—use a public image URL
          (e.g. from your CDN or storage). Map marker defaults to logo if empty.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-[var(--brand-green)]/30 bg-[var(--brand-green)]/5 px-3 py-2 text-sm text-neutral-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vb-logo">Logo URL</Label>
          <Input
            id="vb-logo"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vb-banner">Banner URL</Label>
          <Input
            id="vb-banner"
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vb-marker">Map pin / marker image URL</Label>
          <Input
            id="vb-marker"
            type="url"
            value={markerUrl}
            onChange={(e) => setMarkerUrl(e.target.value)}
            placeholder="Optional — square image works best"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-hover)]"
        >
          {saving ? "Saving…" : "Save photos"}
        </Button>
        {(logoUrl || bannerUrl || markerUrl) && (
          <div className="flex gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 rounded-lg border object-cover"
              />
            ) : null}
          </div>
        )}
      </div>
    </form>
  );
}
