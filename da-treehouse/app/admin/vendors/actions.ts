"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";

async function getAdminSupabase() {
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

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    pErr ||
    (profile?.role !== "admin" && !isMasterAccountEmail(user.email))
  ) {
    redirect("/");
  }

  return supabase;
}

export async function approveVendorAction(vendorId: string) {
  const supabase = await getAdminSupabase();
  const { error } = await supabase.rpc("admin_approve_vendor", {
    p_vendor_id: vendorId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor/hub");
}

export async function rejectVendorAction(vendorId: string) {
  const supabase = await getAdminSupabase();
  const { error } = await supabase.rpc("admin_reject_vendor", {
    p_vendor_id: vendorId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor/hub");
}

export async function needsReviewVendorAction(vendorId: string) {
  const supabase = await getAdminSupabase();
  const { error } = await supabase.rpc("admin_vendor_needs_review", {
    p_vendor_id: vendorId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor/hub");
}
