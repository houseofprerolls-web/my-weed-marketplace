'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type SupplyRfqDraftLine = {
  listingId: string;
  titleSnapshot: string;
  qty: number;
  unit: string;
  targetPriceCents: number | null;
};

type DraftBySupplier = Record<string, SupplyRfqDraftLine[]>;

type SupplyRfqDraftContextValue = {
  drafts: DraftBySupplier;
  setQty: (supplyAccountId: string, listingId: string, qty: number) => void;
  addOrUpdateLine: (supplyAccountId: string, line: SupplyRfqDraftLine) => void;
  removeLine: (supplyAccountId: string, listingId: string) => void;
  clearDraft: (supplyAccountId: string) => void;
  linesFor: (supplyAccountId: string) => SupplyRfqDraftLine[];
};

const SupplyRfqDraftContext = createContext<SupplyRfqDraftContextValue | null>(null);

export function SupplyRfqDraftProvider({ children }: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<DraftBySupplier>({});

  const linesFor = useCallback(
    (supplyAccountId: string) => drafts[supplyAccountId] ?? [],
    [drafts]
  );

  const addOrUpdateLine = useCallback((supplyAccountId: string, line: SupplyRfqDraftLine) => {
    setDrafts((prev) => {
      const cur = prev[supplyAccountId] ?? [];
      const idx = cur.findIndex((l) => l.listingId === line.listingId);
      let next: SupplyRfqDraftLine[];
      if (idx === -1) next = [...cur, line];
      else {
        next = [...cur];
        next[idx] = line;
      }
      return { ...prev, [supplyAccountId]: next };
    });
  }, []);

  const setQty = useCallback((supplyAccountId: string, listingId: string, qty: number) => {
    const q = Math.max(0.01, qty);
    setDrafts((prev) => {
      const cur = prev[supplyAccountId] ?? [];
      const next = cur.map((l) => (l.listingId === listingId ? { ...l, qty: q } : l));
      return { ...prev, [supplyAccountId]: next };
    });
  }, []);

  const removeLine = useCallback((supplyAccountId: string, listingId: string) => {
    setDrafts((prev) => {
      const cur = prev[supplyAccountId] ?? [];
      const next = cur.filter((l) => l.listingId !== listingId);
      const copy = { ...prev };
      if (next.length) copy[supplyAccountId] = next;
      else delete copy[supplyAccountId];
      return copy;
    });
  }, []);

  const clearDraft = useCallback((supplyAccountId: string) => {
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[supplyAccountId];
      return copy;
    });
  }, []);

  const value = useMemo(
    () => ({
      drafts,
      setQty,
      addOrUpdateLine,
      removeLine,
      clearDraft,
      linesFor,
    }),
    [drafts, setQty, addOrUpdateLine, removeLine, clearDraft, linesFor]
  );

  return <SupplyRfqDraftContext.Provider value={value}>{children}</SupplyRfqDraftContext.Provider>;
}

export function useSupplyRfqDraft() {
  const ctx = useContext(SupplyRfqDraftContext);
  if (!ctx) throw new Error('useSupplyRfqDraft must be used under SupplyRfqDraftProvider');
  return ctx;
}
