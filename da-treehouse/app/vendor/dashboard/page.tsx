import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { VendorDashboardClient } from "@/components/vendor/dashboard/VendorDashboardClient";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Vendor dashboard — ${SITE_NAME}`,
};

export default async function VendorDashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/vendor/dashboard");
  }

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

  if (profile?.role !== "vendor") {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
        <p className="mb-4">
          The vendor dashboard is for approved vendor accounts. Your profile
          role is <strong>{profile?.role ?? "unknown"}</strong>.
        </p>
        <Link href="/vendor/hub" className="text-primary underline">
          Go to Vendor Hub
        </Link>
      </div>
    );
  }

  const { data: vendor, error: vErr } = await supabase
    .from("vendors")
    .select(
      "id, name, slug, license_status, is_live, logo_url, banner_url, map_marker_image_url"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (vErr || !vendor) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
        <p className="mb-4">No vendor record is linked to your account.</p>
        <Link href="/vendor/hub" className="text-primary underline">
          Vendor Hub
        </Link>
      </div>
    );
  }

  return (
    <VendorDashboardClient
      vendorId={vendor.id}
      vendorName={vendor.name}
      vendorSlug={vendor.slug}
      licenseStatus={vendor.license_status}
      isLive={vendor.is_live}
      logoUrl={vendor.logo_url}
      bannerUrl={vendor.banner_url}
      mapMarkerUrl={vendor.map_marker_image_url}
    />
  );
}
