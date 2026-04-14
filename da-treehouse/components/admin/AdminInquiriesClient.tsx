"use client";

import { useState, useTransition } from "react";
import { updateInquiryStatusAction } from "@/app/admin/inquiries/actions";
import { Button } from "@/components/ui/button";

export type InquiryStatus =
  | "new"
  | "reviewed"
  | "contacted"
  | "archived";

export type InquiryRow = {
  id: string;
  created_at: string;
  dispensary_name: string;
  license_information: string;
  phone: string;
  email: string;
  status: InquiryStatus;
  admin_notes: string | null;
};

export function AdminInquiriesClient({
  initialRows,
}: {
  initialRows: InquiryRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: InquiryStatus) {
    setErr(null);
    startTransition(async () => {
      try {
        await updateInquiryStatusAction(id, status);
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400">
        No submissions yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}
      <ul className="space-y-4">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{r.dispensary_name}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase text-neutral-300">
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-neutral-300">{r.email}</p>
            <p className="text-neutral-300">{r.phone}</p>
            <p className="mt-3 whitespace-pre-wrap text-neutral-400">
              {r.license_information}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["new", "reviewed", "contacted", "archived"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={r.status === s ? "default" : "outline"}
                    className={
                      r.status === s
                        ? "bg-[var(--brand-green)] hover:bg-[var(--brand-green-soft)]"
                        : "border-white/20 text-neutral-200 hover:bg-white/10"
                    }
                    disabled={pending}
                    onClick={() => setStatus(r.id, s)}
                  >
                    {s}
                  </Button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
