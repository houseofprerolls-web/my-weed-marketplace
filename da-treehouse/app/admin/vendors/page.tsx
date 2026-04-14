import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminVendorQueue } from "@/components/admin/AdminVendorQueue";

export const metadata: Metadata = {
  title: "Review vendor applications — Admin",
};

export default async function AdminVendorsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/vendors");

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

  const { data: queue, error } = await supabase
    .from("vendors")
    .select("*")
    .in("license_status", ["pending", "needs_review", "rejected"])
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load queue: {error.message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Admin home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Vendor applications</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Approve only after license and compliance checks. Approving sets the
        owner&apos;s profile role to <strong>vendor</strong> and marks the shop
        live.
      </p>
      <AdminVendorQueue vendors={queue ?? []} />
    </div>
  );
}
