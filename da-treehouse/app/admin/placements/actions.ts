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
  if (!user) redirect("/login?next=/admin/placements");

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

export async function upsertMarketListingAction(formData: FormData) {
  const marketId = String(formData.get("marketId") ?? "").trim();
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const slotRank = Math.min(
    9,
    Math.max(0, parseInt(String(formData.get("slotRank") ?? "0"), 10) || 0)
  );
  const isPremium = formData.get("isPremium") === "on";
  const active = formData.get("active") === "on";
  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw ? noteRaw : null;
  const listingId = String(formData.get("listingId") ?? "").trim();

  if (!marketId) throw new Error("Choose a listing region.");
  if (!vendorId) throw new Error("Choose a dispensary.");

  const supabase = await getAdminSupabase();

  if (listingId) {
    const { error } = await supabase
      .from("vendor_market_listings")
      .update({
        vendor_id: vendorId,
        slot_rank: slotRank,
        is_premium: isPremium,
        active,
        note,
      })
      .eq("id", listingId)
      .eq("market_id", marketId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("vendor_market_listings").upsert(
      {
        market_id: marketId,
        vendor_id: vendorId,
        slot_rank: slotRank,
        is_premium: isPremium,
        active,
        note,
      },
      { onConflict: "market_id,vendor_id" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/placements");
  revalidatePath("/");
  revalidatePath("/shops");
}

export async function deleteMarketListingAction(listingId: string) {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from("vendor_market_listings")
    .delete()
    .eq("id", listingId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/placements");
  revalidatePath("/");
  revalidatePath("/shops");
}

export async function reorderMarketListingsAction(
  marketId: string,
  orderedListingIds: string[]
) {
  const supabase = await getAdminSupabase();
  const { error } = await supabase.rpc("reorder_market_listings", {
    p_market_id: marketId,
    p_listing_ids: orderedListingIds,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/placements");
  revalidatePath("/");
  revalidatePath("/shops");
}

/** Toggle one flag at a time; pass only the field you want to change. */
export async function patchMarketListingAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing listing id.");

  const patch: { is_premium?: boolean; active?: boolean } = {};
  if (formData.has("isPremium")) {
    patch.is_premium = String(formData.get("isPremium")) === "true";
  }
  if (formData.has("active")) {
    patch.active = String(formData.get("active")) === "true";
  }
  if (Object.keys(patch).length === 0) {
    throw new Error("Nothing to update.");
  }

  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from("vendor_market_listings")
    .update(patch)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/placements");
  revalidatePath("/");
  revalidatePath("/shops");
}
