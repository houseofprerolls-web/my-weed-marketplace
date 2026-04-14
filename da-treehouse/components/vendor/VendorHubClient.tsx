"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { isValidVendorSlug, slugify } from "@/lib/vendor/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  license_number: string | null;
  license_status: string;
  is_live: boolean;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

function AdminVendorHubPanel({
  initialVendor,
}: {
  initialVendor: VendorRow | null;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold">Vendor Hub</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Admin / master view: manage vendors globally and preview the same tools
        consumers use.
      </p>
      <div className="flex flex-col gap-3">
        <Button variant="secondary" asChild>
          <Link href="/admin/vendors">Review vendor applications</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/admin/features">Feature flags</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin">Admin home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Public catalog</Link>
        </Button>
      </div>
      {initialVendor ? (
        <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">Your linked vendor row</p>
          <p className="mt-1 text-muted-foreground">
            <strong>{initialVendor.name}</strong> — status{" "}
            <span className="uppercase">{initialVendor.license_status}</span>
            {initialVendor.license_status === "approved" ? (
              <span className="block pt-1">
                Slug: <code className="text-xs">{initialVendor.slug}</code>
              </span>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          You don&apos;t have a personal vendor application on this account;
          use <strong>Review vendor applications</strong> to manage others.
        </p>
      )}
    </div>
  );
}

export function VendorHubClient({
  initialVendor,
  profileRole,
  userId,
  userEmail,
}: {
  initialVendor: VendorRow | null;
  profileRole: string;
  userId: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState(initialVendor?.name ?? "");
  const [slug, setSlug] = useState(initialVendor?.slug ?? "");
  const [licenseNumber, setLicenseNumber] = useState(
    initialVendor?.license_number ?? ""
  );
  const [description, setDescription] = useState(
    initialVendor?.description ?? ""
  );
  const [phone, setPhone] = useState(initialVendor?.phone ?? "");
  const [website, setWebsite] = useState(initialVendor?.website ?? "");
  const [address, setAddress] = useState(initialVendor?.address ?? "");
  const [city, setCity] = useState(initialVendor?.city ?? "");
  const [state, setState] = useState(initialVendor?.state ?? "");
  const [zip, setZip] = useState(initialVendor?.zip ?? "");

  const isApprovedVendor =
    profileRole === "vendor" &&
    initialVendor?.license_status === "approved" &&
    initialVendor != null;

  const isAdminOrMaster =
    profileRole === "admin" || isMasterAccountEmail(userEmail);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanSlug = slugify(slug || name);
    if (!isValidVendorSlug(cleanSlug)) {
      setError(
        "Use a URL slug with lowercase letters, numbers, and hyphens (e.g. my-dispensary)."
      );
      return;
    }
    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();

      if (!initialVendor) {
        const { error: insErr } = await supabase.from("vendors").insert({
          user_id: userId,
          name: name.trim(),
          slug: cleanSlug,
          license_number: licenseNumber.trim() || null,
          description: description.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
          license_status: "pending",
          is_live: false,
          verified: false,
        });
        if (insErr) throw insErr;
        setMessage("Application submitted. We’ll review your license details.");
      } else {
        const nextStatus =
          initialVendor.license_status === "rejected"
            ? "pending"
            : initialVendor.license_status;

        const { error: upErr } = await supabase
          .from("vendors")
          .update({
            name: name.trim(),
            slug: cleanSlug,
            license_number: licenseNumber.trim() || null,
            description: description.trim() || null,
            phone: phone.trim() || null,
            website: website.trim() || null,
            address: address.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            zip: zip.trim() || null,
            license_status: nextStatus,
          })
          .eq("id", initialVendor.id)
          .eq("user_id", userId);

        if (upErr) throw upErr;
        setMessage("Application updated.");
      }

      router.refresh();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (isAdminOrMaster) {
    return <AdminVendorHubPanel initialVendor={initialVendor} />;
  }

  if (isApprovedVendor) {
    const v = initialVendor!;
    const live = v.is_live === true;
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold">Vendor Hub</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Your storefront <strong>{v.name}</strong> is{" "}
          <strong className="text-foreground">approved</strong>
          {live ? (
            <>
              {" "}
              and <strong className="text-foreground">live</strong> on the
              public catalog
            </>
          ) : (
            <>
              . An admin still needs to mark your shop{" "}
              <strong className="text-foreground">live</strong> before it
              appears publicly.
            </>
          )}{" "}
          (slug: <code className="text-xs">{v.slug}</code>).
        </p>
        <p className="text-sm text-muted-foreground">
          Manage inventory, promotions, and orders from your dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="default" asChild>
            <Link href="/vendor/dashboard">Open vendor dashboard</Link>
          </Button>
          {live ? (
            <Button variant="secondary" asChild>
              <Link href={`/vendors/${v.slug}`}>Public storefront</Link>
            </Button>
          ) : null}
          <Button variant={live ? "outline" : "secondary"} asChild>
            <Link href="/">View public catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = initialVendor?.license_status;

  const showForm =
    profileRole === "consumer" &&
    (!initialVendor ||
      ["pending", "needs_review", "rejected"].includes(
        initialVendor.license_status
      ));

  if (!showForm && profileRole !== "vendor") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">
          You can&apos;t submit a vendor application with your current account
          state. Contact support if this is a mistake.
        </p>
      </div>
    );
  }

  // vendor role but not approved (edge): show read-only message
  if (profileRole === "vendor" && initialVendor && !isApprovedVendor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold">Vendor Hub</h1>
        <p className="text-sm text-muted-foreground">
          Status: <strong>{initialVendor.license_status}</strong>. If you need
          help, contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold">Vendor Hub</h1>
      <div className="mb-6 rounded-xl border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">Just shopping?</p>
        <p className="mt-1 text-muted-foreground">
          Use your ZIP on the homepage to see premium and nearby dispensaries
          in your California region, then tap a store to open its menu.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" asChild>
          <Link href="/">Browse shops by ZIP</Link>
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Apply with your licensed business details. An admin reviews every
        application before your shop can go live.
      </p>

      {status ? (
        <div className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          Current status:{" "}
          <span className="font-semibold uppercase">{status}</span>
          {status === "rejected" ? (
            <span className="block pt-1 text-muted-foreground">
              Update your details and save to resubmit for review.
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="biz-name">Business name</Label>
          <Input
            id="biz-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="biz-slug">URL slug</Label>
          <Input
            id="biz-slug"
            placeholder="my-dispensary"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() => {
              if (!slug.trim() && name.trim()) setSlug(slugify(name));
            }}
          />
          <p className="text-xs text-muted-foreground">
            Used in URLs; lowercase, hyphens only. We normalize on save.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="license">License number</Label>
          <Input
            id="license"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desc">Description</Label>
          <textarea
            id="desc"
            className="border-input bg-transparent min-h-[100px] w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Street address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-2 sm:col-span-1">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving…"
            : initialVendor
              ? "Update application"
              : "Submit application"}
        </Button>
      </form>
    </div>
  );
}
