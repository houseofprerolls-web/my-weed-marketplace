"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";

const STORAGE_KEY = "cannahub_entry_age_gate_v1";

/**
 * Full-screen age gate for anonymous visitors only.
 * Logged-in users skip (already verified at signup).
 */
export function AgeGateModal() {
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const evaluate = (hasUser: boolean) => {
      if (hasUser) {
        setBlocked(false);
        setReady(true);
        return;
      }
      try {
        if (localStorage.getItem(STORAGE_KEY) === "1") {
          setBlocked(false);
        } else {
          setBlocked(true);
        }
      } catch {
        setBlocked(true);
      }
      setReady(true);
    };

    let cancelled = false;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) evaluate(!!session?.user);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(!!session?.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !blocked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ready, blocked]);

  function confirm() {
    if (!ack) return;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setBlocked(false);
  }

  if (!ready || !blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-lg">
        <div className="mb-1 inline-flex rounded border border-border bg-muted/80 px-2 py-0.5 text-xs font-bold">
          21+
        </div>
        <h2 id="age-gate-title" className="mt-2 text-xl font-semibold">
          Age verification
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {SITE_NAME} is intended for adults <strong>21 years or older</strong>{" "}
          in jurisdictions where cannabis is legal. By continuing you confirm
          you meet this requirement and agree to follow local laws.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1"
          />
          <span>I am 21 or older and legally allowed to view this site.</span>
        </label>
        <Button
          type="button"
          className="mt-6 w-full"
          disabled={!ack}
          onClick={confirm}
        >
          Enter {SITE_NAME}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Signed-in members skip this step.
        </p>
      </div>
    </div>
  );
}
