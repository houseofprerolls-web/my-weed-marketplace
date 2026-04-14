"use client";

import { useState } from "react";
import { submitBusinessInquiryAction } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactBusinessForm() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("idle");
    setMessage("");
    try {
      const fd = new FormData(e.currentTarget);
      await submitBusinessInquiryAction(fd);
      setStatus("ok");
      setMessage("Thanks—we received your submission and will be in touch.");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {status === "ok" ? (
        <div className="rounded-lg border border-[var(--brand-green)]/30 bg-[var(--brand-green)]/5 px-3 py-2 text-sm text-neutral-800">
          {message}
        </div>
      ) : null}
      {status === "err" ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="dispensaryName">Dispensary name</Label>
        <Input
          id="dispensaryName"
          name="dispensaryName"
          required
          autoComplete="organization"
          placeholder="Your storefront name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="licenseInformation">License information</Label>
        <textarea
          id="licenseInformation"
          name="licenseInformation"
          required
          rows={4}
          className="border-input min-h-[100px] w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
          placeholder="License number, issuing agency, state, expiration if applicable…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@dispensary.com"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-hover)]"
        disabled={busy}
      >
        {busy ? "Sending…" : "Submit for review"}
      </Button>
    </form>
  );
}
