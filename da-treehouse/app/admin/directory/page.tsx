import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { AdminDirectoryClient } from "@/components/admin/AdminDirectoryClient";
import { createServerSupabase } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Directory listings — Admin — ${SITE_NAME}`,
};

export default async function AdminDirectoryPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/directory");

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
    .from("vendors")
    .select(
      "id, name, slug, license_number, city, state, zip, is_live, license_status, is_directory_listing, user_id"
    )
    .eq("is_directory_listing", true)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-red-300">
        <p>Could not load directory vendors.</p>
        <p className="mt-2 text-neutral-400">{error.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-[var(--brand-green-soft)]">
          ← Admin
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">
        Directory (no owner)
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        These treehouses appear on the marketplace like any live shop, but they are{" "}
        <strong className="text-neutral-200">not</strong> tied to a user account.
        Licensed partners should normally apply through{" "}
        <Link href="/contact" className="text-[var(--brand-green-soft)] underline">
          Contact &amp; list your shop
        </Link>{" "}
        so they own their storefront.
      </p>
      <div className="mt-8">
        <AdminDirectoryClient initialRows={rows ?? []} />
      </div>
    </div>
  );
}
