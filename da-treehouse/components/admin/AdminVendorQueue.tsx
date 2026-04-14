"use client";

import { useState, useTransition } from "react";
import {
  approveVendorAction,
  needsReviewVendorAction,
  rejectVendorAction,
} from "@/app/admin/vendors/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  license_number: string | null;
  license_status: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
};

export function AdminVendorQueue({ vendors }: { vendors: VendorRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    fn: (id: string) => Promise<void>,
    id: string
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await fn(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  if (vendors.length === 0) {
    return (
      <p className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
        No applications in the queue.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {vendors.map((v) => (
        <Card key={v.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base">{v.name}</CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase">
                {v.license_status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Slug: {v.slug}</p>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {v.license_number ? (
              <p>
                <span className="font-medium text-foreground">License: </span>
                {v.license_number}
              </p>
            ) : null}
            {[v.address, v.city, v.state, v.zip].filter(Boolean).length ? (
              <p>
                {[v.address, v.city, v.state, v.zip].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {v.phone ? <p>Phone: {v.phone}</p> : null}
            {v.website ? <p>Web: {v.website}</p> : null}
            {v.description ? (
              <p className="pt-1 text-foreground">{v.description}</p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/30">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(approveVendorAction, v.id)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(needsReviewVendorAction, v.id)}
            >
              Needs review
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(rejectVendorAction, v.id)}
            >
              Reject
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
