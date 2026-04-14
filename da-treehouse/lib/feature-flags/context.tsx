"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type FeatureFlagsContextValue = {
  /** true = on unless explicitly false in DB */
  flags: Record<string, boolean>;
  loading: boolean;
  refetch: () => Promise<void>;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  loading: true,
  refetch: async () => {},
});

export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled");
    if (error) {
      setFlags({});
      setLoading(false);
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of data ?? []) {
      next[row.key] = row.enabled;
    }
    setFlags(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void refetch();
    });
    return () => cancelAnimationFrame(id);
  }, [refetch]);

  const value = useMemo(
    () => ({ flags, loading, refetch }),
    [flags, loading, refetch]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

/** While loading, returns defaultOn (avoid layout flash). */
export function useFeatureFlag(key: string, defaultOn = true): boolean {
  const { flags, loading } = useFeatureFlags();
  if (loading) return defaultOn;
  return flags[key] !== false;
}
