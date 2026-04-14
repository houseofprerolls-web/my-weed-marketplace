"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";
import { isValidVendorSlug, slugify } from "@/lib/vendor/slug";

async function getAdminSupabase() {
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

/**
 * Admin-only: live dispensary with no auth owner (directory listing).
 * Shoppers see it like any approved shop; only admins can create/edit core row.
 */
export async function createDirectoryVendorAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugRaw || name);
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const zip = String(formData.get("zip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

  if (!name || name.length < 2) throw new Error("Business name is required.");
  if (!isValidVendorSlug(slug)) throw new Error("Invalid URL slug.");
  if (!licenseNumber) throw new Error("License number is required.");
  if (!address) throw new Error("Street address is required.");
  if (!city || !state || !zip) throw new Error("City, state, and ZIP are required.");

  const supabase = await getAdminSupabase();

  const { data: inserted, error: insErr } = await supabase
    .from("vendors")
    .insert({
      user_id: null,
      is_directory_listing: true,
      name,
      slug,
      license_number: licenseNumber,
      license_status: "approved",
      is_live: true,
      verified: true,
      address,
      city,
      state,
      zip,
      phone: phone || null,
      logo_url: logoUrl,
      map_marker_image_url: logoUrl,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);

  const vendorId = inserted?.id;
  if (vendorId) {
    const { error: locErr } = await supabase.from("vendor_locations").insert({
      vendor_id: vendorId,
      address,
      city,
      state,
      zip,
      services: ["pickup"],
    });
    if (locErr) throw new Error(locErr.message);
  }

  revalidatePath("/admin/directory");
  revalidatePath("/");
  revalidatePath("/catalog");
}

export async function deleteDirectoryVendorAction(vendorId: string) {
  const supabase = await getAdminSupabase();
  const { data: row } = await supabase
    .from("vendors")
    .select("id, is_directory_listing")
    .eq("id", vendorId)
    .single();

  if (!row?.is_directory_listing) {
    throw new Error("Only directory listings (no owner) can be removed here.");
  }

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/directory");
  revalidatePath("/");
  revalidatePath("/catalog");
}
