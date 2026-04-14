"use client";

import { useState, useTransition } from "react";
import {
  setAllFeatureFlagsAction,
  setFeatureFlagAction,
} from "@/app/admin/features/actions";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/lib/feature-flags/context";

type Row = {
  key: string;
  enabled: boolean;
  label: string;
  sort_order: number;
};

export function AdminFeatureFlagsClient({ initialRows }: { initialRows: Row[] }) {
  const { refetch } = useFeatureFlags();
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function syncRow(key: string, enabled: boolean) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, enabled } : r))
    );
  }

  function toggle(key: string, next: boolean) {
    setError(null);
    syncRow(key, next);
    startTransition(async () => {
      try {
        await setFeatureFlagAction(key, next);
        await refetch();
      } catch (e) {
        syncRow(key, !next);
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function setAll(enabled: boolean) {
    setError(null);
    setRows((prev) => prev.map((r) => ({ ...r, enabled })));
    startTransition(async () => {
      try {
        await setAllFeatureFlagsAction(enabled);
        await refetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setAll(true)}
        >
          Enable all
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setAll(false)}
        >
          Disable all
        </Button>
      </div>

      <ul className="divide-y rounded-xl border">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.key}
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={row.enabled}
                disabled={pending}
                onChange={(e) => toggle(row.key, e.target.checked)}
              />
              {row.enabled ? "On" : "Off"}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
