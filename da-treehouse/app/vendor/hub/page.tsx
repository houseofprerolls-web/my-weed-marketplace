import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { VendorHubClient } from "@/components/vendor/VendorHubClient";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Vendor Hub — ${SITE_NAME}`,
  description: "Apply to list your licensed cannabis business.",
};

export default async function VendorHubPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/vendor/hub");
  }

  try {
    await supabase.rpc("sync_master_profile_role");
  } catch {
    /* migration 0017 */
  }

  const [{ data: vendor }, { data: profile }] = await Promise.all([
    supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  return (
    <VendorHubClient
      initialVendor={vendor}
      profileRole={profile?.role ?? "consumer"}
      userId={user.id}
      userEmail={user.email ?? ""}
    />
  );
}
