"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  GEO_LOCAL_STORAGE_KEY,
  parseStoredGeo,
  type StoredGeo,
} from "@/lib/geo/storage";
import { Button } from "@/components/ui/button";

function writeLocal(geo: StoredGeo) {
  try {
    localStorage.setItem(GEO_LOCAL_STORAGE_KEY, JSON.stringify(geo));
  } catch {
    /* private mode / quota */
  }
}

export function GeoCapture() {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [stored, setStored] = useState<StoredGeo | null>(null);

  useEffect(() => {
    try {
      setStored(parseStoredGeo(localStorage.getItem(GEO_LOCAL_STORAGE_KEY)));
    } catch {
      setStored(null);
    }
    try {
      setDismissed(sessionStorage.getItem("cannahub_geo_banner_dismiss") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const persist = useCallback(async (lat: number, lng: number) => {
    let geo_state: string | null = null;
    try {
      const r = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
      );
      if (r.ok) {
        const j = (await r.json()) as { geo_state?: string | null };
        if (typeof j.geo_state === "string") geo_state = j.geo_state;
      }
    } catch {
      /* optional */
    }

    const payload: StoredGeo = {
      lat,
      lng,
      geo_state,
      updatedAt: new Date().toISOString(),
    };
    writeLocal(payload);
    setStored(payload);
    setMsg(
      geo_state
        ? `Saved approximate area (${geo_state}).`
        : "Saved approximate location."
    );

    const supabase = createBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({
          geo_lat: lat,
          geo_lng: lng,
          geo_state,
          geo_verified: true,
          geo_verified_at: now,
        })
        .eq("id", session.user.id);
      if (error) {
        setMsg(
          "Saved on this device; could not sync to your account (try again later)."
        );
      }
    }
  }, []);

  const onUseLocation = useCallback(() => {
    setBusy(true);
    setMsg(null);
    if (!navigator.geolocation) {
      setMsg("Geolocation is not supported in this browser.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await persist(pos.coords.latitude, pos.coords.longitude);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setMsg("Location permission denied or unavailable.");
        setBusy(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
    );
  }, [persist]);

  if (dismissed) return null;

  return (
    <div className="border-b border-border/80 bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground sm:text-sm">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        <span>
          {stored
            ? `Location hint: ${stored.geo_state ?? `${stored.lat.toFixed(2)}, ${stored.lng.toFixed(2)}`} · tap to refresh`
            : "Optional: share approximate location for compliance-aware browsing."}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={onUseLocation}
          >
            {busy ? "Working…" : stored ? "Update location" : "Use my location"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                sessionStorage.setItem("cannahub_geo_banner_dismiss", "1");
              } catch {
                /* */
              }
              setDismissed(true);
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>
      {msg ? (
        <p className="mt-1 text-[11px] text-foreground/80 sm:text-xs">{msg}</p>
      ) : null}
    </div>
  );
}
