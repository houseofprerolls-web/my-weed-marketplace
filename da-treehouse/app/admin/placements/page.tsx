import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { AdminPlacementsClient } from "@/components/admin/AdminPlacementsClient";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Regional premium slots — Admin — ${SITE_NAME}`,
};

export default async function AdminPlacementsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/placements");

  try {
    await supabase.rpc("sync_master_profile_role");
  } catch {
    /* optional */
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && !isMasterAccountEmail(user.email)) {
    redirect("/");
  }

  const [
    { data: vendors, error: vErr },
    { data: markets, error: mErr },
    { data: listings, error: lErr },
  ] = await Promise.all([
    supabase.from("vendors").select("id, name, slug").order("name"),
    supabase
      .from("listing_markets")
      .select("id, slug, name, subtitle, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("vendor_market_listings").select(
      `
          id,
          market_id,
          vendor_id,
          slot_rank,
          is_premium,
          active,
          note,
          vendors ( name, slug )
        `
    ),
  ]);

  if (mErr || lErr) {
    const err = mErr ?? lErr;
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-sm">
        <p className="text-destructive">
          Could not load regional placements. Apply migration{" "}
          <code className="rounded bg-muted px-1">
            0019_listing_markets_ca.sql
          </code>{" "}
          in Supabase, then refresh.
        </p>
        <p className="mt-2 text-muted-foreground">{err?.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-primary underline">
          ← Admin home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Admin home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">
        Regional premium slots (CA)
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Each California listing region has up to 10 premium spots. Shoppers’
        ZIP codes map to a region (generous buckets, not city-by-city). Reorder
        with ↑↓, toggle premium or active, or remove a row.
      </p>

      {vErr ? (
        <p className="mb-4 text-sm text-destructive">{vErr.message}</p>
      ) : null}

      <AdminPlacementsClient
        vendors={vendors ?? []}
        markets={(markets ?? []).map((m) => ({
          id: m.id,
          slug: m.slug,
          name: m.name,
          subtitle: m.subtitle,
        }))}
        listings={(listings ?? []).map((row) => {
          const vRaw = row.vendors as
            | { name: string; slug: string }
            | { name: string; slug: string }[]
            | null;
          const v = Array.isArray(vRaw) ? (vRaw[0] ?? null) : vRaw;
          return {
            id: row.id,
            market_id: row.market_id,
            vendor_id: row.vendor_id,
            slot_rank: row.slot_rank,
            is_premium: row.is_premium,
            active: row.active,
            note: row.note,
            vendors: v,
          };
        })}
      />
    </div>
  );
}
