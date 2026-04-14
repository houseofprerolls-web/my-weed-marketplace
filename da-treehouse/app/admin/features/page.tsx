import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminFeatureFlagsClient } from "@/components/admin/AdminFeatureFlagsClient";

export const metadata: Metadata = {
  title: "Feature flags — Admin",
};

export default async function AdminFeaturesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/features");

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

  const { data: rows, error } = await supabase
    .from("feature_flags")
    .select("key, enabled, label, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Could not load feature flags. Run migration{" "}
        <code className="rounded bg-muted px-1">0017_feature_flags_and_master_sync.sql</code>{" "}
        in Supabase SQL Editor, then refresh.
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-primary underline">
          ← Admin home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Admin home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Feature flags</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Changes apply site-wide for all visitors (including you) so you can
        preview the live experience.
      </p>
      <AdminFeatureFlagsClient initialRows={rows ?? []} />
    </div>
  );
}
