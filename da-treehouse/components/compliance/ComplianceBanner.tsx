"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";

const STORAGE_KEY = "cannahub_compliance_banner_dismissed_v1";

type BannerState = { ready: boolean; dismissed: boolean };

export function ComplianceBanner() {
  const [state, setState] = useState<BannerState>({
    ready: false,
    dismissed: false,
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        dismissed = false;
      }
      setState({ ready: true, dismissed });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setState((s) => ({ ...s, dismissed: true }));
  }

  if (!state.ready || state.dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Compliance notice"
      className="border-b border-amber-900/20 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-1 text-sm leading-snug">
          <p className="font-medium">
            <span className="mr-1.5 inline-flex items-center rounded border border-current px-1.5 py-0.5 text-xs font-bold">
              21+
            </span>
            Adults only. Cannabis laws differ by state and locality.
          </p>
          <p className="text-xs opacity-90">
            {SITE_NAME} does not sell cannabis. Listings and maps are for
            discovery and information where licensed activity is allowed. This
            is not legal, medical, or professional advice.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-900/30 bg-transparent hover:bg-amber-100 dark:border-amber-400/40 dark:hover:bg-amber-900/50"
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
