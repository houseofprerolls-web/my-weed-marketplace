"use client";

import { useCallback, useEffect, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { extractZip5 } from "@/lib/zipUtils";
import {
  clearShopperGeo,
  persistShopperGeo,
  persistShopperZip,
  readShopperZipRaw,
} from "@/lib/shopperLocation";
import { getCurrentPosition, reverseGeocodeZipFromCoords, FALLBACK_LA_ZIP } from "@/lib/geoZip";

type Props = {
  /** Full-width row under the main nav (default) */
  variant?: "bar" | "sheet";
};

export function HeaderShopperLocation({ variant = "bar" }: Props) {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const isSheet = variant === "sheet";

  useEffect(() => {
    const sync = () => {
      const raw = readShopperZipRaw();
      if (raw && raw.length >= 5) setValue(raw.slice(0, 10));
    };
    sync();
    const onZip = () => sync();
    window.addEventListener("datreehouse:zip", onZip);
    window.addEventListener("storage", onZip);
    return () => {
      window.removeEventListener("datreehouse:zip", onZip);
      window.removeEventListener("storage", onZip);
    };
  }, []);

  const applyZip = useCallback(() => {
    const zip5 = extractZip5(value.trim());
    if (!zip5) {
      toast({
        title: "Invalid ZIP",
        description: "Enter at least 5 digits (e.g. 90210).",
        variant: "destructive",
      });
      return;
    }
    clearShopperGeo();
    persistShopperZip(zip5);
    setValue(zip5);
    toast({ title: "ZIP saved", description: `Using ${zip5} site-wide.` });
  }, [value, toast]);

  const useNearMe = useCallback(async () => {
    setGeoLoading(true);
    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const resolved = await reverseGeocodeZipFromCoords(lat, lng);
      const zip5 = extractZip5(resolved ?? "") ?? FALLBACK_LA_ZIP;
      persistShopperZip(zip5);
      persistShopperGeo(lat, lng);
      setValue(zip5);
      const usedFallback = zip5 === FALLBACK_LA_ZIP && !extractZip5(resolved ?? "");
      toast({
        title: "Location applied",
        description: usedFallback
          ? `Could not resolve ZIP — using ${FALLBACK_LA_ZIP}. Adjust ZIP above if needed.`
          : `ZIP ${zip5} saved with your position for nearby sorting.`,
      });
    } catch {
      toast({
        title: "Could not get location",
        description: "Allow location access, or enter your ZIP code.",
        variant: "destructive",
      });
    } finally {
      setGeoLoading(false);
    }
  }, [toast]);

  return (
    <div
      className={
        isSheet
          ? "flex w-full min-w-0 flex-col gap-3"
          : "flex w-full flex-row flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3"
      }
    >
      <div
        className={
          isSheet
            ? "flex min-w-0 w-full items-center gap-1.5 rounded-md border border-brand-red/30 bg-zinc-950/90 pl-2"
            : "flex min-w-[8.5rem] max-w-[11rem] flex-1 items-center gap-1.5 rounded-md border border-brand-red/30 bg-zinc-950/90 pl-2 sm:min-w-[9.5rem] sm:max-w-xs"
        }
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-lime" aria-hidden />
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          placeholder="ZIP code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyZip())}
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-white placeholder:text-gray-600 focus-visible:ring-0"
          aria-label="ZIP code"
        />
      </div>
      <div
        className={
          isSheet
            ? "grid min-w-0 w-full grid-cols-2 gap-2"
            : "flex shrink-0 items-center gap-2"
        }
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useNearMe}
          disabled={geoLoading}
          title="Use current location"
          className="h-9 border-brand-lime/40 px-2 text-brand-lime hover:bg-brand-lime/10 sm:px-3"
        >
          <Crosshair className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{geoLoading ? "…" : "Near me"}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={applyZip}
          className="h-9 bg-brand-red px-3 text-sm hover:bg-brand-red-deep sm:px-4"
        >
          Set
        </Button>
      </div>
    </div>
  );
}
