"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMasterAccountEmail } from "@/lib/auth/master";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireAdminSupabase() {
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

  return supabase;
}

export async function setFeatureFlagAction(key: string, enabled: boolean) {
  const supabase = await requireAdminSupabase();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled })
    .eq("key", key);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/features");
}

export async function setAllFeatureFlagsAction(enabled: boolean) {
  const supabase = await requireAdminSupabase();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled })
    .neq("key", "__none__");
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/features");
}
